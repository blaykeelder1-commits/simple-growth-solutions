import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { withAuth } from "@/lib/api/with-auth";
import { apiError } from "@/lib/api/errors";
import {
  resolvePlanCaps,
  getPeriodWindow,
  rollManualPeriodIfExpired,
  OVERAGE_CR_FEE_CENTS,
} from "@/lib/billing/plan-caps";

// GET /api/billing/cr-quota
// Returns the customer's change-request quota for the current period.
// Used by /portal/requests/new to show "X of Y included" before they submit.
export const GET = withAuth(async (_req, _ctx, session) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { organizationId: true },
    });
    if (!user?.organizationId) {
      return NextResponse.json({
        success: true,
        quota: { plan: null, planLabel: "No plan", used: 0, included: 0, periodEndsAt: null, overageFeeCents: OVERAGE_CR_FEE_CENTS },
      });
    }

    let sub = await prisma.subscription.findFirst({
      where: {
        organizationId: user.organizationId,
        status: { in: ["active", "trialing"] },
      },
      orderBy: { createdAt: "desc" },
    });

    if (sub) sub = await rollManualPeriodIfExpired(prisma, sub);

    if (!sub) {
      return NextResponse.json({
        success: true,
        quota: { plan: null, planLabel: "No plan", used: 0, included: 0, periodEndsAt: null, overageFeeCents: OVERAGE_CR_FEE_CENTS },
      });
    }

    const caps = resolvePlanCaps(sub.plan, sub.status);
    const { from, to } = getPeriodWindow({
      status: sub.status,
      trialStartDate: sub.trialStartDate,
      trialEndDate: sub.trialEndDate,
      currentPeriodStart: sub.currentPeriodStart,
      currentPeriodEnd: sub.currentPeriodEnd,
    });

    const used = await prisma.changeRequest.count({
      where: {
        project: { organizationId: user.organizationId },
        createdAt: { gte: from, lte: to },
        status: { not: "rejected" },
      },
    });

    return NextResponse.json({
      success: true,
      quota: {
        plan: sub.plan,
        planLabel: caps.label,
        subStatus: sub.status,
        used,
        included: caps.crsPerPeriod,
        remaining: Math.max(0, caps.crsPerPeriod - used),
        periodStartsAt: from,
        periodEndsAt: to,
        overageFeeCents: OVERAGE_CR_FEE_CENTS,
      },
    });
  } catch (error) {
    return apiError(error, "Failed to fetch quota");
  }
});
