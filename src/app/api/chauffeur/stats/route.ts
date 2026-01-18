import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { prisma } from "@/lib/db/prisma";

// GET /api/chauffeur/stats - Get business chauffeur dashboard stats
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
    });

    if (!user?.organizationId) {
      return NextResponse.json({
        success: true,
        stats: {
          revenueToday: 0,
          revenueThisWeek: 0,
          revenueThisMonth: 0,
          transactionsToday: 0,
          avgTicket: 0,
          reviewsThisMonth: 0,
          avgRating: null,
          integrationsConnected: 0,
        },
      });
    }

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(startOfDay);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Get metrics
    const [todayMetrics, weekMetrics, monthMetrics, integrations] = await Promise.all([
      prisma.businessMetric.findMany({
        where: {
          organizationId: user.organizationId,
          metricDate: { gte: startOfDay },
        },
      }),
      prisma.businessMetric.findMany({
        where: {
          organizationId: user.organizationId,
          metricDate: { gte: startOfWeek },
        },
      }),
      prisma.businessMetric.findMany({
        where: {
          organizationId: user.organizationId,
          metricDate: { gte: startOfMonth },
        },
      }),
      prisma.integration.count({
        where: {
          organizationId: user.organizationId,
          status: "connected",
        },
      }),
    ]);

    // Aggregate metrics (convert Decimal to number for arithmetic)
    const sumMetrics = (metrics: typeof todayMetrics) => ({
      revenue: metrics.reduce((sum, m) => sum + Number(m.revenue || 0), 0),
      transactions: metrics.reduce((sum, m) => sum + (m.transactions || 0), 0),
      reviewCount: metrics.reduce((sum, m) => sum + (m.reviewCount || 0), 0),
      avgRating:
        metrics.filter((m) => m.avgRating).length > 0
          ? metrics.reduce((sum, m) => sum + Number(m.avgRating || 0), 0) /
            metrics.filter((m) => m.avgRating).length
          : null,
    });

    const today = sumMetrics(todayMetrics);
    const week = sumMetrics(weekMetrics);
    const month = sumMetrics(monthMetrics);

    return NextResponse.json({
      success: true,
      stats: {
        revenueToday: today.revenue,
        revenueThisWeek: week.revenue,
        revenueThisMonth: month.revenue,
        transactionsToday: today.transactions,
        avgTicket: today.transactions > 0 ? Math.round(today.revenue / today.transactions) : 0,
        reviewsThisMonth: month.reviewCount,
        avgRating: month.avgRating,
        integrationsConnected: integrations,
      },
    });
  } catch (error) {
    console.error("Failed to fetch chauffeur stats:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}
