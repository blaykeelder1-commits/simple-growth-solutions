import { randomInt } from "crypto";
import type { ApprovalItem } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { recordWorkEvent, type WorkActor, type WorkEntity } from "@/lib/work/events";
import { postSupportReply } from "@/lib/support/post-reply";

/**
 * The ONE queue between Andy's work and a customer.
 *
 *   Andy/route creates an item (awaiting)
 *     → Blayke decides, in WhatsApp ("approve S7K2Q" / "edit S7K2Q …" / "reject S7K2Q …")
 *       or on /admin/approvals
 *     → customer-facing kinds wait at `approved` until Blayke presses Send in the
 *       admin portal. Send is the only code path that reaches a customer.
 *
 * Every step writes a WorkEvent, and edits/rejections require a reason — that
 * reason is the lesson the loop learns from.
 */

export const APPROVAL_KINDS = ["cr_ship", "support_reply", "build_start", "rule_change"] as const;
export type ApprovalKind = (typeof APPROVAL_KINDS)[number];

/** Kinds whose effect reaches a customer — these need a portal Send after approval. */
export const CUSTOMER_FACING: ReadonlySet<string> = new Set(["cr_ship", "support_reply"]);

/** Items still in play for their ref; a new item for the same ref supersedes them. */
export const OPEN_STATUSES = ["awaiting", "approved", "edits_requested"];

export class ApprovalError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

// No 0/O/1/I — the code is read on a phone and typed back by hand.
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

async function newCode(): Promise<string> {
  for (let i = 0; i < 20; i++) {
    let code = "S";
    for (let j = 0; j < 4; j++) code += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
    if (!(await prisma.approvalItem.findUnique({ where: { code } }))) return code;
  }
  throw new ApprovalError("could not allocate an approval code", 500);
}

function entityOf(item: Pick<ApprovalItem, "kind" | "refId" | "id">): { entityType: WorkEntity; entityId: string } {
  switch (item.kind) {
    case "cr_ship":
      return { entityType: "cr", entityId: item.refId };
    case "build_start":
      return { entityType: "project", entityId: item.refId };
    case "support_reply":
      return { entityType: "support", entityId: item.refId };
    default:
      return { entityType: "rule", entityId: item.id };
  }
}

export interface CreateApprovalInput {
  kind: ApprovalKind;
  refId: string;
  organizationId?: string | null;
  title: string;
  draft?: string | null;
  previewUrl?: string | null;
  agentNote?: string | null;
}

/** Queue an item for Blayke. Any still-open item for the same kind+ref is superseded. */
export async function createApproval(input: CreateApprovalInput, actor: WorkActor): Promise<ApprovalItem> {
  if (input.kind === "support_reply" && !input.draft?.trim()) {
    throw new ApprovalError("a support_reply needs the draft text");
  }
  await prisma.approvalItem.updateMany({
    where: { kind: input.kind, refId: input.refId, status: { in: OPEN_STATUSES } },
    data: { status: "superseded" },
  });
  const item = await prisma.approvalItem.create({
    data: {
      code: await newCode(),
      kind: input.kind,
      refId: input.refId,
      organizationId: input.organizationId ?? null,
      title: input.title,
      draft: input.draft ?? null,
      previewUrl: input.previewUrl ?? null,
      agentNote: input.agentNote ?? null,
    },
  });
  await recordWorkEvent({ ...entityOf(item), event: "sent_for_approval", actor, note: item.code });
  return item;
}

export type Decision = "approve" | "edit" | "reject";

/**
 * Apply Blayke's decision. `edit` and `reject` require a reason. Approving a
 * customer-facing item does NOT reach the customer — it waits for Send.
 */
export async function decideApproval(opts: {
  code?: string;
  id?: string;
  decision: Decision;
  reason?: string | null;
  via: "whatsapp" | "portal";
  actor: WorkActor;
}): Promise<ApprovalItem> {
  const where = opts.id ? { id: opts.id } : { code: (opts.code || "").trim().toUpperCase() };
  const item = await prisma.approvalItem.findUnique({ where });
  if (!item) throw new ApprovalError(`no approval item ${opts.code ?? opts.id}`, 404);

  const reason = opts.reason?.trim() || null;
  if (opts.decision !== "approve" && !reason) {
    throw new ApprovalError(`say what to change — "${opts.decision} ${item.code} <reason>"`);
  }
  const allowedFrom = opts.decision === "reject" ? ["awaiting", "approved"] : ["awaiting"];
  if (!allowedFrom.includes(item.status)) {
    throw new ApprovalError(`${item.code} is already ${item.status}`, 409);
  }

  const status =
    opts.decision === "approve" ? "approved" : opts.decision === "edit" ? "edits_requested" : "rejected";
  // The WHERE on status is the lock: two decisions arriving together can't both apply.
  const res = await prisma.approvalItem.updateMany({
    where: { id: item.id, status: item.status },
    data: { status, decidedVia: opts.via, decidedAt: new Date(), feedback: reason },
  });
  if (res.count !== 1) throw new ApprovalError(`${item.code} changed while deciding — check it again`, 409);

  await applyDecisionEffect(item, opts.decision, reason);
  await recordWorkEvent({
    ...entityOf(item),
    event: status,
    actor: opts.actor,
    note: reason,
  });
  return (await prisma.approvalItem.findUnique({ where: { id: item.id } }))!;
}

