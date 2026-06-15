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
});

// Statuses the CUSTOMER should be emailed about. review_ready/approved are
// internal hand-offs between Andy and Blayke — the customer never sees them.
const CUSTOMER_NOTIFY_STATUSES = new Set(["in_progress", "completed", "rejected"]);

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
