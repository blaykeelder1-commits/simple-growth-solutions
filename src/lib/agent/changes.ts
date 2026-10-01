import { prisma } from "@/lib/db/prisma";

// What happened on SGS since a moment in time — the "levers" Andy's observer pulls
// (Tree of Scope C1/C2, 2026-10-01). Read-only, built from tables that already record
// every signal (SupportMessage, Lead, ChangeRequest, ApprovalItem, WorkEvent, AuditLog),
// so there is no new table and nothing on the customer path can fail because of it.
// Ids and event types only — never message text; Andy fetches details through the
// existing endpoints when a lever actually needs work.

export interface AgentChange {
  /** Stable id for dedup on Andy's side: "<source>:<row id>[:<variant>]". */
  key: string;
  type: string;
  entityType: string;
  entityId: string;
  organizationId: string | null;
  at: string;
}

export const MAX_CHANGES = 500;

/** Sort oldest-first, keep `limit`, and give the cursor to resume from. Pure. */
export function mergeChanges(
  rows: AgentChange[],
  since: Date,
  now: Date,
  limit = MAX_CHANGES,
): { changes: AgentChange[]; next: string; truncated: boolean } {
  const sorted = rows
    .filter((r) => new Date(r.at) > since)
    .sort((a, b) => (a.at === b.at ? a.key.localeCompare(b.key) : a.at < b.at ? -1 : 1));
  const truncated = sorted.length > limit;
  const changes = sorted.slice(0, limit);
  // Truncated → resume from the last row returned (Andy dedups by key, so a shared
  // timestamp is re-read, never skipped). Otherwise everything up to `now` is covered.
  const next = truncated ? changes[changes.length - 1].at : now.toISOString();
  return { changes, next, truncated };
}

export async function loadChanges(since: Date, now = new Date()) {
  const gt = { gt: since, lte: now };
  const take = MAX_CHANGES + 1;
  const [messages, leads, crs, created, decided, work, audits] = await Promise.all([
    prisma.supportMessage.findMany({
      where: { createdAt: gt, role: "user" },
      select: { id: true, organizationId: true, escalated: true, createdAt: true },
      take,
    }),
    prisma.lead.findMany({ where: { createdAt: gt }, select: { id: true, createdAt: true }, take }),
    prisma.changeRequest.findMany({
      where: { createdAt: gt },
      select: { id: true, project: { select: { organizationId: true } }, createdAt: true },
      take,
    }),
    prisma.approvalItem.findMany({
      where: { createdAt: gt },
      select: { id: true, kind: true, organizationId: true, createdAt: true },
      take,
    }),
    prisma.approvalItem.findMany({
      where: { decidedAt: gt },
      select: { id: true, kind: true, status: true, organizationId: true, decidedAt: true },
      take,
    }),
    prisma.workEvent.findMany({
      where: { createdAt: gt, actor: { not: "andy" } }, // Andy's own actions are not levers
      select: { id: true, entityType: true, entityId: true, event: true, createdAt: true },
      take,
    }),
    prisma.auditLog.findMany({
      where: { createdAt: gt },
      select: { id: true, action: true, entityType: true, entityId: true, organizationId: true, createdAt: true },
      take,
    }),
  ]);

  const rows: AgentChange[] = [
    ...messages.map((m) => ({
      key: `support_message:${m.id}`,
      type: m.escalated ? "support.customer_message.escalated" : "support.customer_message",
      entityType: "organization",
      entityId: m.organizationId,
      organizationId: m.organizationId,
      at: m.createdAt.toISOString(),
    })),
    ...leads.map((l) => ({
      key: `lead:${l.id}`,
      type: "lead.created",
      entityType: "lead",
      entityId: l.id,
      organizationId: null,
      at: l.createdAt.toISOString(),
    })),
    ...crs.map((c) => ({
      key: `change_request:${c.id}`,
      type: "change_request.created",
      entityType: "change_request",
      entityId: c.id,
      organizationId: c.project?.organizationId ?? null,
      at: c.createdAt.toISOString(),
    })),
    ...created.map((a) => ({
      key: `approval:${a.id}:created`,
      type: `approval.created.${a.kind}`,
      entityType: "approval",
      entityId: a.id,
      organizationId: a.organizationId,
      at: a.createdAt.toISOString(),
    })),
    ...decided
      .filter((a) => a.decidedAt)
      .map((a) => ({
        key: `approval:${a.id}:decided:${a.status}`,
        type: `approval.${a.status}.${a.kind}`,
        entityType: "approval",
        entityId: a.id,
        organizationId: a.organizationId,
        at: a.decidedAt!.toISOString(),
      })),
    ...work.map((w) => ({
      key: `work_event:${w.id}`,
      type: `work.${w.entityType}.${w.event}`,
      entityType: w.entityType,
      entityId: w.entityId,
      organizationId: null,
      at: w.createdAt.toISOString(),
    })),
    ...audits.map((a) => ({
      key: `audit:${a.id}`,
      type: `audit.${a.action}`,
      entityType: a.entityType ?? "audit",
      entityId: a.entityId ?? a.id,
      organizationId: a.organizationId,
      at: a.createdAt.toISOString(),
    })),
  ];
  return mergeChanges(rows, since, now);
}
