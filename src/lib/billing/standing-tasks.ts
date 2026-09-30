import { prisma } from "@/lib/db/prisma";
import { createApproval } from "@/lib/approvals";
import { bestStanding, STANDING_SELECT } from "@/lib/billing/standing";

/**
 * Billing to-dos that make unpaid work impossible to miss. Each lands once in the
 * approvals queue (and so once in WhatsApp via the watcher) — deduped by refId:
 *
 *  - `<orgId>:unpaid:<yyyy-mm>`  a customer with a live website or a website plan has
 *    no paid plan (or their comp ended) → new work is paused. Re-raised at most monthly.
 *  - `<subId>:comp_ends:<date>`  a comp ends within 7 days → decide: charge, extend, stop.
 *  - `<subId>:renewal_missing:<date>`  a Square plan's period ended 3+ days ago and no
 *    renewal came through → check Square before doing more work.
 *
 * Runs from GET /api/approvals (polled every minute by the WhatsApp watcher), throttled.
 */
const THROTTLE_MS = 10 * 60 * 1000;
let lastRun = 0;

const day = (d: Date) => d.toISOString().slice(0, 10);

async function raise(refId: string, organizationId: string, subscriptionId: string, title: string, draft: string) {
  const exists = await prisma.approvalItem.findFirst({ where: { kind: "billing_task", refId }, select: { id: true } });
  if (exists) return;
  await createApproval(
    {
      kind: "billing_task",
      refId,
      organizationId,
      title,
      draft,
      agentNote: JSON.stringify({ action: "notice", subscriptionId }),
    },
    "system"
  );
}

export async function ensureStandingTasks(now: Date = new Date()): Promise<void> {
  if (now.getTime() - lastRun < THROTTLE_MS) return;
  lastRun = now.getTime();

  // Customers we serve: a live website, or any website plan on record.
  const [liveProjects, websiteSubs] = await Promise.all([
    prisma.websiteProject.findMany({
      where: { status: { in: ["deployed", "completed"] } },
      select: { organizationId: true },
    }),
    prisma.subscription.findMany({
      where: { plan: { startsWith: "website_" } },
      select: { organizationId: true, ...STANDING_SELECT },
      orderBy: { createdAt: "desc" },
    }),
  ]);
  const orgIds = new Set([...liveProjects.map((p) => p.organizationId), ...websiteSubs.map((s) => s.organizationId)]);
  if (orgIds.size === 0) return;
  const names = new Map(
    (await prisma.organization.findMany({ where: { id: { in: [...orgIds] } }, select: { id: true, name: true } })).map(
      (o) => [o.id, o.name]
    )
  );
  const month = now.toISOString().slice(0, 7);
  const soon = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const overdue = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

  for (const orgId of orgIds) {
    const subs = websiteSubs.filter((s) => s.organizationId === orgId);
    const { standing, sub, compUntil } = bestStanding(subs, now);
    const name = names.get(orgId) ?? "A customer";

    if (standing === "unpaid") {
      await raise(
        `${orgId}:unpaid:${month}`,
        orgId,
        sub?.id ?? "",
        `${name} — no paid plan: new work is paused`,
        `${name} isn't paying for a plan (no active Square subscription${sub?.processor === "manual" ? "; their free/comp period has ended" : ""}). ` +
          `Andy won't start or queue their work and they can't submit new edit requests; their portal asks them to start their plan. ` +
          `Their website stays up. Decide: ask them to start their plan (Andy drafts it for your approval), give a comp with an end date, or stop service.`
      );
    } else if (standing === "comp" && compUntil && compUntil <= soon && sub) {
      await raise(
        `${sub.id}:comp_ends:${day(compUntil)}`,
        orgId,
        sub.id,
        `${name} — free period ends ${day(compUntil)}`,
        `${name} is on a comp (free) plan that ends ${day(compUntil)}. After that, new work pauses automatically. ` +
          `Decide: have them start their plan, extend the comp with a new end date, or let it lapse.`
      );
    }

    for (const s of subs) {
      if (s.processor === "square" && s.status === "active" && s.currentPeriodEnd && s.currentPeriodEnd < overdue) {
        await raise(
          `${s.id}:renewal_missing:${day(s.currentPeriodEnd)}`,
          orgId,
          s.id,
          `${name} — Square renewal not seen since ${day(s.currentPeriodEnd)}`,
          `Their paid period ended ${day(s.currentPeriodEnd)} and no renewal payment has come through. Check the subscription in Square (card declined? cancelled there?) before doing more work.`
        );
      }
    }
  }
}
