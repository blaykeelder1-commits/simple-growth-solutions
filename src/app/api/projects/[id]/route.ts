import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { withAuth, withAdmin } from "@/lib/api/with-auth";
import { apiError } from "@/lib/api/errors";
import { z } from "zod";

const updateProjectSchema = z.object({
  status: z.string().optional(),
  priority: z.number().optional(),
  deployedUrl: z.string().url().optional().or(z.literal("")),
  repositoryUrl: z.string().url().optional().or(z.literal("")),
  deploymentPlatform: z.string().optional(),
  estimatedCompletion: z.string().datetime().optional(),
});

// GET /api/projects/[id] - Get single project
export const GET = withAuth(async (_req, ctx, session) => {
  try {
    const { id } = await ctx.params;

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    const project = await prisma.websiteProject.findUnique({
      where: { id },
      include: {
        changeRequests: {
          orderBy: { createdAt: "desc" },
        },
        projectNotes: {
          where: user?.role === "admin" ? {} : { isInternal: false },
          orderBy: { createdAt: "desc" },
        },
        projectFiles: true,
      },
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

    return NextResponse.json({ success: true, project });
  } catch (error) {
    return apiError(error, "Failed to fetch project");
  }
});

// PATCH /api/projects/[id] - Update project (admin only)
export const PATCH = withAdmin(async (req, ctx, session) => {
  try {
    const { id } = await ctx.params;
    const body = await req.json();
    const validatedData = updateProjectSchema.parse(body);

    // Get old values for audit log
    const oldProject = await prisma.websiteProject.findUnique({
      where: { id },
      select: { status: true, priority: true, deployedUrl: true, deploymentPlatform: true },
    });

    const project = await prisma.websiteProject.update({
      where: { id },
      data: {
        ...(validatedData.status && { status: validatedData.status }),
        ...(validatedData.priority !== undefined && { priority: validatedData.priority }),
        ...(validatedData.deployedUrl !== undefined && {
          deployedUrl: validatedData.deployedUrl || null,
        }),
        ...(validatedData.repositoryUrl !== undefined && {
          repositoryUrl: validatedData.repositoryUrl || null,
        }),
        ...(validatedData.deploymentPlatform && {
          deploymentPlatform: validatedData.deploymentPlatform,
        }),
        ...(validatedData.estimatedCompletion && {
          estimatedCompletion: new Date(validatedData.estimatedCompletion),
        }),
        ...(validatedData.status === "completed" && {
          actualCompletion: new Date(),
        }),
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        organizationId: project.organizationId,
        action: "project_updated",
        entityType: "website_project",
        entityId: id,
        oldValues: oldProject ? JSON.parse(JSON.stringify(oldProject)) : undefined,
        newValues: JSON.parse(JSON.stringify(validatedData)),
      },
    });

    return NextResponse.json({ success: true, project });
  } catch (error) {
    return apiError(error, "Failed to update project");
  }
});
