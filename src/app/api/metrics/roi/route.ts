import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { prisma } from "@/lib/db/prisma";
import { logger } from "@/lib/logger";
import {
  calculateProjectedSavings,
  projectAnnualSavings,
  calculateROIMultiplier,
  generateCostComparison,
  generateValueProposition,
} from "@/lib/metrics/projections";
import {
  generateAllBenchmarks,
  getIndustryList,
} from "@/lib/benchmarks/comparisons";
import { getDisclaimer } from "@/lib/legal/disclaimers";

// Default subscription cost: $200/month in cents
const DEFAULT_SUBSCRIPTION_COST = 20000;

// GET /api/metrics/roi - Calculate ROI metrics for the organization
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        organization: true,
      },
    });

    if (!user?.organizationId) {
      // Return default metrics for users without organization
      return NextResponse.json({
        success: true,
        metrics: getDefaultMetrics(),
      });
    }

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixMonthsAgo = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);

    // Fetch all relevant data for ROI calculation
    const [
      invoices,
      clients,
      payments,
      recoveryEvents,
      recommendations,
      organization,
    ] = await Promise.all([
      // All invoices
      prisma.invoice.findMany({
        where: { organizationId: user.organizationId },
      }),
      // All clients with scores
      prisma.client.findMany({
        where: { organizationId: user.organizationId },
        select: {
          id: true,
          paymentScore: true,
          avgDaysToPayment: true,
          industry: true,
        },
      }),
      // Recent payments
      prisma.payment.findMany({
        where: {
          invoice: { organizationId: user.organizationId },
          paidAt: { gte: thirtyDaysAgo },
        },
      }),
      // Recovery events (AI-attributed recoveries)
      prisma.recoveryEvent.findMany({
        where: {
          organizationId: user.organizationId,
          eventDate: { gte: sixMonthsAgo },
        },
      }),
      // Recommendations acted upon
      prisma.aIRecommendation.findMany({
        where: {
          organizationId: user.organizationId,
          createdAt: { gte: sixMonthsAgo },
        },
      }),
      // Organization details
      prisma.organization.findUnique({
        where: { id: user.organizationId },
      }),
    ]);

    // Calculate time saved metrics
    // Assumption: Manual bookkeeping/analysis takes ~10 hours/month for average small business
    // Platform could reduce this by ~40%
    const estimatedHoursOnBookkeeping = Math.max(
      5,
      Math.min(20, clients.length * 0.5 + invoices.length * 0.1)
    );

    // Calculate overdue invoices
    const overdueInvoices = invoices.filter(
      (inv) =>
        new Date(inv.dueDate) < now &&
        inv.status !== "paid" &&
        inv.status !== "written_off"
    );
    const overdueValue = overdueInvoices.reduce(
      (sum, inv) => sum + (Number(inv.amount) - Number(inv.amountPaid)),
      0
    );

    // Calculate average days to payment
    const avgDaysToPayment =
      clients.length > 0
        ? clients.reduce((sum, c) => sum + Number(c.avgDaysToPayment || 30), 0) /
          clients.length
        : 35;

    // Calculate monthly revenue (from paid invoices in last 30 days)
    const monthlyRevenue = payments.reduce(
      (sum, p) => sum + Number(p.amount),
      0
    );

    // Calculate money recovered through AI recommendations
    const aiRecoveredAmount = recoveryEvents
      .filter(
        (e) =>
          e.attributedTo === "ai_recommendation" ||
          e.attributedTo === "follow_up" ||
          e.attributedTo === "automatic"
      )
      .reduce((sum, e) => sum + Number(e.recoveredAmount), 0);

    // Count decisions informed (recommendations viewed/acted upon)
    const decisionsInformed = recommendations.filter(
      (r) => r.status === "acted_upon" || r.status === "dismissed"
    ).length;

    // Generate projections
    const monthlySavings = calculateProjectedSavings(
      {
        hoursOnBookkeeping: estimatedHoursOnBookkeeping,
        overdueInvoicesCount: overdueInvoices.length,
        overdueInvoicesValue: overdueValue,
        avgDaysToPayment,
        monthlyRevenue,
      },
      {
        hourlyRate: 5000, // $50/hr
      }
    );

    const annualSavings = projectAnnualSavings(monthlySavings);
    const roiMultiplier = calculateROIMultiplier(
      monthlySavings.projectedSavings,
      DEFAULT_SUBSCRIPTION_COST
    );
    const costComparison = generateCostComparison(DEFAULT_SUBSCRIPTION_COST);
    const valueProposition = generateValueProposition(
      monthlySavings,
      roiMultiplier
    );

    // Generate benchmark comparisons
    const avgClientScore =
      clients.length > 0
        ? clients.reduce((sum, c) => sum + (c.paymentScore || 70), 0) /
          clients.length
        : 70;

    const latePaymentRate =
      invoices.length > 0 ? overdueInvoices.length / invoices.length : 0.18;

    // Determine industry from organization or default
    const industryKey = organization?.industry || "general";

    const benchmarks = generateAllBenchmarks(
      {
        avgDaysToPayment,
        latePaymentRate,
        avgPaymentScore: avgClientScore,
        healthScore: calculateSimpleHealthScore(
          overdueValue,
          monthlyRevenue,
          avgDaysToPayment
        ),
      },
      industryKey
    );

    return NextResponse.json({
      success: true,
      metrics: {
        // Summary metrics
        summary: {
          timeSavedHours: Math.round(estimatedHoursOnBookkeeping * 0.4 * 10) / 10,
          moneyRecovered: aiRecoveredAmount,
          cashFlowDaysImproved: Math.round(avgDaysToPayment * 0.2),
          decisionsInformed,
          subscriptionCost: DEFAULT_SUBSCRIPTION_COST,
        },
        // Projected savings
        projections: {
          monthly: monthlySavings,
          annual: annualSavings,
          roi: roiMultiplier,
        },
        // Cost comparisons
        comparisons: costComparison,
        // Value proposition
        valueProposition,
        // Industry benchmarks
        benchmarks: {
          ...benchmarks,
          availableIndustries: getIndustryList(),
          currentIndustry: industryKey,
        },
        // Metadata
        meta: {
          calculatedAt: now.toISOString(),
          dataPoints: {
            invoices: invoices.length,
            clients: clients.length,
            payments: payments.length,
            recoveryEvents: recoveryEvents.length,
          },
          disclaimer: getDisclaimer("roi", "full"),
        },
      },
    });
  } catch (error) {
    logger.error({ err: error, route: "metrics/roi" }, "GET error");
    return NextResponse.json(
      { success: false, message: "Failed to calculate ROI metrics" },
      { status: 500 }
    );
  }
}

