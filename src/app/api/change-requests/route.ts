import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { withAuth } from "@/lib/api/with-auth";
import { apiError } from "@/lib/api/errors";

// GET /api/change-requests - List change requests for user's organization
export const GET = withAuth(async (req, _ctx, session) => {
  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(Math.max(1, parseInt(searchParams.get("limit") || "50") || 50), 100);

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    // This is a CUSTOMER-portal endpoint — it is ALWAYS scoped to the caller's
    // own organization, even for staff. An admin account does NOT see other
    // tenants' change requests here (that caused Waste Rescue's requests to
    // surface in another customer's portal). Cross-org views live exclusively
    // under /api/admin/* + the admin dashboard. Never widen tenant scope here.
    if (!user.organizationId) {
      return NextResponse.json({ success: true, requests: [] });
    }

    const whereClause = {
      project: {
        organizationId: user.organizationId,
      },
    };

    const requests = await prisma.changeRequest.findMany({
      where: whereClause,
      include: {
        project: {
          select: { id: true, projectName: true },
        },
        oneOffCharge: {
          select: {
            id: true,
            status: true,
            amountCents: true,
            squarePaymentLinkUrl: true,
          },
        },
      },
      // Open tickets first, then by SLA deadline.
      orderBy: [{ slaDueAt: "asc" }, { createdAt: "desc" }],
      take: limit,
    });

    return NextResponse.json({ success: true, requests });
  } catch (error) {
    return apiError(error, "Failed to fetch change requests");
  }
});
