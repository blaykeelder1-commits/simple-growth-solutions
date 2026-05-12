import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { withAdmin } from "@/lib/api/with-auth";
import { apiError } from "@/lib/api/errors";
import { sendChangeRequestUpdateEmail } from "@/lib/email";
import { apiLogger } from "@/lib/logger";
import { z } from "zod";

const updateSchema = z.object({
  status: z
    .enum(["pending", "approved", "in_progress", "completed", "rejected"])
    .optional(),
  resolution: z.string().optional(),
  // Operator assignment — null clears, string sets. Used by the kanban
  // dispatch board so multiple admins can claim/hand off tickets.
  assigneeId: z.string().nullable().optional(),
});

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
      },
      include: {
        project: { select: { id: true, projectName: true, organizationId: true } },
      },
    });

    // Notify the customer only if status actually changed
    if (
      validatedData.status &&
      changeRequest.project &&
      oldChangeRequest.status !== validatedData.status
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
