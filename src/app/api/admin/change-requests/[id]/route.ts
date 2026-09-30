import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { withAdmin } from "@/lib/api/with-auth";
import { apiError } from "@/lib/api/errors";
import { sendChangeRequestUpdateEmail } from "@/lib/email";
import { notifyCustomer } from "@/lib/email/notify";
import { orgStanding } from "@/lib/billing/standing";
import { apiLogger } from "@/lib/logger";
import { z } from "zod";
import { actorFor, recordWorkEvent } from "@/lib/work/events";
import { ApprovalError, assertReviewed, createApproval, crShipSubject, OPEN_STATUSES, supersedeCrShip } from "@/lib/approvals";

const updateSchema = z.object({
  status: z
    .enum(["pending", "review_ready", "approved", "in_progress", "completed", "rejected"])
    .optional(),
  resolution: z.string().optional(),
  // Operator assignment — null clears, string sets. Used by the kanban
  // dispatch board so multiple admins can claim/hand off tickets.
  assigneeId: z.string().nullable().optional(),
  // Set by Andy when it prepares an autonomous edit awaiting approval.
  previewUrl: z.string().url().nullable().optional(),
  agentNote: z.string().nullable().optional(),
  // Anti-retrigger primitives for Andy's intake sweep (mutually exclusive with
  // a normal status update):
  //  - claim: atomically take a still-`pending`, never-seen ticket → `in_progress`
  //    and stamp andySeenAt. Returns `claimed:false` if another run already took it.
  //  - markSeen: stamp andySeenAt WITHOUT changing status (used when a ticket is
  //    triaged to a human — it stays `pending` but is never re-flagged).
  claim: z.boolean().optional(),
  markSeen: z.boolean().optional(),
  //  - reopen: recover an ORPHANED ticket (claimed → in_progress but the sweep
  //    that claimed it died mid-run, e.g. a service restart, so it never reached
  //    review_ready). Resets it to a fresh, claimable state (status=pending,
  //    andySeenAt cleared, any half-built preview/note dropped) so the next
  //    intake sweep re-processes it from scratch.
  reopen: z.boolean().optional(),
  // The learning loop. Required when Andy closes a ticket (completed) — a ticket
  // cannot close without what was learned. `touch` = the small detail that made
  // the customer feel looked after.
  lesson: z.string().max(4000).optional(),
  touch: z.string().max(2000).optional(),
  // 3-pass review record (src/lib/review). Required from Andy for review_ready (covers
  // the preview + note) and for completed/rejected (covers the resolution the customer is emailed).
  review: z.unknown().optional(),
});

// Statuses the CUSTOMER should be emailed about. Andy's internal steps
// (in_progress claim, review_ready, approved) must NOT email the customer — only
// the original submit-ack and the final outcome do. This is the anti-wildfire gate.
const CUSTOMER_NOTIFY_STATUSES = new Set(["completed", "rejected"]);

