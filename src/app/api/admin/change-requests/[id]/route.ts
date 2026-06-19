import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { withAdmin } from "@/lib/api/with-auth";
import { apiError } from "@/lib/api/errors";
import { sendChangeRequestUpdateEmail } from "@/lib/email";
import { apiLogger } from "@/lib/logger";
import { z } from "zod";

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
});

// Statuses the CUSTOMER should be emailed about. Andy's internal steps
// (in_progress claim, review_ready, approved) must NOT email the customer — only
// the original submit-ack and the final outcome do. This is the anti-wildfire gate.
const CUSTOMER_NOTIFY_STATUSES = new Set(["completed", "rejected"]);

// PATCH /api/admin/change-requests/[id] - Update change request status
export const PATCH = withAdmin(async (req, ctx) => {
  try {
    const { id } = await ctx.params;
    const body = await req.json();
    const validatedData = updateSchema.parse(body);

    const oldChangeRequest = await prisma.changeRequest.findUnique({
      where: { id },
      select: { status: true },
    });

    if (!oldChangeRequest) {
      return NextResponse.json(
        { success: false, message: "Change request not found" },
        { status: 404 }
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
      const changeRequest = await prisma.changeRequest.findUnique({ where: { id } });
      return NextResponse.json({ success: true, claimed, changeRequest });
    }

    // --- Mark-seen: stamp the guard without changing status. Used when a ticket
    // is triaged to a human — it stays `pending` for Blayke but the sweep won't
    // re-flag it. Idempotent (only stamps if not already stamped).
    if (validatedData.markSeen) {
      await prisma.changeRequest.updateMany({
        where: { id, andySeenAt: null },
        data: { andySeenAt: new Date() },
      });
      const changeRequest = await prisma.changeRequest.findUnique({ where: { id } });
      return NextResponse.json({ success: true, changeRequest });
    }

    // --- Reopen: reset an orphaned in_progress ticket to a fresh pending state so
    // the intake sweep claims and processes it again. Clears the seen-guard and any
    // partial preview/note. No customer email (pending isn't a notify status).
    if (validatedData.reopen) {
      const changeRequest = await prisma.changeRequest.update({
        where: { id },
        data: {
          status: "pending",
          andySeenAt: null,
          previewUrl: null,
          agentNote: null,
        },
      });
      return NextResponse.json({ success: true, changeRequest });
    }

    const changeRequest = await prisma.changeRequest.update({
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

    // Notify the customer only on customer-visible status changes. Andy's
    // internal hand-offs (review_ready, approved) must never email the customer.
    if (
      validatedData.status &&
      changeRequest.project &&
      oldChangeRequest.status !== validatedData.status &&
      CUSTOMER_NOTIFY_STATUSES.has(validatedData.status)
    ) {
      prisma.user.findUnique({
        where: { id: changeRequest.requesterId },
        select: { email: true, name: true },
      })
        .then((requester) => {
          if (!requester) return;
          return sendChangeRequestUpdateEmail(
            requester.email,
            requester.name || requester.email,
            { title: changeRequest.title, status: changeRequest.status, resolution: changeRequest.resolution },
            { id: changeRequest.project!.id, projectName: changeRequest.project!.projectName }
          );
        })
        .catch((e) => apiLogger.warn({ err: e }, "Failed to send change request update notification"));
    }

    return NextResponse.json({ success: true, changeRequest });
  } catch (error) {
    return apiError(error, "Failed to update change request");
  }
});
