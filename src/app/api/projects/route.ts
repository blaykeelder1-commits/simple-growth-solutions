import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { withAuth } from "@/lib/api/with-auth";
import { apiError } from "@/lib/api/errors";
import { getAdminEmails, sendNewProjectNotification } from "@/lib/email";
import { apiLogger } from "@/lib/logger";
import { z } from "zod";
import { isWebsitePlan, type WebsitePlanKey } from "@/lib/billing/founding";
import { additionalSitePriceCents } from "@/lib/billing/multi-site";
import { provisionAdditionalSite } from "@/lib/billing/additional-site";

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
  // Customer explicitly accepting the recurring add-on fee for a 2nd+ managed
  // website (mirrors acceptOverageFee on change requests). Without it, the route
  // 402s with the price so the portal can confirm before billing.
  acceptAdditionalSiteFee: z.boolean().optional().default(false),
});

// GET /api/projects - List projects for current user's organization
export const GET = withAuth(async (req, _ctx, session) => {
  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1") || 1);
    const limit = Math.min(Math.max(1, parseInt(searchParams.get("limit") || "50") || 50), 100);
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

    // ── Additional-site billing gate ─────────────────────────────────────
    // The first site is covered by the base plan. Each ADDITIONAL site is a
    // discounted recurring add-on (src/lib/billing/multi-site.ts). Admins (and
    // the headless Andy service) bypass; ordinary customers must have an active
    // plan and accept the fee before a 2nd+ site is created.
    let additionalSiteBilling: { billed: boolean; reason?: string; priceCents: number } | null = null;
    if (user?.role !== "admin") {
      const existingSites = await prisma.websiteProject.count({ where: { organizationId } });
      if (existingSites >= 1) {
        const baseSub = await prisma.subscription.findFirst({
          where: {
            organizationId,
            plan: { startsWith: "website_" },
            status: { in: ["active", "trialing"] },
          },
          orderBy: { createdAt: "desc" },
        });
        if (!baseSub || !isWebsitePlan(baseSub.plan)) {
          return NextResponse.json(
            {
              success: false,
              message:
                "Add a management plan to your first website before adding another site. Upgrade at /portal/billing.",
              code: "plan_required_for_additional_site",
            },
            { status: 402 }
          );
        }
        const basePlan = baseSub.plan as WebsitePlanKey;
        const priceCents = additionalSitePriceCents(basePlan);
        if (!validatedData.acceptAdditionalSiteFee) {
          return NextResponse.json(
            {
              success: false,
              message: `Adding a 2nd website is +$${(priceCents / 100).toFixed(0)}/mo (each site keeps its own change-request allotment). Confirm to add it.`,
              code: "additional_site_fee_required",
              additionalSite: { priceCents, plan: basePlan, siteNumber: existingSites + 1 },
            },
            { status: 402 }
          );
        }
        // Charge the recurring add-on to the card on file. Loud, never silent.
        const result = await provisionAdditionalSite(organizationId, basePlan, validatedData.projectName);
        additionalSiteBilling = { billed: result.billed, reason: result.reason, priceCents: result.priceCents };
        if (!result.billed) {
          apiLogger.warn(
            { organizationId, basePlan, reason: result.reason },
            "Additional site created but add-on NOT billed — needs follow-up"
          );
        }
      }
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

    // Notify admins of new project submission
    getAdminEmails()
      .then((emails) =>
        sendNewProjectNotification(
          emails,
          { id: project.id, projectName: project.projectName, projectType: project.projectType },
          session.user.name || session.user.email || "A customer"
        )
      )
      .catch((e) => apiLogger.warn({ err: e }, "Failed to send new project notification"));

    return NextResponse.json(
      { success: true, project, additionalSiteBilling },
      { status: 201 }
    );
  } catch (error) {
    return apiError(error, "Failed to create project");
  }
});
