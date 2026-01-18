import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";

const createChangeRequestSchema = z.object({
  title: z.string().min(5),
  description: z.string().min(20),
  type: z.enum(["feature", "bug", "content", "design"]),
  priority: z.enum(["low", "normal", "high", "urgent"]),
});

// POST /api/projects/[id]/change-requests - Create a change request
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const { id: projectId } = await params;

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

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

    // Check access
    if (user?.role !== "admin" && project.organizationId !== user?.organizationId) {
      return NextResponse.json(
        { success: false, message: "Access denied" },
        { status: 403 }
      );
    }

    const body = await request.json();
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

    return NextResponse.json(
      { success: true, changeRequest },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: "Invalid data", errors: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, message: "Failed to create change request" },
      { status: 500 }
    );
  }
}
