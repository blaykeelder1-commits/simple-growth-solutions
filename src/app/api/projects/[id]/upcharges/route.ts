import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { withAuth } from "@/lib/api/with-auth";
import { apiError } from "@/lib/api/errors";

// GET /api/projects/[id]/upcharges - List custom upcharges for a project
// (visible to the org's users + admins).
export const GET = withAuth(async (_req, ctx, session) => {
  try {
    const { id: projectId } = await ctx.params;
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
    const charges = await prisma.oneOffCharge.findMany({
      where: { projectId, kind: "upcharge" },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        description: true,
        amountCents: true,
        status: true,
        squarePaymentLinkUrl: true,
        paidAt: true,
        createdAt: true,
      },
    });
    return NextResponse.json({ success: true, charges });
  } catch (err) {
    return apiError(err, "Failed to fetch upcharges");
  }
});