// Simple health score calculation for benchmarking
function calculateSimpleHealthScore(
  overdueValue: number,
  monthlyRevenue: number,
  avgDaysToPayment: number
): number {
  // Base score of 70
  let score = 70;

  // Adjust based on overdue ratio
  if (monthlyRevenue > 0) {
    const overdueRatio = overdueValue / monthlyRevenue;
    if (overdueRatio < 0.1) score += 15;
    else if (overdueRatio < 0.2) score += 10;
    else if (overdueRatio < 0.3) score += 5;
    else if (overdueRatio > 0.5) score -= 15;
    else if (overdueRatio > 0.4) score -= 10;
  }

  // Adjust based on payment speed
  if (avgDaysToPayment < 25) score += 10;
  else if (avgDaysToPayment < 35) score += 5;
  else if (avgDaysToPayment > 50) score -= 10;
  else if (avgDaysToPayment > 40) score -= 5;

  return Math.max(0, Math.min(100, score));
}

// Default metrics for users without data
function getDefaultMetrics() {
  const monthlySavings = calculateProjectedSavings({
    hoursOnBookkeeping: 10,
    overdueInvoicesCount: 0,
    overdueInvoicesValue: 0,
    avgDaysToPayment: 35,
    monthlyRevenue: 0,
  });

  const annualSavings = projectAnnualSavings(monthlySavings);
  const roiMultiplier = calculateROIMultiplier(
    monthlySavings.projectedSavings,
    DEFAULT_SUBSCRIPTION_COST
  );
  const costComparison = generateCostComparison(DEFAULT_SUBSCRIPTION_COST);
  const valueProposition = generateValueProposition(
    monthlySavings,
    roiMultiplier
  );
  const benchmarks = generateAllBenchmarks(
    {
      avgDaysToPayment: 35,
      latePaymentRate: 0.18,
      avgPaymentScore: 70,
      healthScore: 70,
    },
    "general"
  );

  return {
    summary: {
      timeSavedHours: 0,
      moneyRecovered: 0,
      cashFlowDaysImproved: 0,
      decisionsInformed: 0,
      subscriptionCost: DEFAULT_SUBSCRIPTION_COST,
    },
    projections: {
      monthly: monthlySavings,
      annual: annualSavings,
      roi: roiMultiplier,
    },
    comparisons: costComparison,
    valueProposition,
    benchmarks: {
      ...benchmarks,
      availableIndustries: getIndustryList(),
      currentIndustry: "general",
    },
    meta: {
      calculatedAt: new Date().toISOString(),
      dataPoints: {
        invoices: 0,
        clients: 0,
        payments: 0,
        recoveryEvents: 0,
      },
      disclaimer: getDisclaimer("roi", "full"),
      isDefault: true,
    },
  };
}
