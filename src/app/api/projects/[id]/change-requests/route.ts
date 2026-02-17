import { prisma } from "@/lib/db/prisma";
import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api/with-auth";
import { apiError } from "@/lib/api/errors";
import { getAdminEmails, sendNewChangeRequestNotification } from "@/lib/email";
import { apiLogger } from "@/lib/logger";
import { z } from "zod";

const createChangeRequestSchema = z.object({
  title: z.string().min(5),
  description: z.string().min(20),
  type: z.enum(["feature", "bug", "content", "design"]),
  priority: z.enum(["low", "normal", "high", "urgent"]),
});

// POST /api/projects/[id]/change-requests - Create a change request
export const POST = withAuth(async (req, ctx, session) => {
  try {
    const { id: projectId } = await ctx.params;

    // Verify project exists and user has access
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    const project = await prisma.websiteProject.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      return NextResponse.json(
        { success: false, message: "Project not found" },
        { status: 404 }
      );
    }

    if (user?.role !== "admin" && project.organizationId !== user?.organizationId) {
      return NextResponse.json(
        { success: false, message: "Access denied" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const validatedData = createChangeRequestSchema.parse(body);

    const changeRequest = await prisma.changeRequest.create({
      data: {
        projectId,
        requesterId: session.user.id,
        title: validatedData.title,
        description: validatedData.description,
        type: validatedData.type,
        priority: validatedData.priority,
        status: "pending",
      },
    });

    // Notify admins of new change request
    getAdminEmails()
      .then((emails) =>
        sendNewChangeRequestNotification(
          emails,
          { title: validatedData.title, type: validatedData.type, priority: validatedData.priority, description: validatedData.description },
          { id: project.id, projectName: project.projectName },
          session.user.name || session.user.email || "A customer"
        )
      )
      .catch((e) => apiLogger.warn({ err: e }, "Failed to send change request notification"));

    return NextResponse.json(
      { success: true, changeRequest },
      { status: 201 }
    );
  } catch (error) {
    return apiError(error, "Failed to create change request");
  }
});
