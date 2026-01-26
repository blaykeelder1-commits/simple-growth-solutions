// Unified Platform Context Builder
// Aggregates data from CashFlow AI, Business Chauffeur, and all integrations
// Provides a single source of truth for the AI assistant

import { prisma } from "@/lib/prisma";
import { calculateHealthScore, forecastInflow } from "@/lib/cashflow/forecast";
import { getRiskLevel } from "@/lib/cashflow/scoring";
import { generateHealthAssessment } from "@/lib/ai/unified-insights";
import type { CrossSystemData } from "@/lib/insights/cross-system";

// Platform subscription types
export type PlatformSubscription =
  | "free_website"
  | "website_management"
  | "cashflow_ai"
  | "business_chauffeur"
  | "cybersecurity";

export interface OrganizationPlatforms {
  organizationId: string;
  activePlatforms: PlatformSubscription[];
  subscriptionStatus: "active" | "trial" | "expired" | "none";
}

// Unified context for AI conversations
export interface UnifiedPlatformContext {
  organization: {
    id: string;
    name: string;
    industry?: string;
    activePlatforms: PlatformSubscription[];
  };

  // CashFlow AI Context
  cashFlowAI?: {
    healthScore: number;
    totalReceivables: number;
    overdueReceivables: number;
    collectedThisMonth: number;
    forecast30d: number;
    forecast60d: number;
    forecast90d: number;
    runwayDays: number | null;
    topOverdueClients: {
      name: string;
      outstanding: number;
      daysOverdue: number;
      riskLevel: string;
    }[];
    recentPayments: {
      clientName: string;
      amount: number;
      date: string;
    }[];
    pendingRecommendations: {
      type: string;
      title: string;
      priority: string;
      clientName?: string;
    }[];
    clientCount: number;
    invoiceCount: number;
    avgDaysToPayment: number;
  };

  // Business Chauffeur Context
  businessChauffeur?: {
    overallHealthScore: number;
    scoreBreakdown: {
      category: string;
      score: number;
      insight: string;
    }[];
    integrations: {
      name: string;
      status: "connected" | "disconnected" | "error";
      lastSync?: string;
    }[];
    // POS Data
    pos?: {
      provider: string;
      dailySales: number;
      weekSales: number;
      monthSales: number;
      avgTicket: number;
      transactionCount: number;
      growthRate: number;
    };
    // Payroll Data
    payroll?: {
      provider: string;
      totalPayroll: number;
      employeeCount: number;
      overtimeHours: number;
      payrollAsPercentOfRevenue: number;
    };
    // Reviews Data
    reviews?: {
      avgRating: number;
      reviewCount: number;
      recentTrend: "improving" | "stable" | "declining";
    };
    // Cross-system insights
    topInsights: {
      category: string;
      title: string;
      description: string;
      impact: string;
    }[];
  };

  // Bank/Financial Data (Plaid)
  bankData?: {
    connectedAccounts: number;
    totalBalance: number;
    availableBalance: number;
    recentTransactions: {
      description: string;
      amount: number;
      date: string;
      category: string;
    }[];
    monthlyIncome: number;
    monthlyExpenses: number;
    netCashFlowTrend: "positive" | "neutral" | "negative";
    runway: {
      days: number;
      riskLevel: string;
    };
    insights: string[];
  };

  // Metadata
  lastUpdated: string;
  dataQuality: "high" | "medium" | "low";
}

