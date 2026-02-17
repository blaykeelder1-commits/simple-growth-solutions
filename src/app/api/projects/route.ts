import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { withAuth } from "@/lib/api/with-auth";
import { apiError } from "@/lib/api/errors";
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
export const GET = withAuth(async (req, _ctx, session) => {
  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(Math.max(1, parseInt(searchParams.get("limit") || "50")), 100);
    const skip = (page - 1) * limit;

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user?.organizationId) {
      return NextResponse.json({ success: true, projects: [], pagination: { page, limit, total: 0, totalPages: 0 } });
    }

    const where = { organizationId: user.organizationId };

    const [projects, total] = await Promise.all([
      prisma.websiteProject.findMany({
        where,
        include: {
          changeRequests: {
            select: { id: true, status: true },
          },
        },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip,
      }),
      prisma.websiteProject.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      projects,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    return apiError(error, "Failed to fetch projects");
  }
});

// POST /api/projects - Create a new project
export const POST = withAuth(async (req, _ctx, session) => {
  try {
    const body = await req.json();
    const validatedData = createProjectSchema.parse(body);

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    let organizationId = user?.organizationId;

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
    return apiError(error, "Failed to create project");
  }
});
