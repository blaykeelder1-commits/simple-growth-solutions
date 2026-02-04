// Plaid Accounts API
// Lists connected bank accounts and balances

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  getPlaidConfig,
  getAccountBalances,
  getTransactions,
  generateBankInsights,
} from "@/lib/integrations/plaid";

// GET - List all connected bank accounts
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user?.organizationId) {
      return NextResponse.json(
        { error: "No organization found" },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const includeInsights = searchParams.get("insights") === "true";

    // Get all Plaid items and accounts
    const plaidItems = await prisma.plaidItem.findMany({
      where: {
        organizationId: user.organizationId,
        status: "active",
      },
      include: {
        bankAccounts: {
          where: { isHidden: false },
          orderBy: { currentBalance: "desc" },
        },
      },
    });

    // Calculate totals
    const allAccounts = plaidItems.flatMap((item) => item.bankAccounts);
    const totalBalance = allAccounts.reduce(
      (sum, acc) => sum + acc.currentBalance,
      0
    );
    const totalAvailable = allAccounts.reduce(
      (sum, acc) => sum + (acc.availableBalance || acc.currentBalance),
      0
    );

    // Group by type
    const checkingAccounts = allAccounts.filter(
      (a) => a.type === "depository" && a.subtype === "checking"
    );
    const savingsAccounts = allAccounts.filter(
      (a) => a.type === "depository" && a.subtype === "savings"
    );
    const creditAccounts = allAccounts.filter((a) => a.type === "credit");

    const response: Record<string, unknown> = {
      connections: plaidItems.map((item) => ({
        id: item.id,
        institutionName: item.institutionName,
        institutionLogo: item.institutionLogo,
        status: item.status,
        lastSynced: item.lastSynced,
        accountCount: item.bankAccounts.length,
      })),
      accounts: allAccounts.map((acc) => ({
        id: acc.id,
        plaidAccountId: acc.plaidAccountId,
        name: acc.name,
        officialName: acc.officialName,
        type: acc.type,
        subtype: acc.subtype,
        mask: acc.mask,
        currentBalance: acc.currentBalance,
        availableBalance: acc.availableBalance,
        currency: acc.currency,
        isPrimary: acc.isPrimary,
        lastSynced: acc.lastSynced,
      })),
      summary: {
        totalBalance,
        totalAvailable,
        connectionCount: plaidItems.length,
        accountCount: allAccounts.length,
        byType: {
          checking: {
            count: checkingAccounts.length,
            balance: checkingAccounts.reduce(
              (sum, a) => sum + a.currentBalance,
              0
            ),
          },
          savings: {
            count: savingsAccounts.length,
            balance: savingsAccounts.reduce(
              (sum, a) => sum + a.currentBalance,
              0
            ),
          },
          credit: {
            count: creditAccounts.length,
            balance: creditAccounts.reduce(
              (sum, a) => sum + a.currentBalance,
              0
            ),
          },
        },
      },
    };

    // Optionally include insights (requires fetching transactions)
    if (includeInsights && plaidItems.length > 0) {
      const config = getPlaidConfig();

      if (config) {
        try {
          // Get transactions from last 90 days for insights
          const endDate = new Date().toISOString().split("T")[0];
          const startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0];

          const allTransactions = [];

          for (const item of plaidItems) {
            const transactions = await getTransactions(
              config,
              item.accessToken,
              startDate,
              endDate
            );
            allTransactions.push(...transactions);
          }

          // Generate insights
          const plaidAccounts = allAccounts.map((acc) => ({
            accountId: acc.plaidAccountId,
            name: acc.name,
            officialName: acc.officialName,
            type: acc.type as "depository" | "credit" | "loan" | "investment" | "other",
            subtype: acc.subtype,
            mask: acc.mask,
            balances: {
              available: acc.availableBalance ? acc.availableBalance / 100 : null,
              current: acc.currentBalance / 100,
              limit: acc.limitAmount ? acc.limitAmount / 100 : null,
              isoCurrencyCode: acc.currency,
            },
          }));

          const insights = generateBankInsights(plaidAccounts, allTransactions);

          response.insights = {
            averageMonthlyIncome: Math.round(insights.averageMonthlyIncome * 100),
            averageMonthlyExpenses: Math.round(insights.averageMonthlyExpenses * 100),
            netCashFlowTrend: insights.netCashFlowTrend,
            runway: insights.runway,
            recurringExpenses: Math.round(insights.recurringExpenses * 100),
            insights: insights.insights,
          };
        } catch (error) {
          console.error("[Plaid API] Error generating insights:", error);
          // Don't fail the request if insights fail
        }
      }
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error("[Plaid API] Error fetching accounts:", error);

    return NextResponse.json(
      { error: "Failed to fetch bank accounts" },
      { status: 500 }
    );
  }
}