// Get active platforms for an organization
export async function getOrganizationPlatforms(
  organizationId: string
): Promise<OrganizationPlatforms> {
  // In production, this would check subscription records
  // For now, we'll check what data exists to infer active platforms

  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    include: {
      _count: {
        select: {
          clients: true,
          invoices: true,
          integrations: true,
          employees: true,
        },
      },
    },
  });

  if (!org) {
    return {
      organizationId,
      activePlatforms: [],
      subscriptionStatus: "none",
    };
  }

  const activePlatforms: PlatformSubscription[] = ["free_website"];

  // Check for CashFlow AI usage (has clients/invoices)
  if (org._count.clients > 0 || org._count.invoices > 0) {
    activePlatforms.push("cashflow_ai");
  }

  // Check for Business Chauffeur usage (has integrations or employees)
  if (org._count.integrations > 0 || org._count.employees > 0) {
    activePlatforms.push("business_chauffeur");
  }

  return {
    organizationId,
    activePlatforms,
    subscriptionStatus: "active", // Would check actual subscription
  };
}

// Build CashFlow AI context
async function buildCashFlowContext(
  organizationId: string
): Promise<UnifiedPlatformContext["cashFlowAI"] | undefined> {
  try {
    // Get invoice statistics
    const invoices = await prisma.invoice.findMany({
      where: { organizationId },
      include: { client: true },
      orderBy: { createdAt: "desc" },
    });

    if (invoices.length === 0) {
      return undefined;
    }

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Calculate totals
    const unpaidInvoices = invoices.filter(inv =>
      inv.status !== "paid" && inv.status !== "written_off"
    );

    const totalReceivables = unpaidInvoices.reduce(
      (sum, inv) => sum + (Number(inv.amount) - Number(inv.amountPaid)), 0
    );

    const overdueInvoices = unpaidInvoices.filter(inv =>
      inv.dueDate && new Date(inv.dueDate) < now
    );

    const overdueReceivables = overdueInvoices.reduce(
      (sum, inv) => sum + (Number(inv.amount) - Number(inv.amountPaid)), 0
    );

    // Get recent payments
    const payments = await prisma.payment.findMany({
      where: {
        invoice: { organizationId },
        paidAt: { gte: startOfMonth },
      },
      include: {
        client: true,
        invoice: true,
      },
      orderBy: { paidAt: "desc" },
      take: 5,
    });

    const collectedThisMonth = payments.reduce((sum, p) => sum + Number(p.amount), 0);

    // Map invoices to forecast format
    const mappedInvoices = unpaidInvoices.map(inv => ({
      id: inv.id,
      amount: Number(inv.amount),
      amountPaid: Number(inv.amountPaid),
      dueDate: inv.dueDate,
      status: inv.status,
      recoveryLikelihood: inv.recoveryLikelihood ? Number(inv.recoveryLikelihood) : null,
    }));

    // Calculate forecasts
    const forecast30 = forecastInflow(mappedInvoices, 30);
    const forecast60 = forecastInflow(mappedInvoices, 60);
    const forecast90 = forecastInflow(mappedInvoices, 90);

    // Get client stats
    const clients = await prisma.client.findMany({
      where: { organizationId },
      include: {
        _count: { select: { invoices: true } },
      },
    });

    // Calculate average days to payment
    const paidInvoices = invoices.filter(inv => inv.paidDate && inv.dueDate);
    const avgDaysToPayment = paidInvoices.length > 0
      ? paidInvoices.reduce((sum, inv) => {
          const days = Math.floor(
            (new Date(inv.paidDate!).getTime() - new Date(inv.dueDate!).getTime()) /
            (1000 * 60 * 60 * 24)
          );
          return sum + days;
        }, 0) / paidInvoices.length
      : 0;

    // Calculate health score
    const healthScore = calculateHealthScore(
      totalReceivables,
      overdueReceivables,
      Math.abs(avgDaysToPayment),
      forecast30.total
    );

    // Get top overdue clients
    const overdueByClient = new Map<string, { name: string; outstanding: number; maxDaysOverdue: number; score: number }>();
    overdueInvoices.forEach(inv => {
      const clientId = inv.clientId;
      if (!clientId) return;
      const clientName = inv.client?.name || "Unknown";
      const outstanding = Number(inv.amount) - Number(inv.amountPaid);
      const daysOverdue = inv.dueDate
        ? Math.floor((now.getTime() - new Date(inv.dueDate).getTime()) / (1000 * 60 * 60 * 24))
        : 0;

      if (overdueByClient.has(clientId)) {
        const existing = overdueByClient.get(clientId)!;
        existing.outstanding += outstanding;
        existing.maxDaysOverdue = Math.max(existing.maxDaysOverdue, daysOverdue);
      } else {
        overdueByClient.set(clientId, {
          name: clientName,
          outstanding,
          maxDaysOverdue: daysOverdue,
          score: inv.client?.paymentScore || 50,
        });
      }
    });

    const topOverdueClients = Array.from(overdueByClient.values())
      .sort((a, b) => b.outstanding - a.outstanding)
      .slice(0, 5)
      .map(c => ({
        name: c.name,
        outstanding: c.outstanding,
        daysOverdue: c.maxDaysOverdue,
        riskLevel: getRiskLevel(c.score),
      }));

    // Get pending recommendations
    const recommendations = await prisma.aIRecommendation.findMany({
      where: {
        organizationId,
        status: "pending",
      },
      include: { client: true },
      orderBy: { createdAt: "desc" },
      take: 5,
    });

    return {
      healthScore,
      totalReceivables,
      overdueReceivables,
      collectedThisMonth,
      forecast30d: forecast30.total,
      forecast60d: forecast60.total,
      forecast90d: forecast90.total,
      runwayDays: null, // Would need cash on hand data from Plaid
      topOverdueClients,
      recentPayments: payments.map(p => ({
        clientName: p.client?.name || "Unknown",
        amount: Number(p.amount),
        date: p.paidAt.toISOString(),
      })),
      pendingRecommendations: recommendations.map(r => ({
        type: r.type,
        title: r.title,
        priority: r.priority,
        clientName: r.client?.name,
      })),
      clientCount: clients.length,
      invoiceCount: invoices.length,
      avgDaysToPayment: Math.round(avgDaysToPayment),
    };
  } catch (error) {
    console.error("[Platform Context] Error building CashFlow context:", error);
    return undefined;
  }
}

