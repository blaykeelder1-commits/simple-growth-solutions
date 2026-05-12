import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { withAdmin } from "@/lib/api/with-auth";
import { apiError } from "@/lib/api/errors";

// GET /api/admin/reports
// CEO-grade revenue + customer metrics. Aggregates everything needed for the
// /admin/reports dashboard: MRR, new customers, churn, plan breakdown,
// trial conversion, one-off charge totals, signups-by-day timeseries.
export const GET = withAdmin(async () => {
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      activeSubs,
      trialingSubs,
      canceledLast30,
      newOrgsLast30,
      newOrgsThisMonth,
      newOrgsLast7,
      paidOneOffsLast30,
      signupTimeseries,
    ] = await Promise.all([
      prisma.subscription.findMany({
        where: { status: "active" },
        select: { plan: true, priceMonthly: true, createdAt: true },
      }),
      prisma.subscription.count({ where: { status: "trialing" } }),
      prisma.subscription.count({
        where: { status: "canceled", canceledAt: { gte: thirtyDaysAgo } },
      }),
      prisma.organization.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      prisma.organization.count({ where: { createdAt: { gte: startOfMonth } } }),
      prisma.organization.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
      prisma.oneOffCharge.aggregate({
        where: { status: "paid", paidAt: { gte: thirtyDaysAgo } },
        _sum: { amountCents: true },
        _count: { _all: true },
      }),
      // Daily signup timeseries — last 30 days.
      prisma.organization.findMany({
        where: { createdAt: { gte: thirtyDaysAgo } },
        select: { createdAt: true },
      }),
    ]);

    const mrrCents = activeSubs.reduce((sum, s) => sum + (s.priceMonthly || 0), 0);

    const planBreakdown = activeSubs.reduce(
      (acc, s) => {
        if (!acc[s.plan]) acc[s.plan] = { plan: s.plan, count: 0, mrrCents: 0 };
        acc[s.plan].count++;
        acc[s.plan].mrrCents += s.priceMonthly || 0;
        return acc;
      },
      {} as Record<string, { plan: string; count: number; mrrCents: number }>
    );

    // Build a 30-day signup histogram.
    const signupsByDay: Record<string, number> = {};
    for (let i = 0; i < 30; i++) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().slice(0, 10);
      signupsByDay[key] = 0;
    }
    for (const o of signupTimeseries) {
      const key = o.createdAt.toISOString().slice(0, 10);
      if (key in signupsByDay) signupsByDay[key]++;
    }
    const signupSeries = Object.entries(signupsByDay)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Trial → active conversion rate (lifetime). All-time count of subs that
    // ever reached `active` over count of subs that ever reached `trialing`.
    const [everTrialed, everActive] = await Promise.all([
      prisma.subscription.count({ where: { OR: [{ status: "trialing" }, { status: "active" }, { status: "canceled" }, { status: "past_due" }] } }),
      prisma.subscription.count({ where: { OR: [{ status: "active" }, { status: "canceled" }, { status: "past_due" }] } }),
    ]);
    const trialConversionRate = everTrialed > 0 ? everActive / everTrialed : 0;

    return NextResponse.json({
      success: true,
      generatedAt: now,
      mrr: {
        cents: mrrCents,
        dollars: Math.round(mrrCents / 100),
        activeSubscriptions: activeSubs.length,
        trialingSubscriptions: trialingSubs,
        canceledLast30,
      },
      customers: {
        newLast7: newOrgsLast7,
        newLast30: newOrgsLast30,
        newThisMonth: newOrgsThisMonth,
      },
      oneOffCharges: {
        last30Days: {
          totalCents: paidOneOffsLast30._sum.amountCents ?? 0,
          totalDollars: Math.round((paidOneOffsLast30._sum.amountCents ?? 0) / 100),
          count: paidOneOffsLast30._count._all,
        },
      },
      planBreakdown: Object.values(planBreakdown).sort((a, b) => b.mrrCents - a.mrrCents),
      trialConversionRate,
      signupSeries,
    });
  } catch (error) {
    return apiError(error, "Failed to compute reports");
  }
});