async function applyDecisionEffect(item: ApprovalItem, decision: Decision, reason: string | null) {
  if (item.kind === "build_start" && decision === "approve") {
    // Internal gate — final on approval (nothing reaches the customer).
    await prisma.websiteProject.update({ where: { id: item.refId }, data: { buildApprovedAt: new Date() } });
    return;
  }
  if (item.kind !== "cr_ship" || decision === "approve") return;

  const cr = await prisma.changeRequest.findUnique({ where: { id: item.refId }, select: { agentNote: true } });
  if (!cr) return;
  if (decision === "edit") {
    // Back to Andy: a fresh claimable ticket carrying Blayke's exact feedback.
    await prisma.changeRequest.update({
      where: { id: item.refId },
      data: {
        status: "pending",
        andySeenAt: null,
        agentNote: `BLAYKE EDITS REQUESTED (${item.code}): ${reason}\n\n--- previous note ---\n${cr.agentNote ?? ""}`,
      },
    });
  } else {
    // Preview rejected: stays with a human. Seen-guard kept so the sweep won't re-work it.
    // `pending` is not a customer-notify status, so the customer is not emailed.
    await prisma.changeRequest.update({
      where: { id: item.refId },
      data: {
        status: "pending",
        andySeenAt: new Date(),
        agentNote: `NEEDS YOU — preview rejected (${item.code}): ${reason}\n\n--- previous note ---\n${cr.agentNote ?? ""}`,
      },
    });
  }
}

/**
 * Send an approved customer-facing item — the only path to a customer. Claims
 * the item first (approved → sent) so a double click can't send twice; if the
 * effect fails the claim is released and the error surfaces.
 */
export async function sendApproval(id: string, sentBy: string, actor: WorkActor): Promise<ApprovalItem> {
  const item = await prisma.approvalItem.findUnique({ where: { id } });
  if (!item) throw new ApprovalError("approval item not found", 404);
  if (!CUSTOMER_FACING.has(item.kind)) throw new ApprovalError(`${item.kind} has nothing to send`);
  if (item.status !== "approved") throw new ApprovalError(`${item.code} is ${item.status}, not approved`, 409);

  const claim = await prisma.approvalItem.updateMany({
    where: { id, status: "approved" },
    data: { status: "sent", sentAt: new Date(), sentBy },
  });
  if (claim.count !== 1) throw new ApprovalError(`${item.code} was already sent`, 409);

  try {
    if (item.kind === "cr_ship") {
      // `approved` is what Andy's approval sweep promotes to production. It is not a
      // customer-notify status; the customer is emailed when the sweep marks it completed.
      await prisma.changeRequest.update({ where: { id: item.refId }, data: { status: "approved" } });
    } else {
      const ok = await postSupportReply({ organizationId: item.refId, reply: item.draft! });
      if (!ok) throw new ApprovalError("no customer user found for this organization", 404);
    }
  } catch (err) {
    await prisma.approvalItem.update({ where: { id }, data: { status: "approved", sentAt: null, sentBy: null } });
    throw err;
  }

  await recordWorkEvent({ ...entityOf(item), event: item.kind === "cr_ship" ? "released" : "shipped", actor });
  return (await prisma.approvalItem.findUnique({ where: { id } }))!;
}

/** Andy wrote an approved rule into his rulebook — close it so it isn't applied twice. */
export async function markRuleApplied(id: string, actor: WorkActor): Promise<ApprovalItem> {
  const res = await prisma.approvalItem.updateMany({
    where: { id, kind: "rule_change", status: "approved" },
    data: { status: "sent", sentAt: new Date(), sentBy: actor },
  });
  if (res.count !== 1) throw new ApprovalError("only an approved rule_change can be marked applied", 409);
  const item = (await prisma.approvalItem.findUnique({ where: { id } }))!;
  await recordWorkEvent({ entityType: "rule", entityId: id, event: "shipped", actor, note: item.draft });
  return item;
}

/** Portal link for an item — what the WhatsApp confirmation points at. */
export function approvalsUrl(): string {
  const base = (process.env.NEXTAUTH_URL || "https://simple-growth-solution.com").replace(/\/$/, "");
  return `${base}/admin/approvals`;
}
