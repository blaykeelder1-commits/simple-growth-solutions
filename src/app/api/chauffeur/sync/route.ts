import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { prisma } from "@/lib/db/prisma";
import {
  QuickBooksClient,
  refreshAccessToken,
} from "@/lib/integrations/quickbooks";

// POST /api/chauffeur/sync — Pull data from QuickBooks into BusinessMetric table
export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user?.organizationId) {
      return NextResponse.json({ error: "No organization" }, { status: 400 });
    }

    // Find QuickBooks integration
    const integration = await prisma.integration.findFirst({
      where: {
        organizationId: user.organizationId,
        provider: "quickbooks",
        status: { in: ["connected", "active"] },
      },
    });

    if (!integration) {
      return NextResponse.json(
        { error: "QuickBooks not connected. Go to Integrations to connect." },
        { status: 400 }
      );
    }

    // Refresh token if needed
    let accessToken = integration.accessToken;
    const tokenExpiry = integration.tokenExpiresAt;

    if (tokenExpiry && new Date(tokenExpiry) < new Date()) {
      const refreshed = await refreshAccessToken(integration.refreshToken!);
      accessToken = refreshed.accessToken;

      await prisma.integration.update({
        where: { id: integration.id },
        data: {
          accessToken: refreshed.accessToken,
          refreshToken: refreshed.refreshToken,
          tokenExpiresAt: new Date(Date.now() + refreshed.expiresIn * 1000),
        },
      });
    }

    const apiUrl =
      process.env.QUICKBOOKS_API_URL || "https://quickbooks.api.intuit.com";
    const qbClient = new QuickBooksClient(
      accessToken!,
      integration.externalAccountId!, // realmId
      apiUrl
    );

    // Fetch last 90 days of payments for revenue metrics
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const modifiedAfter = ninetyDaysAgo.toISOString().split("T")[0];

    const [payments, invoices] = await Promise.all([
      qbClient.getPayments({ modifiedAfter }),
      qbClient.getInvoices({ modifiedAfter }),
    ]);

    // Aggregate payments by date → daily revenue metrics
    const dailyMetrics = new Map<
      string,
      { revenue: number; transactions: number }
    >();

    for (const payment of payments) {
      const date = payment.TxnDate
        ? payment.TxnDate.split("T")[0]
        : new Date().toISOString().split("T")[0];

      const existing = dailyMetrics.get(date) || {
        revenue: 0,
        transactions: 0,
      };
      existing.revenue += payment.TotalAmt || 0;
      existing.transactions += 1;
      dailyMetrics.set(date, existing);
    }

    // Calculate total outstanding from invoices
    let totalOutstanding = 0;
    let overdueCount = 0;
    const now = new Date();

    for (const inv of invoices) {
      const balance = inv.Balance ?? 0;
      if (balance > 0) {
        totalOutstanding += balance;
        if (inv.DueDate && new Date(inv.DueDate) < now) {
          overdueCount++;
        }
      }
    }

    // Upsert daily metrics into BusinessMetric table
    let metricsCreated = 0;
    for (const [dateStr, metrics] of dailyMetrics) {
      const metricDate = new Date(dateStr);

      await prisma.businessMetric.upsert({
        where: {
          organizationId_metricDate_period_source: {
            organizationId: user.organizationId,
            metricDate,
            period: "daily",
            source: "quickbooks",
          },
        },
        update: {
          revenue: metrics.revenue,
          transactions: metrics.transactions,
        },
        create: {
          organizationId: user.organizationId,
          metricDate,
          period: "daily",
          source: "quickbooks",
          revenue: metrics.revenue,
          transactions: metrics.transactions,
        },
      });
      metricsCreated++;
    }

    // Update the last sync timestamp
    await prisma.integration.update({
      where: { id: integration.id },
      data: { lastSyncAt: new Date() },
    });

    return NextResponse.json({
      success: true,
      metricsCreated,
      paymentsProcessed: payments.length,
      invoicesProcessed: invoices.length,
      totalOutstanding,
      overdueCount,
    });
  } catch (error) {
    console.error("Chauffeur sync error:", error);
    return NextResponse.json(
      { error: "Failed to sync data from QuickBooks" },
      { status: 500 }
    );
  }
}