// Build Business Chauffeur context
async function buildBusinessChauffeurContext(
  organizationId: string
): Promise<UnifiedPlatformContext["businessChauffeur"] | undefined> {
  try {
    // Get integrations
    const integrations = await prisma.integration.findMany({
      where: { organizationId },
    });

    // Get payroll data
    const _employees = await prisma.employee.findMany({
      where: { organizationId, status: "active" },
    });

    const latestPayroll = await prisma.payrollSnapshot.findFirst({
      where: { organizationId },
      orderBy: { periodEnd: "desc" },
    });

    // Build cross-system data for insights
    const crossSystemData: CrossSystemData = {};

    // Add payroll data if available
    if (latestPayroll) {
      crossSystemData.payroll = {
        totalPayroll: Number(latestPayroll.totalGrossPay),
        employeeCount: latestPayroll.employeeCount,
        overtimeHours: latestPayroll.totalOvertimeCost
          ? Math.round(Number(latestPayroll.totalOvertimeCost) / 2500) // Estimate hours from cost
          : 0,
        payrollGrowth: 0, // Would need historical data
      };
    }

    // Check for POS integrations
    const posIntegration = integrations.find(i =>
      ["square", "clover", "toast"].includes(i.provider)
    );

    // Check for review integrations
    const reviewIntegration = integrations.find(i =>
      ["google_business", "yelp"].includes(i.provider)
    );

    // Generate health assessment
    const healthAssessment = generateHealthAssessment(crossSystemData);

    // Build POS context (sample data for now - would come from integration sync)
    let posContext;
    if (posIntegration?.status === "connected") {
      posContext = {
        provider: posIntegration.provider,
        dailySales: 0,
        weekSales: 0,
        monthSales: 0,
        avgTicket: 0,
        transactionCount: 0,
        growthRate: 0,
      };
    }

    // Build payroll context
    let payrollContext;
    if (latestPayroll) {
      payrollContext = {
        provider: "manual", // or "gusto" if connected
        totalPayroll: Number(latestPayroll.totalGrossPay),
        employeeCount: latestPayroll.employeeCount,
        overtimeHours: Math.round(Number(latestPayroll.totalOvertimeCost || 0) / 2500),
        payrollAsPercentOfRevenue: 0, // Would need revenue data
      };
    }

    return {
      overallHealthScore: healthAssessment.overallScore,
      scoreBreakdown: healthAssessment.scoreBreakdown.map(s => ({
        category: s.category,
        score: s.score,
        insight: s.insight,
      })),
      integrations: integrations.map(i => ({
        name: i.provider,
        status: i.status as "connected" | "disconnected" | "error",
        lastSync: i.lastSyncAt?.toISOString(),
      })),
      pos: posContext,
      payroll: payrollContext,
      reviews: reviewIntegration?.status === "connected"
        ? { avgRating: 0, reviewCount: 0, recentTrend: "stable" as const }
        : undefined,
      topInsights: healthAssessment.topPriorities.map((p, i) => ({
        category: "priority",
        title: `Priority ${i + 1}`,
        description: p,
        impact: "medium",
      })),
    };
  } catch (error) {
    console.error("[Platform Context] Error building Business Chauffeur context:", error);
    return undefined;
  }
}

