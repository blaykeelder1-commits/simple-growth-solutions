import { randomInt } from "crypto";
import type { ApprovalItem, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { recordWorkEvent, type WorkActor, type WorkEntity } from "@/lib/work/events";
import { postSupportReply } from "@/lib/support/post-reply";
import { apiLogger } from "@/lib/logger";
import { getAdminEmails, sendSupportEscalationEmail } from "@/lib/email";
import { customerLanguageIssues, outOfPlanPromises, validateReview } from "@/lib/review";

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

export const APPROVAL_KINDS = ["cr_ship", "support_reply", "build_start", "rule_change", "billing_task"] as const;

/**
 * A billing_task is a to-do for Blayke that SGS can't safely do by API (Square's beta
 * plan swap, comped plans, pausing a customer's site). He does it, then approves the code.
 * agentNote holds the JSON the approve effect needs.
 */
export type BillingTask =
  | { action: "downgrade"; subscriptionId: string; toPlan: string }
  | { action: "cancel_manual"; subscriptionId: string }
  | { action: "cancel_fallback"; subscriptionId: string }
  | { action: "undo_cancel_fallback"; subscriptionId: string }
  | { action: "pause_site"; subscriptionId: string }
  | { action: "notice"; subscriptionId: string };
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

function entityOf(item: Pick<ApprovalItem, "kind" | "refId" | "id" | "organizationId">): { entityType: WorkEntity; entityId: string } {
  switch (item.kind) {
    case "cr_ship":
      return { entityType: "cr", entityId: item.refId };
    case "build_start":
      return { entityType: "project", entityId: item.refId };
    case "support_reply":
      return { entityType: "support", entityId: item.refId };
    case "billing_task":
      return { entityType: "support", entityId: item.organizationId ?? item.refId };
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
  /** 3-pass review record — required when Andy submits a customer-facing item. */
  review?: unknown;
}

/** The exact text a cr_ship review covers: the preview + Andy's account of the change. */
export function crShipSubject(previewUrl: string | null | undefined, agentNote: string | null | undefined): string {
  return `${previewUrl ?? ""}
${agentNote ?? ""}`;
}

/**
 * Gate for Andy's customer-facing work: three passing reviews of the exact subject,
 * and (for text the customer reads) no internal jargon. Throws ApprovalError(400).
 */
export function assertReviewed(subject: string, review: unknown, customerReads: boolean): void {
  const problem = validateReview(review, subject);
  if (problem) throw new ApprovalError(`3-pass review required: ${problem}`);
  if (customerReads) {
    const issues = customerLanguageIssues(subject);
    if (issues.length) throw new ApprovalError(`the customer would read internal language: ${issues.join(", ")} — rewrite it plainly`);
    const promises = outOfPlanPromises(subject);
    if (promises.length) {
      throw new ApprovalError(
        `${promises.join("; ")} — don't promise it: say it isn't part of their plan and offer the upgrade or an add-on quote`
      );
    }
  }
}

/** Queue an item for Blayke. Any still-open item for the same kind+ref is superseded. */
export async function createApproval(input: CreateApprovalInput, actor: WorkActor): Promise<ApprovalItem> {
  if (input.kind === "support_reply" && !input.draft?.trim()) {
    throw new ApprovalError("a support_reply needs the draft text");
  }
  if (actor === "andy" && input.kind === "support_reply") assertReviewed(input.draft!, input.review, true);
  if (actor === "andy" && input.kind === "cr_ship") {
    assertReviewed(crShipSubject(input.previewUrl, input.agentNote), input.review, false);
  }
  // Something Blayke already approved is waiting for his Send — never replace it silently.
  // Exception: the customer wrote again after that reply was drafted, so it no longer
  // answers them; the new draft replaces it (Blayke re-approves the up-to-date one).
  const waitingSend = await prisma.approvalItem.findFirst({
    where: { kind: input.kind, refId: input.refId, status: "approved" },
    select: { id: true, code: true, createdAt: true },
  });
  if (waitingSend) {
    const newerCustomerMessage =
      input.kind === "support_reply"
        ? await prisma.supportMessage.findFirst({
            where: { organizationId: input.refId, role: "user", createdAt: { gt: waitingSend.createdAt } },
            select: { id: true },
          })
        : null;
    if (!newerCustomerMessage) {
      throw new ApprovalError(`${waitingSend.code} is already approved and waiting for Send — send or reject it first`, 409);
    }
    await prisma.approvalItem.updateMany({ where: { id: waitingSend.id, status: "approved" }, data: { status: "superseded" } });
  }
  let title = input.title;
  let organizationId = input.organizationId ?? null;
  if (input.kind === "support_reply") {
    // The reply goes to refId's organization — it must be real, and its name must be on the
    // card so Blayke can see who receives it (never trust a title to say so).
    const org = await prisma.organization.findUnique({ where: { id: input.refId }, select: { id: true, name: true } });
    if (!org) throw new ApprovalError(`no customer organization ${input.refId}`, 404);
    organizationId = org.id;
    if (!title.toLowerCase().startsWith(org.name.toLowerCase())) title = `${org.name} — ${title}`;
  }
  await prisma.approvalItem.updateMany({
    where: { kind: input.kind, refId: input.refId, status: { in: ["awaiting", "edits_requested"] } },
    data: { status: "superseded" },
  });
  const item = await prisma.approvalItem.create({
    data: {
      code: await newCode(),
      kind: input.kind,
      refId: input.refId,
      organizationId,
      title,
      draft: input.draft ?? null,
      previewUrl: input.previewUrl ?? null,
      agentNote: input.agentNote ?? null,
      reviewRecord: input.review ? JSON.stringify(input.review) : null,
    },
  });
  await recordWorkEvent({ ...entityOf(item), event: "sent_for_approval", actor, note: item.code });
  if (item.kind === "support_reply" && item.title.includes("⚠️")) {
    await alertUrgentSupport(item).catch((err) =>
      apiLogger.error({ err, code: item.code }, "Urgent support email to Blayke FAILED")
    );
  }
  return item;
}

/** Email the admins right away about an urgent support draft (on top of WhatsApp). */
async function alertUrgentSupport(item: ApprovalItem): Promise<void> {
  const [emails, lastUserMsg, org] = await Promise.all([
    getAdminEmails(),
    prisma.supportMessage.findFirst({
      where: { organizationId: item.refId, role: "user" },
      orderBy: { createdAt: "desc" },
      select: { content: true, userId: true },
    }),
    prisma.organization.findUnique({ where: { id: item.refId }, select: { name: true } }),
  ]);
  const customer = lastUserMsg?.userId
    ? await prisma.user.findUnique({ where: { id: lastUserMsg.userId }, select: { name: true, email: true } })
    : null;
  await sendSupportEscalationEmail(emails, {
    orgName: org?.name ?? "A customer",
    customerName: customer?.name || customer?.email || "A customer",
    reason: `${item.title} — approve ${item.code} in WhatsApp or the admin portal, then Send.`,
    lastMessage: lastUserMsg?.content || "(see portal thread)",
  });
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
  if (item.kind === "billing_task" && opts.decision === "edit") {
    throw new ApprovalError(`${item.code} is a to-do — approve it when done, or reject it with your reason`);
  }
  if (item.kind === "build_start" && opts.decision === "edit") {
    throw new ApprovalError(`a build is approve or reject — reject ${item.code} with your reason instead`);
  }
  const allowedFrom = opts.decision === "reject" ? ["awaiting", "approved"] : ["awaiting"];
  if (!allowedFrom.includes(item.status)) {
    throw new ApprovalError(`${item.code} is already ${item.status}`, 409);
  }

  const status =
    opts.decision === "approve" ? "approved" : opts.decision === "edit" ? "edits_requested" : "rejected";
  // One transaction: the decision and its effect land together or not at all, so a failed
  // effect can never leave an item "approved" with nothing behind it. The WHERE on status
  // is the lock: two decisions arriving together can't both apply.
  await prisma.$transaction(async (tx) => {
    const res = await tx.approvalItem.updateMany({
      where: { id: item.id, status: item.status },
      data: { status, decidedVia: opts.via, decidedAt: new Date(), feedback: reason },
    });
    if (res.count !== 1) throw new ApprovalError(`${item.code} changed while deciding — check it again`, 409);
    await applyDecisionEffect(tx, item, opts.decision, reason);
  });
  await recordWorkEvent({
    ...entityOf(item),
    event: status,
    actor: opts.actor,
    note: reason,
  });
  return (await prisma.approvalItem.findUnique({ where: { id: item.id } }))!;
}

async function applyDecisionEffect(
  tx: Prisma.TransactionClient,
  item: ApprovalItem,
  decision: Decision,
  reason: string | null
) {
  if (item.kind === "billing_task" && decision === "approve") {
    // Blayke did the task (in Square / Cloudflare) — record what changed.
    const task = JSON.parse(item.agentNote || "{}") as BillingTask;
    if (task.action === "downgrade") {
      await tx.subscription.update({ where: { id: task.subscriptionId }, data: { plan: task.toPlan, pendingPlan: null } });
    } else if (task.action === "cancel_manual") {
      await tx.subscription.update({ where: { id: task.subscriptionId }, data: { status: "canceled", canceledAt: new Date() } });
    }
    return;
  }
  if (item.kind === "build_start" && decision === "approve") {
    // Internal gate — final on approval (nothing reaches the customer).
    await tx.websiteProject.update({ where: { id: item.refId }, data: { buildApprovedAt: new Date() } });
    return;
  }
  if (item.kind !== "cr_ship" || decision === "approve") return;

  const cr = await tx.changeRequest.findUnique({ where: { id: item.refId }, select: { agentNote: true, status: true } });
  if (!cr || cr.status !== "review_ready") {
    throw new ApprovalError(
      `the ticket behind ${item.code} is no longer waiting for review (${cr?.status ?? "missing"}) — nothing changed`,
      409
    );
  }
  if (decision === "edit") {
    // Back to Andy: a fresh claimable ticket carrying Blayke's exact feedback. The old
    // preview is dropped so it can't be shipped by mistake.
    await tx.changeRequest.update({
      where: { id: item.refId },
      data: {
        previewUrl: null,
        status: "pending",
        andySeenAt: null,
        agentNote: `BLAYKE EDITS REQUESTED (${item.code}): ${reason}\n\n--- previous note ---\n${cr.agentNote ?? ""}`,
      },
    });
  } else {
    // Preview rejected: stays with a human. Seen-guard kept so the sweep won't re-work it.
    // `pending` is not a customer-notify status, so the customer is not emailed.
    await tx.changeRequest.update({
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
/** customerEmailed: for a support reply, whether the customer's email actually went out. */
export async function sendApproval(
  id: string,
  sentBy: string,
  actor: WorkActor
): Promise<ApprovalItem & { customerEmailed?: boolean }> {
  const item = await prisma.approvalItem.findUnique({ where: { id } });
  if (!item) throw new ApprovalError("approval item not found", 404);
  if (!CUSTOMER_FACING.has(item.kind)) throw new ApprovalError(`${item.kind} has nothing to send`);
  if (item.status !== "approved") throw new ApprovalError(`${item.code} is ${item.status}, not approved`, 409);

  if (item.kind === "cr_ship") {
    // Both writes in ONE transaction: the item is "sent" exactly when the ticket is
    // "approved" (what Andy's sweep promotes). A crash can't leave one without the other.
    // Not a customer-notify status; the customer is emailed when the sweep completes it.
    await prisma.$transaction(async (tx) => {
      const claim = await tx.approvalItem.updateMany({
        where: { id, status: "approved" },
        data: { status: "sent", sentAt: new Date(), sentBy },
      });
      if (claim.count !== 1) throw new ApprovalError(`${item.code} was already sent`, 409);
      const moved = await tx.changeRequest.updateMany({
        where: { id: item.refId, status: "review_ready" },
        data: { status: "approved" },
      });
      if (moved.count !== 1) {
        throw new ApprovalError(`the ticket behind ${item.code} is no longer waiting for review — nothing was shipped`, 409);
      }
    });
    await recordWorkEvent({ ...entityOf(item), event: "released", actor });
    return (await prisma.approvalItem.findUnique({ where: { id } }))!;
  }

  // Support reply: claim first so a double press can't post twice. (Posting then claiming
  // would risk a DUPLICATE message to the customer on a crash — a lost send is recoverable,
  // a duplicate isn't.)
  const claim = await prisma.approvalItem.updateMany({
    where: { id, status: "approved" },
    data: { status: "sent", sentAt: new Date(), sentBy },
  });
  if (claim.count !== 1) throw new ApprovalError(`${item.code} was already sent`, 409);

  let posted: { emailed: boolean } | null;
  try {
    posted = await postSupportReply({ organizationId: item.refId, reply: item.draft! });
    if (!posted) throw new ApprovalError("no customer user found for this organization", 404);
  } catch (err) {
    // Release only our own claim (never revive an item that was superseded meanwhile).
    await prisma.approvalItem.updateMany({
      where: { id, status: "sent" },
      data: { status: "approved", sentAt: null, sentBy: null },
    });
    throw err;
  }

  await recordWorkEvent({ ...entityOf(item), event: "shipped", actor });
  return { ...(await prisma.approvalItem.findUnique({ where: { id } }))!, customerEmailed: posted.emailed };
}

/** The ticket's preview or note changed (or it was reopened): any queued approval is stale. */
export async function supersedeCrShip(changeRequestId: string): Promise<number> {
  const res = await prisma.approvalItem.updateMany({
    where: { kind: "cr_ship", refId: changeRequestId, status: { in: OPEN_STATUSES } },
    data: { status: "superseded" },
  });
  return res.count;
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
