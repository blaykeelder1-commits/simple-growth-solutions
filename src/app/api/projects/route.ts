import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";

const createProjectSchema = z.object({
  projectName: z.string().min(2),
  projectType: z.enum(["new_build", "redesign", "migration"]),
  existingUrl: z.string().url().optional().or(z.literal("")),
  targetAudience: z.string().optional(),
  desiredFeatures: z.array(z.string()).optional(),
  designPreferences: z.object({
    style: z.string().optional(),
    colors: z.string().optional(),
    references: z.string().optional(),
  }).optional(),
  additionalNotes: z.string().optional(),
});

// GET /api/projects - List projects for current user's organization
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get the user with organization
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { organization: true },
    });

    if (!user?.organizationId) {
      // User has no organization - return empty projects
      return NextResponse.json({ success: true, projects: [] });
    }

    const projects = await prisma.websiteProject.findMany({
      where: { organizationId: user.organizationId },
      include: {
        changeRequests: {
          select: { id: true, status: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, projects });
  } catch {
    return NextResponse.json(
      { success: false, message: "Failed to fetch projects" },
      { status: 500 }
    );
  }
}

// POST /api/projects - Create a new project
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validatedData = createProjectSchema.parse(body);

    // Get or create organization for user
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { organization: true },
    });

    let organizationId = user?.organizationId;

    // If user doesn't have an organization, create one
    if (!organizationId) {
      const organization = await prisma.organization.create({
        data: {
          name: validatedData.projectName + " Organization",
          users: {
            connect: { id: session.user.id },
          },
        },
      });
      organizationId = organization.id;
    }

    // Create the project
    const project = await prisma.websiteProject.create({
      data: {
        organizationId,
        projectName: validatedData.projectName,
        projectType: validatedData.projectType,
        existingUrl: validatedData.existingUrl || null,
        targetAudience: validatedData.targetAudience || null,
        desiredFeatures: validatedData.desiredFeatures
          ? JSON.stringify(validatedData.desiredFeatures)
          : null,
        designPreferences: validatedData.designPreferences
          ? JSON.stringify(validatedData.designPreferences)
          : null,
        status: "submitted",
      },
    });

    // Create initial project note if there are additional notes
    if (validatedData.additionalNotes) {
      await prisma.projectNote.create({
        data: {
          projectId: project.id,
          content: validatedData.additionalNotes,
          isInternal: false,
          authorId: session.user.id,
        },
      });
    }

    return NextResponse.json(
      { success: true, project },
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
      { success: false, message: "Failed to create project" },
      { status: 500 }
    );
  }
}