// Build bank data context from Plaid
async function buildBankDataContext(
  organizationId: string
): Promise<UnifiedPlatformContext["bankData"] | undefined> {
  try {
    // Check if there are any connected bank accounts
    const bankAccounts = await prisma.bankAccount.findMany({
      where: { organizationId, isHidden: false },
      orderBy: { currentBalance: "desc" },
    });

    if (bankAccounts.length === 0) {
      return undefined;
    }

    // Calculate totals
    const totalBalance = bankAccounts.reduce(
      (sum, acc) => sum + acc.currentBalance, 0
    );
    const availableBalance = bankAccounts.reduce(
      (sum, acc) => sum + (acc.availableBalance || acc.currentBalance), 0
    );

    // Get recent transactions (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const transactions = await prisma.bankTransaction.findMany({
      where: {
        organizationId,
        date: { gte: thirtyDaysAgo },
        isExcluded: false,
      },
      orderBy: { date: "desc" },
      take: 100,
    });

    // Calculate monthly income/expenses
    // In Plaid convention: positive = money out (expense), negative = money in (income)
    const income = transactions
      .filter(tx => tx.amount < 0)
      .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
    const expenses = transactions
      .filter(tx => tx.amount > 0)
      .reduce((sum, tx) => sum + tx.amount, 0);

    // Determine cash flow trend
    const firstHalf = transactions.slice(Math.floor(transactions.length / 2));
    const secondHalf = transactions.slice(0, Math.floor(transactions.length / 2));

    const firstHalfNet = firstHalf.reduce((sum, tx) => sum - tx.amount, 0);
    const secondHalfNet = secondHalf.reduce((sum, tx) => sum - tx.amount, 0);

    let trend: "positive" | "neutral" | "negative" = "neutral";
    if (secondHalfNet > firstHalfNet * 1.1) trend = "positive";
    else if (secondHalfNet < firstHalfNet * 0.9) trend = "negative";

    // Calculate runway
    const avgMonthlyExpenses = expenses > 0 ? expenses : 1;
    const runwayMonths = totalBalance / avgMonthlyExpenses;
    const runwayDays = Math.round(runwayMonths * 30);

    let riskLevel = "healthy";
    if (runwayMonths < 1) riskLevel = "critical";
    else if (runwayMonths < 3) riskLevel = "warning";
    else if (runwayMonths < 6) riskLevel = "caution";

    // Generate insights
    const insights: string[] = [];

    if (riskLevel === "critical") {
      insights.push("Cash reserves appear low relative to monthly expenses.");
    }

    if (expenses > income) {
      insights.push(`Monthly expenses ($${(expenses / 100).toLocaleString()}) appear to exceed income ($${(income / 100).toLocaleString()}).`);
    }

    if (trend === "positive") {
      insights.push("Cash flow trend appears positive over the past month.");
    }

    return {
      connectedAccounts: bankAccounts.length,
      totalBalance,
      availableBalance,
      recentTransactions: transactions.slice(0, 10).map(tx => ({
        description: tx.merchantName || tx.name,
        amount: tx.amount,
        date: tx.date.toISOString(),
        category: tx.customCategory || tx.category[0] || "Uncategorized",
      })),
      monthlyIncome: income,
      monthlyExpenses: expenses,
      netCashFlowTrend: trend,
      runway: {
        days: runwayDays,
        riskLevel,
      },
      insights,
    };
  } catch (error) {
    console.error("[Platform Context] Error building bank data context:", error);
    return undefined;
  }
}

