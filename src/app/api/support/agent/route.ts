import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { withAdmin } from "@/lib/api/with-auth";
import { apiError } from "@/lib/api/errors";
import { loadSupportContext, SUPPORT_RULEBOOK } from "@/lib/support/assistant";
import { actorFor, recordWorkEvent } from "@/lib/work/events";

// Andy-only endpoints (authenticated by the ANDY_SERVICE_TOKEN → admin). This is
// how Andy on the VPS reads support questions and customer history; his drafts are
// queued via /api/approvals. No LLM call lives in SGS.

/** Everything a customer has been told and asked for — so no reply repeats or contradicts it. */
async function threadHistory(organizationId: string, take = 20) {
  const [messages, items] = await Promise.all([
    prisma.supportMessage.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
      take,
      select: { role: true, content: true, createdAt: true },
    }),
    prisma.approvalItem.findMany({
      where: { kind: "support_reply", refId: organizationId, status: { in: ["awaiting", "approved"] } },
      select: { code: true, status: true, draft: true },
    }),
  ]);
  return {
    messages: messages.reverse().map((m) => ({ role: m.role, content: m.content, at: m.createdAt.toISOString() })),
    queuedDrafts: items,
  };
}

// GET /api/support/agent
//   (no params)        threads waiting on Andy: the customer spoke last AND nothing has
//                      handled that message yet (a draft queued/sent/rejected, or Andy
//                      parked it for Blayke) — so a thread is never re-drafted in a loop.
//   ?customers=1       every customer org (id, name, contacts) — to find who "Jorge" is.
//   ?thread=<orgId>    that customer's full conversation + queued drafts.
export const GET = withAdmin(async (req) => {
  try {
    const url = new URL(req.url);

    if (url.searchParams.get("customers")) {
      const orgs = await prisma.organization.findMany({
        orderBy: { name: "asc" },
        select: { id: true, name: true, users: { select: { name: true, email: true } } },
      });
      return NextResponse.json({ success: true, customers: orgs });
    }

    const threadOrg = url.searchParams.get("thread");
    if (threadOrg) {
      const org = await prisma.organization.findUnique({ where: { id: threadOrg }, select: { id: true, name: true } });
      if (!org) return NextResponse.json({ success: false, message: "no such organization" }, { status: 404 });
      return NextResponse.json({ success: true, organization: org, ...(await threadHistory(threadOrg, 40)) });
    }

    const orgGroups = await prisma.supportMessage.groupBy({ by: ["organizationId"], _max: { createdAt: true } });
    const threads: unknown[] = [];
    for (const g of orgGroups) {
      const last = await prisma.supportMessage.findFirst({
        where: { organizationId: g.organizationId },
        orderBy: { createdAt: "desc" },
        select: { role: true, createdAt: true },
      });
      if (!last || last.role !== "user") continue; // customer didn't speak last
      const since = last.createdAt;

      // Already handled since the customer's last message? Then it is not waiting on Andy.
      const handled = await prisma.approvalItem.findFirst({
        where: {
          kind: "support_reply",
          refId: g.organizationId,
          OR: [
            { status: { in: ["awaiting", "approved"] } },
            { status: { in: ["sent", "rejected"] }, createdAt: { gte: since } },
          ],
        },
        select: { id: true },
      });
      if (handled) continue;
      const parked = await prisma.workEvent.findFirst({
        where: { entityType: "support", entityId: g.organizationId, event: "escalated", createdAt: { gte: since } },
        select: { id: true },
      });
      if (parked) continue;

      // Blayke's edit notes apply only to a draft for THIS customer message.
      const lastDecision = await prisma.approvalItem.findFirst({
        where: { kind: "support_reply", refId: g.organizationId, status: "edits_requested", createdAt: { gte: since } },
        orderBy: { decidedAt: "desc" },
        select: { code: true, draft: true, feedback: true },
      });

      const context = await loadSupportContext(g.organizationId);
      const history = await threadHistory(g.organizationId, 20);
      threads.push({
        organizationId: g.organizationId,
        orgName: context.orgName,
        lastCustomerAt: since.toISOString(),
        context,
        editsRequested: lastDecision
          ? { code: lastDecision.code, previousDraft: lastDecision.draft, feedback: lastDecision.feedback }
          : null,
        messages: history.messages,
      });
    }

    return NextResponse.json({ rulebook: SUPPORT_RULEBOOK, pendingCount: threads.length, threads });
  } catch (error) {
    return apiError(error, "Failed to load support queue");
  }
});

const holdSchema = z.object({
  action: z.literal("hold"),
  organizationId: z.string().min(1),
  reason: z.string().trim().min(5).max(2000),
});

// POST /api/support/agent {action:"hold", organizationId, reason} — Andy parks a thread
// for Blayke (e.g. his draft failed review 3 times). It drops out of the waiting list
// until the customer writes again. Direct replies to customers are retired: those go
// through POST /api/approvals and reach the customer only on Blayke's Send.
export const POST = withAdmin(async (req, _ctx, session) => {
  try {
    const body = await req.json();
    if (body?.action !== "hold") {
      return NextResponse.json(
        { success: false, message: 'Direct replies are retired — POST /api/approvals {kind:"support_reply", refId:<organizationId>, draft}' },
        { status: 410 }
      );
    }
    const { organizationId, reason } = holdSchema.parse(body);
    await recordWorkEvent({ entityType: "support", entityId: organizationId, event: "escalated", actor: actorFor(session), note: reason });
    return NextResponse.json({ success: true, held: organizationId });
  } catch (error) {
    return apiError(error, "Failed to hold support thread");
  }
});
