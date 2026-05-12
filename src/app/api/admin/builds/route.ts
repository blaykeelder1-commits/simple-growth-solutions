import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createBuildSchema = z.object({
  leadId: z.string(),
  templateId: z.string().optional(),
  projectName: z.string().min(1),
});

const updateBuildSchema = z.object({
  id: z.string(),
  status: z.string().optional(),
  demoScheduledAt: z.string().datetime().optional(),
  demoOutcome: z.enum(["accepted", "declined", "rescheduled"]).optional(),
  templateId: z.string().optional(),
  deployedUrl: z.string().url().optional(),
  notes: z.string().optional(),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as { role?: string }).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const builds = await prisma.websiteProject.findMany({
    where: { isFreeuild: true },
    orderBy: { createdAt: "desc" },
    include: {
      organization: { select: { name: true, customerStage: true } },
    },
  });

  return NextResponse.json({ success: true, builds });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as { role?: string }).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const validated = createBuildSchema.parse(body);

  // Find the lead
  const lead = await prisma.lead.findUnique({
    where: { id: validated.leadId },
  });

  if (!lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  // Create or find the organization for this lead
  let orgId = lead.convertedToOrgId;

  if (!orgId) {
    const org = await prisma.organization.create({
      data: {
        name: lead.businessName,
        industry: lead.industry,
        customerStage: "website_build",
        sourceLeadId: lead.id,
      },
    });
    orgId = org.id;

    // Update lead with converted org
    await prisma.lead.update({
      where: { id: lead.id },
      data: {
        convertedToOrgId: org.id,
        status: "converted",
      },
    });

    // Log journey event
    await prisma.journeyEvent.create({
      data: {
        organizationId: org.id,
        fromStage: "lead",
        toStage: "website_build",
        triggeredBy: "admin",
        metadata: JSON.stringify({ leadId: lead.id }),
      },
    });
  }

  const project = await prisma.websiteProject.create({
    data: {
      organizationId: orgId,
      projectName: validated.projectName,
      projectType: "new_build",
      existingUrl: lead.websiteUrl,
      isFreeuild: true,
      templateId: validated.templateId || null,
      sourceLeadId: lead.id,
      status: "queued",
    },
  });

  return NextResponse.json({ success: true, project }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as { role?: string }).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const validated = updateBuildSchema.parse(body);

  const updateData: Record<string, unknown> = {};
  if (validated.status) updateData.status = validated.status;
  if (validated.demoScheduledAt) {
    updateData.demoScheduledAt = new Date(validated.demoScheduledAt);
    if (!validated.status) updateData.status = "demo_scheduled";
  }
  if (validated.demoOutcome) {
    updateData.demoOutcome = validated.demoOutcome;
    updateData.demoCompletedAt = new Date();
  }
  if (validated.templateId) updateData.templateId = validated.templateId;
  if (validated.deployedUrl) updateData.deployedUrl = validated.deployedUrl;

  const project = await prisma.websiteProject.update({
    where: { id: validated.id },
    data: updateData,
  });

  // If accepted, advance the org stage
  if (validated.demoOutcome === "accepted") {
    await prisma.organization.update({
      where: { id: project.organizationId },
      data: { customerStage: "website_managed" },
    });
    await prisma.journeyEvent.create({
      data: {
        organizationId: project.organizationId,
        fromStage: "website_build",
        toStage: "website_managed",
        triggeredBy: "admin",
        metadata: JSON.stringify({ projectId: project.id }),
      },
    });
  }

  // Add note if provided
  if (validated.notes) {
    await prisma.projectNote.create({
      data: {
        projectId: project.id,
        content: validated.notes,
        isInternal: true,
      },
    });
  }

  return NextResponse.json({ success: true, project });
}