// Build complete unified context
export async function buildUnifiedContext(
  organizationId: string
): Promise<UnifiedPlatformContext | null> {
  try {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!org) {
      return null;
    }

    const platforms = await getOrganizationPlatforms(organizationId);

    // Build contexts in parallel for active platforms
    const [cashFlowContext, chauffeurContext, bankContext] = await Promise.all([
      platforms.activePlatforms.includes("cashflow_ai")
        ? buildCashFlowContext(organizationId)
        : Promise.resolve(undefined),
      platforms.activePlatforms.includes("business_chauffeur")
        ? buildBusinessChauffeurContext(organizationId)
        : Promise.resolve(undefined),
      buildBankDataContext(organizationId),
    ]);

    // Determine data quality
    let dataQuality: "high" | "medium" | "low" = "low";
    const hasData = cashFlowContext || chauffeurContext;
    const hasIntegrations = chauffeurContext?.integrations?.some(i => i.status === "connected");
    const hasBankData = !!bankContext;

    if (hasData && (hasIntegrations || hasBankData)) {
      dataQuality = "high";
    } else if (hasData || hasBankData) {
      dataQuality = "medium";
    }

    return {
      organization: {
        id: org.id,
        name: org.name,
        industry: undefined, // Would come from org profile
        activePlatforms: platforms.activePlatforms,
      },
      cashFlowAI: cashFlowContext,
      businessChauffeur: chauffeurContext,
      bankData: bankContext,
      lastUpdated: new Date().toISOString(),
      dataQuality,
    };
  } catch (error) {
    console.error("[Platform Context] Error building unified context:", error);
    return null;
  }
}

