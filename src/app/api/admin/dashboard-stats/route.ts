import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { withAdmin } from "@/lib/api/with-auth";
import { apiError } from "@/lib/api/errors";

// GET /api/admin/dashboard-stats
// Powers the admin command-center hero. Returns the operator-focused KPIs:
// open ticket queue, SLA risk, this-week throughput, customer base.
export const GET = withAdmin(async () => {
  try {
    const now = new Date();
    const in12h = new Date(now.getTime() + 12 * 60 * 60 * 1000);
    const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const startOfDay = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );
    const last30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      openTickets,
      atRiskTickets,
      stuckPayment,
      activeCustomers,
      completedThisWeek,
      hotLeads,
      newLeadsToday,
      recentCompleted,
    ] = await Promise.all([
      prisma.changeRequest.count({
        where: { status: { in: ["pending", "approved", "in_progress"] } },
      }),
      prisma.changeRequest.count({
        where: {
          status: { in: ["pending", "approved", "in_progress"] },
          slaDueAt: { lte: in12h },
        },
      }),
      prisma.changeRequest.count({
        where: { status: "awaiting_payment" },
      }),
      prisma.organization.count({
        where: {
          subscriptions: {
            some: { status: "active" },
          },
        },
      }),
      prisma.changeRequest.count({
        where: {
          status: "completed",
          updatedAt: { gte: startOfWeek },
        },
      }),
      prisma.lead.count({
        where: { analysisScore: { gte: 80 } },
      }),
      prisma.lead.count({
        where: { createdAt: { gte: startOfDay } },
      }),
      // For avg turnaround + SLA-met % over the last 30 days
      prisma.changeRequest.findMany({
        where: {
          status: "completed",
          updatedAt: { gte: last30 },
        },
        select: { createdAt: true, updatedAt: true, slaDueAt: true },
      }),
    ]);

    // Compute avg turnaround & in-SLA %.
    const completedCount = recentCompleted.length;
    let avgTurnaroundHours = 0;
    let inSlaPercent = 100;
    if (completedCount > 0) {
      const totalHours = recentCompleted.reduce(
        (sum, cr) =>
          sum +
          (cr.updatedAt.getTime() - cr.createdAt.getTime()) / (60 * 60 * 1000),
        0
      );
      avgTurnaroundHours = totalHours / completedCount;
      const inSla = recentCompleted.filter(
        (cr) => cr.slaDueAt && cr.updatedAt <= cr.slaDueAt
      ).length;
      inSlaPercent = Math.round((inSla / completedCount) * 100);
    }

    return NextResponse.json({
      success: true,
      stats: {
        openTickets,
        atRiskTickets,
        stuckPayment,
        activeCustomers,
        completedThisWeek,
        hotLeads,
        newLeadsToday,
        avgTurnaroundHours: Math.round(avgTurnaroundHours * 10) / 10,
        inSlaPercent,
      },
    });
  } catch (error) {
    return apiError(error, "Failed to load dashboard stats");
  }
});
