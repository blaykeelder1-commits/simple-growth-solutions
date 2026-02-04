// AR Engine Analyzer
// Scans business data, identifies issues, predicts cash squeezes

import { prisma } from '@/lib/db/prisma';
import { getRiskLevel, calculateRecoveryLikelihood, predictPaymentDate } from '@/lib/cashflow/scoring';
import {
  InvoiceAnalysis,
  CashSqueezeAlert,
  CashSqueezeRecommendation,
  RecommendedAction,
  SpendingPattern,
  IncentiveOffer,
  DEFAULT_AR_CONFIG,
  AREngineConfig,
} from './types';

// Analyze all outstanding invoices for an organization
export async function analyzeInvoices(
  organizationId: string,
  config: AREngineConfig = DEFAULT_AR_CONFIG
): Promise<InvoiceAnalysis[]> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Fetch all unpaid invoices with client data
  const invoices = await prisma.invoice.findMany({
    where: {
      organizationId,
      status: { in: ['sent', 'viewed', 'partial', 'overdue'] },
    },
    include: {
      client: true,
      payments: true,
      followUpActions: {
        orderBy: { actionDate: 'desc' },
        take: 5,
      },
    },
  });

  const analyses: InvoiceAnalysis[] = [];

  for (const invoice of invoices) {
    const dueDate = new Date(invoice.dueDate);
    const daysDiff = Math.floor((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    const daysOverdue = daysDiff < 0 ? Math.abs(daysDiff) : 0;
    const daysToDue = daysDiff;

    const amount = Number(invoice.amount) * 100; // Convert to cents
    const amountPaid = Number(invoice.amountPaid) * 100;
    const amountDue = amount - amountPaid;

    // Get client info
    const client = invoice.client;
    const clientPaymentScore = client?.paymentScore || 50;
    const clientAvgDays = Number(client?.avgDaysToPayment) || 30;

    // Calculate risk and recovery likelihood
    const riskLevel = getRiskLevel(clientPaymentScore);
    const recoveryLikelihood = calculateRecoveryLikelihood(
      { amount: amountDue, dueDate, daysPastDue: daysOverdue },
      clientPaymentScore
    );

    // Predict payment date
    const predictedPaymentDate = predictPaymentDate(dueDate, clientAvgDays, clientPaymentScore);

    // Calculate urgency score (0-100)
    let urgencyScore = 0;
    if (daysOverdue > 0) {
      urgencyScore = Math.min(100, 40 + daysOverdue * 2);
    } else if (daysToDue <= 7) {
      urgencyScore = 30 - daysToDue * 4;
    }
    // Adjust for amount
    if (amountDue > 500000) urgencyScore = Math.min(100, urgencyScore + 20); // >$5k
    if (amountDue > 1000000) urgencyScore = Math.min(100, urgencyScore + 10); // >$10k
    // Adjust for client risk
    if (riskLevel === 'high') urgencyScore = Math.min(100, urgencyScore + 15);
    if (riskLevel === 'critical') urgencyScore = Math.min(100, urgencyScore + 25);

    // Generate recommended actions
    const recommendedActions = generateRecommendedActions(
      {
        daysOverdue,
        daysToDue,
        amountDue,
        clientPaymentScore,
        clientEmail: client?.email || null,
        clientPhone: client?.phone || null,
        clientBestContactDay: client?.bestContactDay || null,
        clientBestContactHour: client?.bestContactHour || null,
        lastContactDate: invoice.followUpActions[0]?.actionDate || null,
      },
      config
    );

    analyses.push({
      invoiceId: invoice.id,
      clientId: client?.id || '',
      clientName: client?.name || 'Unknown',
      clientEmail: client?.email || null,
      clientPhone: client?.phone || null,
      amount,
      amountPaid,
      amountDue,
      dueDate,
      daysOverdue,
      daysToDue,
      riskLevel,
      recoveryLikelihood,
      predictedPaymentDate,
      clientPaymentScore,
      clientAvgDaysToPayment: clientAvgDays,
      clientPreferredPaymentMethod: client?.preferredPaymentMethod || null,
      clientBestContactDay: client?.bestContactDay || null,
      clientBestContactHour: client?.bestContactHour || null,
      recommendedActions,
      urgencyScore,
    });
  }

  // Sort by urgency
  return analyses.sort((a, b) => b.urgencyScore - a.urgencyScore);
}

// Generate recommended actions for an invoice
function generateRecommendedActions(
  data: {
    daysOverdue: number;
    daysToDue: number;
    amountDue: number;
    clientPaymentScore: number;
    clientEmail: string | null;
    clientPhone: string | null;
    clientBestContactDay: string | null;
    clientBestContactHour: number | null;
    lastContactDate: Date | null;
  },
  config: AREngineConfig
): RecommendedAction[] {
  const actions: RecommendedAction[] = [];
  const today = new Date();

  // Calculate next contact date (respect min days between contacts)
  let nextContactDate = new Date();
  if (data.lastContactDate) {
    const daysSinceContact = Math.floor(
      (today.getTime() - data.lastContactDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysSinceContact < config.minDaysBetweenContacts) {
      nextContactDate = new Date(data.lastContactDate);
      nextContactDate.setDate(nextContactDate.getDate() + config.minDaysBetweenContacts);
    }
  }

  // Adjust for best contact day/hour if known
  if (data.clientBestContactDay) {
    const dayMap: Record<string, number> = {
      sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
      thursday: 4, friday: 5, saturday: 6,
    };
    const targetDay = dayMap[data.clientBestContactDay.toLowerCase()];
    if (targetDay !== undefined) {
      while (nextContactDate.getDay() !== targetDay) {
        nextContactDate.setDate(nextContactDate.getDate() + 1);
      }
    }
  }
  if (data.clientBestContactHour) {
    nextContactDate.setHours(data.clientBestContactHour, 0, 0, 0);
  }

  // Strategy based on status
  if (data.daysOverdue === 0 && data.daysToDue <= 3) {
    // Approaching due date - friendly reminder
    if (data.clientEmail) {
      actions.push({
        type: 'email',
        priority: 6,
        scheduledFor: nextContactDate,
        message: 'Friendly reminder that payment is approaching',
        reasoning: 'Proactive reminder before due date increases on-time payment',
        expectedResponseRate: 0.25,
      });
    }
  } else if (data.daysOverdue > 0 && data.daysOverdue <= 7) {
    // Just overdue - friendly follow-up with payment link
    if (data.clientEmail) {
      actions.push({
        type: 'email',
        priority: 7,
        scheduledFor: nextContactDate,
        message: 'Friendly reminder with easy payment link',
        reasoning: 'Early-stage overdue invoices respond well to convenience',
        expectedResponseRate: 0.35,
      });
      actions.push({
        type: 'payment_link',
        priority: 8,
        scheduledFor: nextContactDate,
        message: 'Include one-click payment link',
        reasoning: 'Reduces friction - customers can pay immediately',
        expectedResponseRate: 0.40,
      });
    }
  } else if (data.daysOverdue > 7 && data.daysOverdue <= 21) {
    // 1-3 weeks overdue - offer incentive
    const discountPercent = Math.min(5, config.maxDiscountPercent);
    const incentive: IncentiveOffer = {
      type: 'early_pay_discount',
      discountPercent,
      discountAmount: Math.round(data.amountDue * (discountPercent / 100)),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      reason: 'Incentivize quick payment on moderately overdue invoice',
    };

    if (data.clientEmail) {
      actions.push({
        type: 'discount_offer',
        priority: 8,
        scheduledFor: nextContactDate,
        message: `Offer ${discountPercent}% discount for payment within 7 days`,
        incentive,
        reasoning: 'Discount incentive effective for 2-3 week overdue invoices',
        expectedResponseRate: 0.30,
      });
    }
    if (data.clientPhone) {
      const smsDate = new Date(nextContactDate);
      smsDate.setDate(smsDate.getDate() + 2);
      actions.push({
        type: 'sms',
        priority: 7,
        scheduledFor: smsDate,
        message: 'SMS follow-up with payment link',
        reasoning: 'SMS has higher open rate for follow-up',
        expectedResponseRate: 0.45,
      });
    }
  } else if (data.daysOverdue > 21 && data.daysOverdue <= 45) {
    // 3-6 weeks overdue - offer payment plan
    const monthlyAmount = Math.round(data.amountDue / 3);
    const incentive: IncentiveOffer = {
      type: 'payment_plan',
      paymentPlanMonths: 3,
      paymentPlanAmount: monthlyAmount,
      expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days
      reason: 'Payment plan for significantly overdue invoice',
    };

    if (data.clientEmail) {
      actions.push({
        type: 'payment_plan',
        priority: 9,
        scheduledFor: nextContactDate,
        message: 'Offer flexible payment plan option',
        incentive,
        reasoning: 'Payment plans increase recovery on long-overdue invoices',
        expectedResponseRate: 0.25,
      });
    }
    actions.push({
      type: 'call',
      priority: 8,
      scheduledFor: nextContactDate,
      message: 'Personal call to discuss payment options',
      reasoning: 'Phone calls show commitment and build rapport',
      expectedResponseRate: 0.35,
    });
  } else if (data.daysOverdue > 45) {
    // Very overdue - escalation path
    actions.push({
      type: 'call',
      priority: 10,
      scheduledFor: nextContactDate,
      message: 'Priority call to resolve outstanding balance',
      reasoning: 'Direct contact essential for significantly overdue invoices',
      expectedResponseRate: 0.20,
    });

    // Offer larger discount for immediate resolution
    const discountPercent = Math.min(10, config.maxDiscountPercent);
    const incentive: IncentiveOffer = {
      type: 'early_pay_discount',
      discountPercent,
      discountAmount: Math.round(data.amountDue * (discountPercent / 100)),
      expiresAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days
      reason: 'Final opportunity discount for immediate payment',
    };

    if (data.clientEmail) {
      actions.push({
        type: 'discount_offer',
        priority: 9,
        scheduledFor: nextContactDate,
        message: `Final offer: ${discountPercent}% discount for payment within 5 days`,
        incentive,
        reasoning: 'Larger discount for very overdue invoices can trigger action',
        expectedResponseRate: 0.15,
      });
    }
  }

  return actions.sort((a, b) => b.priority - a.priority);
}

// Detect cash squeeze situations
export async function detectCashSqueezes(
  organizationId: string,
  config: AREngineConfig = DEFAULT_AR_CONFIG
): Promise<CashSqueezeAlert[]> {
  const alerts: CashSqueezeAlert[] = [];
  const today = new Date();
  const windowEnd = new Date(today);
  windowEnd.setDate(windowEnd.getDate() + config.cashSqueezeWindowDays);

  // Get upcoming invoice due dates
  const upcomingInvoices = await prisma.invoice.findMany({
    where: {
      organizationId,
      status: { in: ['sent', 'viewed', 'partial'] },
      dueDate: { gte: today, lte: windowEnd },
    },
    include: { client: true },
  });

  // Get spending patterns from bank transactions
  const recentTransactions = await prisma.bankTransaction.findMany({
    where: {
      organizationId,
      amount: { gt: 0 }, // Outgoing (positive = debit in Plaid)
      date: { gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) }, // Last 90 days
    },
  });

  // Calculate average monthly spending
  const totalSpending = recentTransactions.reduce((sum, t) => sum + t.amount, 0);
  const avgMonthlySpending = totalSpending / 3;
  const avgDailySpending = avgMonthlySpending / 30;

  // Get current bank balance
  const bankAccounts = await prisma.bankAccount.findMany({
    where: { organizationId, type: 'depository' },
  });
  const currentBalance = bankAccounts.reduce((sum, a) => sum + (a.currentBalance || 0), 0);

  // Check 1: Invoice clustering (multiple invoices due same day/week)
  const invoicesByDate: Record<string, typeof upcomingInvoices> = {};
  for (const inv of upcomingInvoices) {
    const dateKey = new Date(inv.dueDate).toISOString().split('T')[0];
    if (!invoicesByDate[dateKey]) invoicesByDate[dateKey] = [];
    invoicesByDate[dateKey].push(inv);
  }

  for (const [dateStr, invoices] of Object.entries(invoicesByDate)) {
    if (invoices.length >= 3) {
      const totalDue = invoices.reduce((sum, inv) => sum + Number(inv.amount) * 100, 0);
      const date = new Date(dateStr);

      // Calculate projected balance on that date
      const daysUntil = Math.floor((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      const projectedSpending = avgDailySpending * daysUntil;
      const projectedBalance = currentBalance - projectedSpending;

      // If relying on these invoices being paid would leave us short
      if (projectedBalance < avgDailySpending * config.minimumRunwayDays) {
        const recommendations: CashSqueezeRecommendation[] = [];

        // Recommend incentivizing early payment
        const earliestInvoices = invoices
          .sort((a, b) => Number(b.amount) - Number(a.amount))
          .slice(0, 3);

        recommendations.push({
          action: 'Incentivize early payment on largest invoices',
          potentialImpact: Math.round(totalDue * 0.7), // Assume 70% might pay early
          targetInvoices: earliestInvoices.map(i => i.id),
          incentiveType: 'early_pay_discount',
          discountPercent: 3,
          reasoning: `${invoices.length} invoices totaling $${(totalDue / 100).toFixed(2)} all due on ${dateStr}. Spreading payments reduces risk.`,
        });

        alerts.push({
          type: 'invoice_clustering',
          severity: projectedBalance < 0 ? 'critical' : 'warning',
          date,
          description: `${invoices.length} invoices totaling $${(totalDue / 100).toFixed(2)} are all due on ${dateStr}. If any are late, you could face a cash squeeze.`,
          projectedShortfall: Math.max(0, avgDailySpending * config.minimumRunwayDays - projectedBalance),
          recommendations,
        });
      }
    }
  }

  // Check 2: Revenue gap (no invoices due for extended period)
  const invoiceDates = Object.keys(invoicesByDate).sort();
  if (invoiceDates.length > 0) {
    let lastDate = today;
    for (const dateStr of invoiceDates) {
      const currentDate = new Date(dateStr);
      const gapDays = Math.floor((currentDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

      if (gapDays > 14) {
        const gapSpending = avgDailySpending * gapDays;

        alerts.push({
          type: 'revenue_gap',
          severity: gapDays > 21 ? 'critical' : 'warning',
          date: lastDate,
          description: `No invoice payments expected for ${gapDays} days (${lastDate.toLocaleDateString()} to ${currentDate.toLocaleDateString()}). Expected spending: $${(gapSpending / 100).toFixed(2)}`,
          projectedShortfall: gapSpending,
          recommendations: [
            {
              action: 'Accelerate billing for completed work',
              potentialImpact: gapSpending,
              reasoning: 'Send invoices earlier to fill the revenue gap',
            },
            {
              action: 'Request deposits on upcoming projects',
              potentialImpact: gapSpending * 0.5,
              incentiveType: 'deposit_request',
              reasoning: 'Deposits provide cash before work is complete',
            },
          ],
        });
      }
      lastDate = currentDate;
    }
  }

  // Check 3: Low runway
  const runwayDays = currentBalance / avgDailySpending;
  if (runwayDays < config.minimumRunwayDays) {
    // Find invoices that could be accelerated
    const acceleratableInvoices = upcomingInvoices
      .filter(inv => {
        const daysToDue = Math.floor((new Date(inv.dueDate).getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        return daysToDue > 3 && daysToDue <= 21;
      })
      .sort((a, b) => Number(b.amount) - Number(a.amount))
      .slice(0, 5);

    const acceleratableAmount = acceleratableInvoices.reduce((sum, inv) => sum + Number(inv.amount) * 100, 0);

    alerts.push({
      type: 'low_runway',
      severity: runwayDays < 7 ? 'critical' : 'warning',
      date: today,
      description: `Current runway is only ${Math.round(runwayDays)} days based on average spending of $${(avgDailySpending / 100).toFixed(2)}/day.`,
      projectedShortfall: avgDailySpending * (config.minimumRunwayDays - runwayDays),
      recommendations: [
        {
          action: 'Offer early payment discounts on upcoming invoices',
          potentialImpact: acceleratableAmount * 0.5,
          targetInvoices: acceleratableInvoices.map(i => i.id),
          incentiveType: 'early_pay_discount',
          discountPercent: 5,
          reasoning: `${acceleratableInvoices.length} invoices totaling $${(acceleratableAmount / 100).toFixed(2)} could be accelerated with incentives`,
        },
      ],
    });
  }

  return alerts.sort((a, b) => {
    // Sort by severity first, then by date
    if (a.severity !== b.severity) {
      return a.severity === 'critical' ? -1 : 1;
    }
    return a.date.getTime() - b.date.getTime();
  });
}

// Analyze spending patterns
export async function analyzeSpendingPatterns(organizationId: string): Promise<SpendingPattern[]> {
  const transactions = await prisma.bankTransaction.findMany({
    where: {
      organizationId,
      amount: { gt: 0 }, // Outgoing
      date: { gte: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000) }, // Last 6 months
    },
  });

  // Group by category and analyze patterns
  const categoryData: Record<string, {
    amounts: number[];
    dates: number[];
  }> = {};

  for (const tx of transactions) {
    const category = tx.customCategory || tx.category?.[0] || 'Other';
    if (!categoryData[category]) {
      categoryData[category] = { amounts: [], dates: [] };
    }
    categoryData[category].amounts.push(tx.amount);
    categoryData[category].dates.push(new Date(tx.date).getDate());
  }

  const patterns: SpendingPattern[] = [];

  for (const [category, data] of Object.entries(categoryData)) {
    const totalAmount = data.amounts.reduce((a, b) => a + b, 0);
    const avgMonthly = totalAmount / 6;

    // Check if recurring (appears multiple times at similar dates)
    const dateFrequency: Record<number, number> = {};
    for (const date of data.dates) {
      dateFrequency[date] = (dateFrequency[date] || 0) + 1;
    }
    const mostCommonDates = Object.entries(dateFrequency)
      .filter(([, count]) => count >= 3)
      .map(([date]) => parseInt(date));
    const isRecurring = mostCommonDates.length > 0;

    // Determine priority based on category
    let priority: SpendingPattern['priority'] = 'discretionary';
    const essentialCategories = ['rent', 'utilities', 'payroll', 'loan', 'insurance'];
    const importantCategories = ['software', 'services', 'marketing', 'supplies'];

    if (essentialCategories.some(c => category.toLowerCase().includes(c))) {
      priority = 'essential';
    } else if (importantCategories.some(c => category.toLowerCase().includes(c))) {
      priority = 'important';
    }

    patterns.push({
      category,
      avgMonthlyAmount: avgMonthly,
      typicalDayOfMonth: mostCommonDates,
      isRecurring,
      priority,
    });
  }

  return patterns.sort((a, b) => b.avgMonthlyAmount - a.avgMonthlyAmount);
}