// Format context as a text summary for AI prompts
export function formatContextForAI(context: UnifiedPlatformContext): string {
  const lines: string[] = [];

  lines.push(`## Business Overview`);
  lines.push(`Organization: ${context.organization.name}`);
  lines.push(`Active Platforms: ${context.organization.activePlatforms.join(", ")}`);
  lines.push(`Data Quality: ${context.dataQuality}`);
  lines.push("");

  if (context.cashFlowAI) {
    const cf = context.cashFlowAI;
    lines.push(`## CashFlow AI (Accounts Receivable)`);
    lines.push(`- Health Score: ${cf.healthScore}/100`);
    lines.push(`- Total Receivables: $${(cf.totalReceivables / 100).toLocaleString()}`);
    lines.push(`- Overdue Amount: $${(cf.overdueReceivables / 100).toLocaleString()}`);
    lines.push(`- Collected This Month: $${(cf.collectedThisMonth / 100).toLocaleString()}`);
    lines.push(`- 30-Day Forecast: $${(cf.forecast30d / 100).toLocaleString()}`);
    lines.push(`- Clients: ${cf.clientCount} | Invoices: ${cf.invoiceCount}`);
    lines.push(`- Avg Days to Payment: ${cf.avgDaysToPayment} days`);

    if (cf.topOverdueClients.length > 0) {
      lines.push(`\nTop Overdue Clients:`);
      cf.topOverdueClients.forEach(c => {
        lines.push(`  - ${c.name}: $${(c.outstanding / 100).toLocaleString()} (${c.daysOverdue} days overdue, ${c.riskLevel} risk)`);
      });
    }

    if (cf.pendingRecommendations.length > 0) {
      lines.push(`\nPending AI Recommendations:`);
      cf.pendingRecommendations.forEach(r => {
        lines.push(`  - [${r.priority}] ${r.title}${r.clientName ? ` for ${r.clientName}` : ""}`);
      });
    }
    lines.push("");
  }

  if (context.businessChauffeur) {
    const bc = context.businessChauffeur;
    lines.push(`## Business Chauffeur (Operations Intelligence)`);
    lines.push(`- Overall Health Score: ${bc.overallHealthScore}/100`);

    lines.push(`\nHealth Breakdown:`);
    bc.scoreBreakdown.forEach(s => {
      lines.push(`  - ${s.category}: ${s.score}/100 - ${s.insight}`);
    });

    const connectedIntegrations = bc.integrations.filter(i => i.status === "connected");
    if (connectedIntegrations.length > 0) {
      lines.push(`\nConnected Integrations: ${connectedIntegrations.map(i => i.name).join(", ")}`);
    }

    if (bc.payroll) {
      lines.push(`\nPayroll Data:`);
      lines.push(`  - Total Payroll: $${(bc.payroll.totalPayroll / 100).toLocaleString()}`);
      lines.push(`  - Employees: ${bc.payroll.employeeCount}`);
      lines.push(`  - Overtime Hours: ${bc.payroll.overtimeHours}`);
    }

    if (bc.pos) {
      lines.push(`\nPOS Data (${bc.pos.provider}):`);
      lines.push(`  - Daily Sales: $${(bc.pos.dailySales / 100).toLocaleString()}`);
      lines.push(`  - Monthly Sales: $${(bc.pos.monthSales / 100).toLocaleString()}`);
      lines.push(`  - Avg Ticket: $${(bc.pos.avgTicket / 100).toLocaleString()}`);
    }

    if (bc.topInsights.length > 0) {
      lines.push(`\nTop Insights:`);
      bc.topInsights.forEach(i => {
        lines.push(`  - ${i.description}`);
      });
    }
    lines.push("");
  }

  if (context.bankData) {
    const bd = context.bankData;
    lines.push(`## Bank Account Data (Plaid)`);
    lines.push(`- Connected Accounts: ${bd.connectedAccounts}`);
    lines.push(`- Total Balance: $${(bd.totalBalance / 100).toLocaleString()}`);
    lines.push(`- Available Balance: $${(bd.availableBalance / 100).toLocaleString()}`);
    lines.push(`- Monthly Income: $${(bd.monthlyIncome / 100).toLocaleString()}`);
    lines.push(`- Monthly Expenses: $${(bd.monthlyExpenses / 100).toLocaleString()}`);
    lines.push(`- Net Cash Flow Trend: ${bd.netCashFlowTrend}`);
    lines.push(`- Cash Runway: ${bd.runway.days} days (${bd.runway.riskLevel})`);

    if (bd.insights.length > 0) {
      lines.push(`\nBank Insights:`);
      bd.insights.forEach(insight => {
        lines.push(`  - ${insight}`);
      });
    }

    if (bd.recentTransactions.length > 0) {
      lines.push(`\nRecent Transactions:`);
      bd.recentTransactions.slice(0, 5).forEach(tx => {
        const sign = tx.amount > 0 ? "-" : "+";
        lines.push(`  - ${tx.description}: ${sign}$${(Math.abs(tx.amount) / 100).toLocaleString()} (${tx.category})`);
      });
    }
    lines.push("");
  }

  return lines.join("\n");
}
