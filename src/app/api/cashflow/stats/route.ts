import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { prisma } from "@/lib/db/prisma";
import { forecastInflow, calculateHealthScore } from "@/lib/cashflow/forecast";
import { logger } from "@/lib/logger";

// GET /api/cashflow/stats - Get cash flow dashboard statistics
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
      // Return default stats for users without organization
      return NextResponse.json({
        success: true,
        stats: {
          totalReceivables: 0,
          overdueReceivables: 0,
          collectedThisMonth: 0,
          projectedInflow30d: 0,
          healthScore: 50,
          overdueInvoices: 0,
          totalClients: 0,
          pendingRecommendations: 0,
        },
      });
    }

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Fetch all relevant data
    const [invoices, payments, clients, recommendations] = await Promise.all([
      prisma.invoice.findMany({
        where: {
          organizationId: user.organizationId,
          status: { notIn: ["paid", "written_off"] },
        },
      }),
      prisma.payment.findMany({
        where: {
          invoice: { organizationId: user.organizationId },
          paidAt: { gte: startOfMonth },
        },
      }),
      prisma.client.count({
        where: { organizationId: user.organizationId },
      }),
      prisma.aIRecommendation.count({
        where: {
          organizationId: user.organizationId,
          status: "pending",
        },
      }),
    ]);

    // Calculate stats (convert Decimal to number for arithmetic)
    const totalReceivables = invoices.reduce(
      (sum, inv) => sum + (Number(inv.amount) - Number(inv.amountPaid)),
      0
    );

    const overdueInvoices = invoices.filter(
      (inv) => new Date(inv.dueDate) < now
    );
    const overdueReceivables = overdueInvoices.reduce(
      (sum, inv) => sum + (Number(inv.amount) - Number(inv.amountPaid)),
      0
    );

    const collectedThisMonth = payments.reduce((sum, p) => sum + Number(p.amount), 0);

    // Forecast 30-day inflow
    const forecast = forecastInflow(
      invoices.map((inv) => ({
        id: inv.id,
        amount: Number(inv.amount),
        amountPaid: Number(inv.amountPaid),
        dueDate: new Date(inv.dueDate),
        status: inv.status,
        recoveryLikelihood: inv.recoveryLikelihood ? Number(inv.recoveryLikelihood) : null,
      })),
      30
    );

    // Calculate average days outstanding from actual invoice data
    const invoicesWithDays = invoices.map((inv) => {
      const dueDate = new Date(inv.dueDate);
      const daysDiff = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
      return Math.max(0, daysDiff); // Only count days past due
    });
    const avgDaysOutstanding = invoicesWithDays.length > 0
      ? invoicesWithDays.reduce((sum, days) => sum + days, 0) / invoicesWithDays.length
      : 0;

    // Calculate health score
    const healthScore = calculateHealthScore(
      totalReceivables,
      overdueReceivables,
      avgDaysOutstanding,
      forecast.total
    );

    return NextResponse.json({
      success: true,
      stats: {
        totalReceivables,
        overdueReceivables,
        collectedThisMonth,
        projectedInflow30d: forecast.total,
        healthScore,
        overdueInvoices: overdueInvoices.length,
        totalClients: clients,
        pendingRecommendations: recommendations,
      },
    });
  } catch (error) {
    logger.error({ err: error, route: "cashflow/stats" }, "GET error");
    return NextResponse.json(
      { success: false, message: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}