// PATCH /api/admin/change-requests/[id] - Update change request status
export const PATCH = withAdmin(async (req, ctx, session) => {
  try {
    const { id } = await ctx.params;
    const body = await req.json();
    const validatedData = updateSchema.parse(body);
    const actor = actorFor(session);
    const isAndy = actor === "andy";

    // Andy never approves his own work: `approved` is what the ship sweep promotes
    // to production, so only Blayke (dispatch board / approval Send) may set it.
    if (isAndy && validatedData.status === "approved") {
      return NextResponse.json(
        { success: false, message: "Andy cannot set approved — queue it (review_ready) and Blayke approves" },
        { status: 403 }
      );
    }
    if (isAndy && validatedData.status === "completed" && !validatedData.lesson?.trim()) {
      return NextResponse.json(
        { success: false, message: "completing a ticket requires a lesson (what did this ticket teach us?)" },
        { status: 400 }
      );
    }
    // Rejecting a customer's request (which emails them) is Blayke's call, never Andy's.
    if (isAndy && validatedData.status === "rejected") {
      return NextResponse.json(
        { success: false, message: "Andy cannot reject a customer's request — release it to Blayke (needs you) instead" },
        { status: 403 }
      );
    }
    // review_ready must carry the preview AND the note it was reviewed with — the gate checks
    // exactly what gets stored and queued, never an older value already on the ticket.
    if (isAndy && validatedData.status === "review_ready" && (!validatedData.previewUrl || !validatedData.agentNote?.trim())) {
      return NextResponse.json(
        { success: false, message: "review_ready needs both previewUrl and agentNote (the reviewed note)" },
        { status: 400 }
      );
    }

    // The 3-pass review gate — checked BEFORE anything is saved.
    if (isAndy && (validatedData.status === "review_ready" || validatedData.status === "completed")) {
      try {
        if (validatedData.status === "review_ready") {
          assertReviewed(crShipSubject(validatedData.previewUrl, validatedData.agentNote), validatedData.review, false);
        } else {
          if (!validatedData.resolution?.trim()) {
            return NextResponse.json(
              { success: false, message: "the customer is emailed the resolution — write one (plain language) and review it" },
              { status: 400 }
            );
          }
          assertReviewed(validatedData.resolution, validatedData.review, true);
        }
      } catch (err) {
        if (err instanceof ApprovalError) {
          return NextResponse.json({ success: false, message: err.message }, { status: err.status });
        }
        throw err;
      }
    }

    const oldChangeRequest = await prisma.changeRequest.findUnique({
      where: { id },
      select: { status: true, project: { select: { organizationId: true } } },
    });

    if (!oldChangeRequest) {
      return NextResponse.json(
        { success: false, message: "Change request not found" },
        { status: 404 }
      );
    }

    // No new work for a customer who isn't paid (or in an in-date comp). Andy may still
    // finish work Blayke already approved and sent, but never start or queue more.
    // Blayke can override from the dispatch board — the approvals page carries a
    // billing to-do for every unpaid customer (ensureStandingTasks).
    if (isAndy && (validatedData.claim || validatedData.status === "in_progress" || validatedData.status === "review_ready")) {
      const { standing } = await orgStanding(oldChangeRequest.project.organizationId);
      if (standing === "unpaid") {
        return NextResponse.json(
          {
            success: false,
            code: "customer_unpaid",
            message:
              "ON HOLD: this customer has no paid plan, so no new work. Don't start it or promise it; Blayke has a billing to-do. Leave the ticket as is.",
          },
          { status: 402 }
        );
      }
    }

    // Andy closes (and so emails the customer about) only work Blayke sent: approved → completed.
    if (isAndy && validatedData.status === "completed" && oldChangeRequest.status !== "approved") {
      return NextResponse.json(
        { success: false, message: `only an approved (sent) ticket can be completed — this one is ${oldChangeRequest.status}` },
        { status: 409 }
      );
    }

    // --- Atomic claim: pending + never-seen → in_progress. The updateMany WHERE
    // is the lock: only one caller's update affects a row, so concurrent sweeps
    // can't both grab the same ticket. No customer email (in_progress isn't in
    // the notify set), so claiming is silent to the customer.
    if (validatedData.claim) {
      const result = await prisma.changeRequest.updateMany({
        where: { id, status: "pending", andySeenAt: null },
        data: { status: "in_progress", andySeenAt: new Date() },
      });
      const claimed = result.count === 1;
      if (claimed) await recordWorkEvent({ entityType: "cr", entityId: id, event: "claimed", actor });
      const changeRequest = await prisma.changeRequest.findUnique({ where: { id } });
      return NextResponse.json({ success: true, claimed, changeRequest });
    }

    // --- Mark-seen: stamp the guard without changing status. Used when a ticket
    // is triaged to a human — it stays `pending` for Blayke but the sweep won't
    // re-flag it. Idempotent (only stamps if not already stamped).
    if (validatedData.markSeen) {
      const seen = await prisma.changeRequest.updateMany({
        where: { id, andySeenAt: null },
        data: { andySeenAt: new Date() },
      });
      if (seen.count === 1) {
        await recordWorkEvent({ entityType: "cr", entityId: id, event: "triaged", actor, note: validatedData.lesson });
      }
      const changeRequest = await prisma.changeRequest.findUnique({ where: { id } });
      return NextResponse.json({ success: true, changeRequest });
    }

    // --- Reopen: reset an orphaned in_progress ticket to a fresh pending state so
    // the intake sweep claims and processes it again. Clears the seen-guard and any
    // partial preview/note. No customer email (pending isn't a notify status).
    if (validatedData.reopen) {
      // Andy reopens only a ticket parked for Blayke (pending) or orphaned mid-prep
      // (in_progress) — never one waiting on Blayke's review or already approved/closed.
      if (isAndy && !["pending", "in_progress"].includes(oldChangeRequest.status)) {
        return NextResponse.json(
          { success: false, message: `Andy can't reopen a ${oldChangeRequest.status} ticket — only Blayke can` },
          { status: 403 }
        );
      }
      // Blayke's instruction rides in the SAME write, so no sweep can claim it without the note.
      const changeRequest = await prisma.changeRequest.update({
        where: { id },
        data: {
          status: "pending",
          andySeenAt: null,
          previewUrl: null,
          agentNote: validatedData.agentNote ?? null,
        },
      });
      await supersedeCrShip(id); // any queued approval was for work that no longer exists
      await recordWorkEvent({ entityType: "cr", entityId: id, event: "reopened", actor });
      return NextResponse.json({ success: true, changeRequest });
    }

    let approvalCode: string | undefined;
    let queuedItemId: string | undefined;
    if (validatedData.status === "review_ready") {
      const cr = await prisma.changeRequest.findUnique({
        where: { id },
        select: { title: true, previewUrl: true, agentNote: true, project: { select: { projectName: true, organizationId: true } } },
      });
      try {
        const item = await createApproval(
          {
            kind: "cr_ship",
            refId: id,
            organizationId: cr?.project.organizationId ?? null,
            title: `${cr?.project.projectName ?? "Site"} — ${cr?.title ?? "change request"}`,
            previewUrl: validatedData.previewUrl ?? cr?.previewUrl ?? null,
            agentNote: validatedData.agentNote ?? cr?.agentNote ?? null,
            review: validatedData.review,
          },
          actor
        );
        approvalCode = item.code;
        queuedItemId = item.id;
      } catch (err) {
        apiLogger.error({ err, changeRequestId: id }, "Approval item creation FAILED — ticket left unchanged");
        if (err instanceof ApprovalError) {
          return NextResponse.json({ success: false, message: err.message }, { status: err.status });
        }
        throw err;
      }
    }

    let changeRequest;
    try {
      changeRequest = await prisma.changeRequest.update({
      where: { id },
      data: {
        ...(validatedData.status && { status: validatedData.status }),
        ...(validatedData.resolution && { resolution: validatedData.resolution }),
        ...(validatedData.assigneeId !== undefined && { assigneeId: validatedData.assigneeId }),
        ...(validatedData.previewUrl !== undefined && { previewUrl: validatedData.previewUrl }),
        ...(validatedData.agentNote !== undefined && { agentNote: validatedData.agentNote }),
      },
      include: {
        project: { select: { id: true, projectName: true, organizationId: true } },
      },
      });
    } catch (err) {
      // The ticket didn't move — the approval we just queued would point at nothing real.
      if (queuedItemId) {
        await prisma.approvalItem.updateMany({ where: { id: queuedItemId, status: "awaiting" }, data: { status: "superseded" } });
      }
      throw err;
    }

    // ── Timeline + approval queue ──────────────────────────────────────────
    const statusChanged = !!validatedData.status && oldChangeRequest.status !== validatedData.status;
    // Preview or note edited outside review_ready, or the ticket moved off review_ready by any
    // route other than an approval (dispatch board drag, reopen, release): the queued approval
    // no longer matches anything Blayke could sensibly approve — cancel it so it can't strand.
    if (
      (validatedData.status !== "review_ready" && (validatedData.previewUrl !== undefined || validatedData.agentNote !== undefined)) ||
      (statusChanged && oldChangeRequest.status === "review_ready" && validatedData.status !== "approved")
    ) {
      await supersedeCrShip(id);
    }
    if (validatedData.status === "review_ready") {
      await recordWorkEvent({ entityType: "cr", entityId: id, event: "preview_ready", actor, note: approvalCode });
    } else if (statusChanged && validatedData.status === "approved") {
      // Blayke approved from the dispatch board: that click is approve + Send in one.
      // (An item already approved in WhatsApp has its `approved` event; don't repeat it.)
      const open = await prisma.approvalItem.findFirst({
        where: { kind: "cr_ship", refId: id, status: { in: OPEN_STATUSES } },
        orderBy: { createdAt: "desc" },
      });
      if (open) {
        await prisma.approvalItem.update({
          where: { id: open.id },
          data: {
            status: "sent",
            ...(open.status !== "approved" && { decidedVia: "portal", decidedAt: new Date() }),
            sentAt: new Date(),
            sentBy: session.user.email || session.user.id,
          },
        });
        if (open.status !== "approved") {
          await recordWorkEvent({ entityType: "cr", entityId: id, event: "approved", actor });
        }
      }
      await recordWorkEvent({ entityType: "cr", entityId: id, event: "released", actor });
    } else if (statusChanged && validatedData.status === "completed") {
      await recordWorkEvent({
        entityType: "cr", entityId: id, event: "shipped", actor,
        note: validatedData.lesson, touch: validatedData.touch,
      });
    } else if (statusChanged && validatedData.status) {
      await recordWorkEvent({
        entityType: "cr", entityId: id, event: validatedData.status, actor,
        note: validatedData.resolution ?? validatedData.lesson,
      });
    }

    // Notify the customer only on customer-visible status changes. Andy's
    // internal hand-offs (review_ready, approved) must never email the customer.
    // Awaited and recorded, so Andy's completion receipt says whether the customer was told.
    let customerEmailed: boolean | undefined;
    if (
      validatedData.status &&
      changeRequest.project &&
      oldChangeRequest.status !== validatedData.status &&
      CUSTOMER_NOTIFY_STATUSES.has(validatedData.status)
    ) {
      const requester = await prisma.user.findUnique({
        where: { id: changeRequest.requesterId },
        select: { email: true, name: true },
      });
      if (requester) {
        customerEmailed = await notifyCustomer({ entityType: "cr", entityId: id }, `ticket ${validatedData.status} email`, () =>
          sendChangeRequestUpdateEmail(
            requester.email,
            requester.name || requester.email,
            { title: changeRequest.title, status: changeRequest.status, resolution: changeRequest.resolution },
            { id: changeRequest.project!.id, projectName: changeRequest.project!.projectName }
          )
        );
      }
    }

    return NextResponse.json({ success: true, changeRequest, approvalCode, customerEmailed });
  } catch (error) {
    return apiError(error, "Failed to update change request");
  }
});
