import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { prisma } from "@/lib/db/prisma";
import { apiError } from "@/lib/api/errors";

// GET /api/admin/subscriptions
// Optional ?orgId=<id> filters to a single organization, otherwise returns all.
// Admin/owner only — middleware enforces, but we re-check the role server-side.
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }
    if (session.user.role !== "admin" && session.user.role !== "owner") {
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
    }

    const orgId = request.nextUrl.searchParams.get("orgId");

    const subscriptions = await prisma.subscription.findMany({
      where: orgId ? { organizationId: orgId } : undefined,
      include: {
        organization: {
          select: { id: true, name: true, industry: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      subscriptions: subscriptions.map((s) => ({
        id: s.id,
        organizationId: s.organizationId,
        organizationName: s.organization?.name ?? null,
        plan: s.plan,
        status: s.status,
        processor: s.processor,
        priceMonthly: s.priceMonthly,
        trialEndDate: s.trialEndDate,
        currentPeriodEnd: s.currentPeriodEnd,
        canceledAt: s.canceledAt,
        createdAt: s.createdAt,
      })),
    });
  } catch (error) {
    return apiError(error, "Failed to list subscriptions");
  }
}