// POST - Sync bank account data
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user?.organizationId) {
      return NextResponse.json(
        { error: "No organization found" },
        { status: 400 }
      );
    }

    const config = getPlaidConfig();

    if (!config) {
      return NextResponse.json(
        { error: "Bank integration is not configured" },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { itemId } = body;

    // Get the Plaid item to sync
    const plaidItem = await prisma.plaidItem.findFirst({
      where: {
        organizationId: user.organizationId,
        ...(itemId ? { id: itemId } : {}),
        status: "active",
      },
    });

    if (!plaidItem) {
      return NextResponse.json(
        { error: "No bank connection found" },
        { status: 404 }
      );
    }

    // Refresh account balances
    const accounts = await getAccountBalances(config, plaidItem.accessToken);

    let updatedCount = 0;

    for (const account of accounts) {
      await prisma.bankAccount.updateMany({
        where: {
          organizationId: user.organizationId,
          plaidAccountId: account.accountId,
        },
        data: {
          availableBalance: account.balances.available
            ? Math.round(account.balances.available * 100)
            : null,
          currentBalance: Math.round(account.balances.current * 100),
          limitAmount: account.balances.limit
            ? Math.round(account.balances.limit * 100)
            : null,
          lastSynced: new Date(),
        },
      });
      updatedCount++;
    }

    // Update Plaid item sync timestamp
    await prisma.plaidItem.update({
      where: { id: plaidItem.id },
      data: { lastSynced: new Date() },
    });

    // Fetch and store recent transactions
    const endDate = new Date().toISOString().split("T")[0];
    const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];

    const transactions = await getTransactions(
      config,
      plaidItem.accessToken,
      startDate,
      endDate
    );

    let transactionCount = 0;

    for (const tx of transactions) {
      try {
        await prisma.bankTransaction.upsert({
          where: {
            organizationId_plaidTransactionId: {
              organizationId: user.organizationId,
              plaidTransactionId: tx.transactionId,
            },
          },
          update: {
            amount: Math.round(tx.amount * 100),
            date: new Date(tx.date),
            name: tx.name,
            merchantName: tx.merchantName,
            category: tx.category,
            pending: tx.pending,
            paymentChannel: tx.paymentChannel,
          },
          create: {
            organizationId: user.organizationId,
            plaidTransactionId: tx.transactionId,
            plaidAccountId: tx.accountId,
            amount: Math.round(tx.amount * 100),
            date: new Date(tx.date),
            name: tx.name,
            merchantName: tx.merchantName,
            category: tx.category,
            pending: tx.pending,
            paymentChannel: tx.paymentChannel,
          },
        });
        transactionCount++;
      } catch {
        // Skip duplicate errors
      }
    }

    return NextResponse.json({
      success: true,
      synced: {
        accounts: updatedCount,
        transactions: transactionCount,
      },
      lastSynced: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Plaid API] Error syncing accounts:", error);

    return NextResponse.json(
      { error: "Failed to sync bank accounts" },
      { status: 500 }
    );
  }
}
