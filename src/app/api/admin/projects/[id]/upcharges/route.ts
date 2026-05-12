import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { withAdmin } from "@/lib/api/with-auth";
import { apiError } from "@/lib/api/errors";
import { apiLogger } from "@/lib/logger";
import {
  getSgsSquareConfig,
  findOrCreateCustomer,
  createPaymentLink,
} from "@/lib/billing/square";

const createUpchargeSchema = z.object({
  templateId: z.string().optional(),
  description: z.string().min(3),
  amountCents: z.number().int().positive(),
});

// POST /api/admin/projects/[id]/upcharges - Quote a one-off custom upcharge
// for the given project. Generates a Square Payment Link; the customer
// receives the URL in their portal and (optionally) by email.
export const POST = withAdmin(async (req, ctx) => {
  try {
    const { id: projectId } = await ctx.params;
    const project = await prisma.websiteProject.findUnique({
      where: { id: projectId },
      include: {
        organization: {
          include: { users: { take: 1, where: { role: { in: ["owner", "user"] } } } },
        },
      },
    });
    if (!project) {
      return NextResponse.json({ success: false, message: "Project not found" }, { status: 404 });
    }

    const body = await req.json();
    const data = createUpchargeSchema.parse(body);

    const cfg = getSgsSquareConfig();
    if (!cfg) {
      return NextResponse.json(
        { success: false, message: "Square is not configured" },
        { status: 500 }
      );
    }

    // Find a contact email on the org. Prefer the first non-admin user.
    const contactUser = project.organization.users[0];
    if (!contactUser) {
      return NextResponse.json(
        { success: false, message: "No contact user on this organization" },
        { status: 400 }
      );
    }

    const customer = await findOrCreateCustomer(
      cfg,
      contactUser.email,
      contactUser.name || undefined
    );

    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const link = await createPaymentLink(cfg, {
      amountCents: data.amountCents,
      description: data.description,
      redirectUrl: `${baseUrl}/portal/projects/${projectId}`,
      buyerEmail: contactUser.email,
      customerId: customer.id,
      metadata: {
        organizationId: project.organizationId,
        projectId,
        kind: "upcharge",
        ...(data.templateId ? { templateId: data.templateId } : {}),
      },
    });

    const charge = await prisma.oneOffCharge.create({
      data: {
        organizationId: project.organizationId,
        projectId,
        kind: "upcharge",
        description: data.description,
        amountCents: data.amountCents,
        squarePaymentLinkId: link.id,
        squarePaymentLinkUrl: link.url,
        squareOrderId: link.orderId,
        status: "pending",
        metadata: data.templateId ? JSON.stringify({ templateId: data.templateId }) : null,
      },
    });

    return NextResponse.json({ success: true, charge }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: "Invalid input", issues: err.issues },
        { status: 400 }
      );
    }
    apiLogger.error({ err }, "Failed to create upcharge");
    return apiError(err, "Failed to create upcharge");
  }
});

// GET /api/admin/projects/[id]/upcharges - List upcharges for a project
export const GET = withAdmin(async (_req, ctx) => {
  const { id: projectId } = await ctx.params;
  const charges = await prisma.oneOffCharge.findMany({
    where: { projectId },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ success: true, charges });
});
