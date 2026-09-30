import { prisma } from "@/lib/db/prisma";

/**
 * Operations metrics for /admin/reports: is the loop getting faster, is Blayke's
 * first look usually a yes, do customers actually hear from us, why do people leave,
 * and where do leads come from. Every number is computed from recorded rows
 * (WorkEvent, ApprovalItem, Subscription, Lead) — nothing is estimated — and every
 * figure carries its unit in its name.
 */

export const WINDOW_DAYS = 90;

export function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

export interface DecidedApproval {
  kind: string;
  refId: string;
  status: string; // approved | sent | edits_requested | rejected | superseded
  decidedAt: Date | null;
  createdAt: Date;
}

/**
 * First-pass rate: of the pieces of work Blayke decided on, how many were approved the
 * FIRST time he decided. A piece is one run of drafts for the same kind + target that
 * ends in approved / sent / rejected — support replies are keyed by customer, so each
 * finished reply starts a new piece. Superseded drafts were never decided and don't
 * count; edits_requested inside a piece are its edit rounds.
 */
const FINAL = new Set(["approved", "sent", "rejected"]);

export function firstPassStats(items: DecidedApproval[]): { pieces: number; firstPass: number; firstPassPct: number | null; avgEditRounds: number | null } {
  const byTarget = new Map<string, DecidedApproval[]>();
  for (const i of items) {
    const k = `${i.kind}:${i.refId}`;
    byTarget.set(k, [...(byTarget.get(k) ?? []), i]);
  }
  let pieces = 0;
  let firstPass = 0;
  let edits = 0;
  for (const run of byTarget.values()) {
    run.sort((a, b) => (a.decidedAt ?? a.createdAt).getTime() - (b.decidedAt ?? b.createdAt).getTime());
    let editsInPiece = 0;
    for (const i of run) {
      if (i.status === "edits_requested") editsInPiece++;
      if (!FINAL.has(i.status)) continue;
      pieces++;
      if (i.status !== "rejected" && editsInPiece === 0) firstPass++;
      edits += editsInPiece;
      editsInPiece = 0;
    }
  }
  return {
    pieces,
    firstPass,
    firstPassPct: pieces ? Math.round((firstPass / pieces) * 100) : null,
    avgEditRounds: pieces ? Math.round((edits / pieces) * 10) / 10 : null,
  };
}

function countBy<T>(rows: T[], key: (r: T) => string): { key: string; count: number }[] {
  const m = new Map<string, number>();
  for (const r of rows) m.set(key(r), (m.get(key(r)) ?? 0) + 1);
  return [...m.entries()].map(([k, count]) => ({ key: k, count })).sort((a, b) => b.count - a.count);
}

export async function loadOperations(now = new Date()) {
  const since = new Date(now.getTime() - WINDOW_DAYS * 24 * 60 * 60 * 1000);

  const [completedEvents, approvals, emailEvents, blaykeMinutes, cancelled, savedEvents, leads] = await Promise.all([
    prisma.workEvent.findMany({
      // A finished ticket is recorded as "shipped" (status → completed, see the CR route).
      where: { entityType: "cr", event: { in: ["shipped", "completed"] }, createdAt: { gte: since } },
      select: { entityId: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.approvalItem.findMany({
      where: { kind: { in: ["cr_ship", "support_reply"] }, createdAt: { gte: since } },
      select: { kind: true, refId: true, status: true, decidedAt: true, createdAt: true },
    }),
    prisma.workEvent.groupBy({
      by: ["event"],
      where: { event: { in: ["customer_emailed", "customer_email_failed"] }, createdAt: { gte: since } },
      _count: { _all: true },
    }),
    prisma.workEvent.aggregate({
      where: { actor: "blayke", minutes: { not: null }, createdAt: { gte: since } },
      _sum: { minutes: true },
      _count: { _all: true },
    }),
    prisma.subscription.findMany({
      where: { cancelRequestedAt: { gte: since } },
      select: { cancelReason: true },
    }),
    prisma.workEvent.count({ where: { event: "saved", createdAt: { gte: since } } }),
    prisma.lead.findMany({
      where: { createdAt: { gte: since } },
      select: { source: true, utmSource: true, fitStatus: true },
    }),
  ]);

  // Turnaround: ticket opened → first time it was finished. One completion per ticket (a reopen
  // that completes again would otherwise count the same ticket twice).
  const firstCompletion = new Map<string, Date>();
  for (const e of completedEvents) if (!firstCompletion.has(e.entityId)) firstCompletion.set(e.entityId, e.createdAt);
  const crs = firstCompletion.size
    ? await prisma.changeRequest.findMany({
        where: { id: { in: [...firstCompletion.keys()] } },
        select: { id: true, createdAt: true },
      })
    : [];
  const turnaroundHours = crs.map((c) => (firstCompletion.get(c.id)!.getTime() - c.createdAt.getTime()) / 3_600_000);
  const med = median(turnaroundHours);

  const emailed = emailEvents.find((e) => e.event === "customer_emailed")?._count._all ?? 0;
  const emailFailed = emailEvents.find((e) => e.event === "customer_email_failed")?._count._all ?? 0;

  return {
    windowDays: WINDOW_DAYS,
    tickets: {
      completed: firstCompletion.size,
      medianTurnaroundHours: med === null ? null : Math.round(med * 10) / 10,
    },
    approvals: firstPassStats(approvals),
    customerEmails: { sent: emailed, failed: emailFailed },
    blayke: {
      minutesLogged: blaykeMinutes._sum.minutes ?? 0,
      entriesWithMinutes: blaykeMinutes._count._all,
    },
    cancellations: {
      requested: cancelled.length,
      saved: savedEvents,
      byReason: countBy(cancelled, (c) => c.cancelReason ?? "not given"),
    },
    leads: {
      total: leads.length,
      bySource: countBy(leads, (l) => [l.source ?? "unknown", l.utmSource].filter(Boolean).join(" / ")),
      byFit: countBy(leads, (l) => l.fitStatus ?? "not answered"),
    },
  };
}

export type Operations = Awaited<ReturnType<typeof loadOperations>>;
