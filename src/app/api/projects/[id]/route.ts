import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { prisma } from "@/lib/db/prisma";
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
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const { id } = await params;

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

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

    // Check access: admin can see all, users can only see their org's projects
    if (user?.role !== "admin" && project.organizationId !== user?.organizationId) {
      return NextResponse.json(
        { success: false, message: "Access denied" },
        { status: 403 }
      );
    }

    return NextResponse.json({ success: true, project });
  } catch {
    return NextResponse.json(
      { success: false, message: "Failed to fetch project" },
      { status: 500 }
    );
  }
}

// PATCH /api/projects/[id] - Update project (admin only for some fields)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const { id } = await params;

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    // Only admins can update project status and deployment info
    if (user?.role !== "admin") {
      return NextResponse.json(
        { success: false, message: "Admin access required" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = updateProjectSchema.parse(body);

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

    return NextResponse.json({ success: true, project });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: "Invalid data", errors: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, message: "Failed to update project" },
      { status: 500 }
    );
  }
}
