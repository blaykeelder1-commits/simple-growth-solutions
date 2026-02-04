// AR Engine Payment Monitor
// Watches for payments, tracks success fees, updates learning models

import { prisma } from '@/lib/db/prisma';
import { arEngineLogger as logger } from '@/lib/logger';
import { DEFAULT_AR_CONFIG } from './types';

interface PaymentEvent {
  invoiceId: string;
  amount: number; // in cents
  paymentDate: Date;
  paymentMethod?: string;
  source: 'quickbooks' | 'xero' | 'stripe' | 'plaid' | 'manual';
}

interface RecoveryAttribution {
  type: 'email' | 'sms' | 'call' | 'payment_link' | 'discount' | 'payment_plan' | 'organic';
  actionId?: string;
  confidence: number;
}

// Record a payment and calculate success fee
export async function recordPayment(event: PaymentEvent): Promise<{
  recoveryEventId: string;
  successFee: number;
  attribution: RecoveryAttribution;
}> {
  const invoice = await prisma.invoice.findUnique({
    where: { id: event.invoiceId },
    include: {
      client: true,
      followUpActions: {
        where: {
          status: 'completed',
          completedAt: {
            gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), // Last 14 days
          },
        },
        orderBy: { completedAt: 'desc' },
      },
    },
  });

  if (!invoice) {
    throw new Error(`Invoice ${event.invoiceId} not found`);
  }

  // Determine attribution - what led to this payment?
  const attribution = determineAttribution(invoice.followUpActions, event.amount);

  // Calculate success fee (8% of recovered amount for overdue invoices)
  const wasOverdue = invoice.daysOverdue > 0;
  const daysOverdueAtRecovery = invoice.daysOverdue;

  // Only charge success fee if we helped recover it
  let successFeePercent = 0;
  if (attribution.type !== 'organic' && wasOverdue) {
    // Tiered success fee based on how overdue
    if (daysOverdueAtRecovery > 90) {
      successFeePercent = 0.10; // 10% for 90+ days
    } else if (daysOverdueAtRecovery > 30) {
      successFeePercent = 0.08; // 8% for 30-90 days
    } else {
      successFeePercent = 0.05; // 5% for 1-30 days
    }
  }

  const successFee = Math.round(event.amount * successFeePercent);

  // Create recovery event
  const recoveryEvent = await prisma.recoveryEvent.create({
    data: {
      organizationId: invoice.organizationId,
      invoiceId: event.invoiceId,
      clientId: invoice.clientId,
      eventType: 'payment_received',
      invoiceAmount: invoice.amount,
      recoveredAmount: event.amount / 100, // Convert from cents to dollars for DB
      daysOverdue: daysOverdueAtRecovery,
      feePercentage: successFeePercent,
      platformFee: successFee / 100, // Convert from cents to dollars for DB
      attributedTo: attribution.type,
      followUpActionId: attribution.actionId,
      status: 'confirmed',
      confirmedAt: new Date(),
    },
  });

  // Update invoice status
  const newAmountPaid = Number(invoice.amountPaid) + (event.amount / 100);
  const invoiceAmount = Number(invoice.amount);
  const newStatus = newAmountPaid >= invoiceAmount ? 'paid' : 'partial';

  await prisma.invoice.update({
    where: { id: event.invoiceId },
    data: {
      amountPaid: newAmountPaid,
      status: newStatus,
      paidDate: newStatus === 'paid' ? event.paymentDate : null,
      daysOverdue: 0,
    },
  });

  // Update client payment metrics
  if (invoice.clientId) {
    await updateClientMetrics(invoice.clientId, event, invoice.dueDate);
  }

  // Update follow-up action if attributed
  if (attribution.actionId) {
    await prisma.followUpAction.update({
      where: { id: attribution.actionId },
      data: {
        ledToPayment: true,
        daysToPayment: Math.floor(
          (event.paymentDate.getTime() - new Date(invoice.followUpActions[0]?.completedAt || Date.now()).getTime()) /
          (1000 * 60 * 60 * 24)
        ),
        outcome: 'paid',
      },
    });
  }

  // Add to billing cycle
  await addToBillingCycle(invoice.organizationId, recoveryEvent.id, successFee);

  return {
    recoveryEventId: recoveryEvent.id,
    successFee,
    attribution,
  };
}

// Determine what action led to the payment
function determineAttribution(
  recentActions: { id: string; type: string; completedAt: Date | null }[],
  _paymentAmount: number
): RecoveryAttribution {
  if (recentActions.length === 0) {
    return { type: 'organic', confidence: 0.9 };
  }

  // Most recent action gets primary attribution
  const mostRecent = recentActions[0];
  const daysSinceAction = mostRecent.completedAt
    ? Math.floor((Date.now() - mostRecent.completedAt.getTime()) / (1000 * 60 * 60 * 24))
    : 999;

  // Confidence decreases with time
  let confidence = 1.0;
  if (daysSinceAction > 7) confidence = 0.7;
  if (daysSinceAction > 14) confidence = 0.4;

  // Map action type
  const typeMap: Record<string, RecoveryAttribution['type']> = {
    email: 'email',
    sms: 'sms',
    call: 'call',
    payment_link: 'payment_link',
    discount_offer: 'discount',
    payment_plan: 'payment_plan',
  };

  return {
    type: typeMap[mostRecent.type] || 'email',
    actionId: mostRecent.id,
    confidence,
  };
}

// Update client payment metrics after a payment
async function updateClientMetrics(
  clientId: string,
  event: PaymentEvent,
  _dueDate: Date
): Promise<void> {
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: {
      invoices: {
        where: { status: 'paid' },
        select: { dueDate: true, paidDate: true, amount: true },
      },
    },
  });

  if (!client) return;

  // Calculate new metrics
  const paidInvoices = client.invoices.filter(i => i.paidDate);
  const daysToPayment = paidInvoices.map(i => {
    const due = new Date(i.dueDate);
    const paid = new Date(i.paidDate!);
    return Math.floor((paid.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
  });

  const avgDays = daysToPayment.length > 0
    ? daysToPayment.reduce((a, b) => a + b, 0) / daysToPayment.length
    : 0;

  const onTimeCount = daysToPayment.filter(d => d <= 0).length;
  const onTimeRate = daysToPayment.length > 0 ? onTimeCount / daysToPayment.length : 0.5;

  // Calculate new payment score
  let score = 50;
  score += (onTimeRate - 0.5) * 60; // -30 to +30 based on on-time rate
  score -= Math.min(avgDays, 30) * 0.5; // Penalize for avg days late
  score = Math.max(0, Math.min(100, score));

  // Determine tier
  let tier = 'C';
  if (score >= 80) tier = 'A';
  else if (score >= 60) tier = 'B';
  else if (score < 40) tier = 'D';

  // Update client
  await prisma.client.update({
    where: { id: clientId },
    data: {
      paymentScore: Math.round(score),
      paymentBehaviorTier: tier,
      avgDaysToPayment: avgDays,
      totalPaid: { increment: event.amount / 100 },
    },
  });

  // Update communication effectiveness if there was an action
  // This helps the system learn what works for this client
  const paymentDayOfWeek = event.paymentDate.getDay();
  const paymentHour = event.paymentDate.getHours();

  await prisma.client.update({
    where: { id: clientId },
    data: {
      bestContactDay: getDayName(paymentDayOfWeek),
      bestContactHour: paymentHour,
    },
  });
}

// Add recovery event to billing cycle
async function addToBillingCycle(
  organizationId: string,
  recoveryEventId: string,
  feeAmount: number
): Promise<void> {
  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  // Find or create current billing cycle
  let cycle = await prisma.billingCycle.findFirst({
    where: {
      organizationId,
      periodStart: { gte: periodStart },
      periodEnd: { lte: periodEnd },
    },
  });

  if (!cycle) {
    cycle = await prisma.billingCycle.create({
      data: {
        organizationId,
        periodStart,
        periodEnd,
        status: 'open',
      },
    });
  }

  // Update the recovery event with billing cycle reference
  await prisma.recoveryEvent.update({
    where: { id: recoveryEventId },
    data: { billingCycleId: cycle.id },
  });

  // Update cycle totals
  await prisma.billingCycle.update({
    where: { id: cycle.id },
    data: {
      totalRecovered: { increment: feeAmount / DEFAULT_AR_CONFIG.successFeePercent / 100 },
      totalFees: { increment: feeAmount / 100 },
    },
  });
}

// Sync payments from QuickBooks
export async function syncPaymentsFromQuickBooks(organizationId: string): Promise<number> {
  // Get QuickBooks integration
  const integration = await prisma.integration.findFirst({
    where: {
      organizationId,
      provider: 'quickbooks',
      status: 'active',
    },
  });

  if (!integration || !integration.accessToken || !integration.externalAccountId) {
    return 0;
  }

  // Check if token needs refresh
  if (integration.tokenExpiresAt && new Date(integration.tokenExpiresAt) < new Date()) {
    const refreshed = await refreshQuickBooksToken(integration.id);
    if (!refreshed) {
      return 0;
    }
  }

  // Fetch recent payments from QuickBooks
  const realmId = integration.externalAccountId;
  const accessToken = integration.accessToken;
  const baseUrl = process.env.QUICKBOOKS_API_URL || 'https://quickbooks.api.intuit.com';

  try {
    // Get payments from the last 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const query = `SELECT * FROM Payment WHERE TxnDate >= '${sevenDaysAgo.toISOString().split('T')[0]}'`;

    const response = await fetch(
      `${baseUrl}/v3/company/${realmId}/query?query=${encodeURIComponent(query)}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('[AR Engine] QuickBooks API error:', errorText);
      await prisma.integration.update({
        where: { id: integration.id },
        data: { syncError: `API error: ${response.status}`, lastSyncStatus: 'error' },
      });
      return 0;
    }

    const data = await response.json();
    const payments = data.QueryResponse?.Payment || [];

    let matched = 0;

    for (const payment of payments) {
      const _amount = Math.round(parseFloat(payment.TotalAmt) * 100); // Convert to cents (used for logging)
      const paymentDate = new Date(payment.TxnDate);

      // Try to match by QuickBooks invoice reference
      for (const line of payment.Line || []) {
        if (line.LinkedTxn) {
          for (const linkedTxn of line.LinkedTxn) {
            if (linkedTxn.TxnType === 'Invoice') {
              const qbInvoiceId = linkedTxn.TxnId;

              // Find matching invoice in our system
              const invoice = await prisma.invoice.findFirst({
                where: {
                  organizationId,
                  OR: [
                    { quickbooksId: qbInvoiceId },
                    { externalId: qbInvoiceId },
                  ],
                  status: { in: ['sent', 'viewed', 'partial', 'overdue'] },
                },
              });

              if (invoice) {
                // Check if already recorded
                const existingRecovery = await prisma.recoveryEvent.findFirst({
                  where: {
                    invoiceId: invoice.id,
                    eventDate: {
                      gte: new Date(paymentDate.getTime() - 24 * 60 * 60 * 1000),
                      lte: new Date(paymentDate.getTime() + 24 * 60 * 60 * 1000),
                    },
                  },
                });

                if (!existingRecovery) {
                  const lineAmount = Math.round(parseFloat(line.Amount || payment.TotalAmt) * 100);
                  await recordPayment({
                    invoiceId: invoice.id,
                    amount: lineAmount,
                    paymentDate,
                    source: 'quickbooks',
                    paymentMethod: payment.PaymentMethodRef?.name,
                  });
                  matched++;
                }
              }
            }
          }
        }
      }
    }

    // Update sync status
    await prisma.integration.update({
      where: { id: integration.id },
      data: {
        lastSyncAt: new Date(),
        lastSyncStatus: 'success',
        syncError: null,
      },
    });

    return matched;
  } catch (error) {
    logger.error('[AR Engine] QuickBooks sync error:', error);
    await prisma.integration.update({
      where: { id: integration.id },
      data: { syncError: String(error), lastSyncStatus: 'error' },
    });
    return 0;
  }
}

// Refresh QuickBooks OAuth token
async function refreshQuickBooksToken(integrationId: string): Promise<boolean> {
  const integration = await prisma.integration.findUnique({
    where: { id: integrationId },
  });

  if (!integration?.refreshToken) {
    return false;
  }

  const clientId = process.env.QUICKBOOKS_CLIENT_ID;
  const clientSecret = process.env.QUICKBOOKS_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    logger.error('[AR Engine] QuickBooks credentials not configured');
    return false;
  }

  try {
    const tokenUrl = process.env.QUICKBOOKS_TOKEN_URL || 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer';

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: integration.refreshToken,
      }),
    });

    if (!response.ok) {
      logger.error('[AR Engine] Failed to refresh QuickBooks token');
      await prisma.integration.update({
        where: { id: integrationId },
        data: { status: 'expired', syncError: 'Token refresh failed' },
      });
      return false;
    }

    const tokens = await response.json();

    // Update stored tokens
    await prisma.integration.update({
      where: { id: integrationId },
      data: {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        tokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
      },
    });

    return true;
  } catch (error) {
    logger.error('[AR Engine] Token refresh error:', error);
    return false;
  }
}

// Watch for payments in Plaid transactions
export async function checkPlaidTransactionsForPayments(organizationId: string): Promise<number> {
  const recentTransactions = await prisma.bankTransaction.findMany({
    where: {
      organizationId,
      amount: { lt: 0 }, // Credits (incoming)
      date: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
    },
    orderBy: { date: 'desc' },
  });

  let matched = 0;

  for (const tx of recentTransactions) {
    const amount = Math.abs(tx.amount); // Convert to positive

    // Try to match to an outstanding invoice
    const matchingInvoice = await prisma.invoice.findFirst({
      where: {
        organizationId,
        status: { in: ['sent', 'viewed', 'partial', 'overdue'] },
        // Match by amount (with some tolerance for fees)
        amount: {
          gte: (amount * 0.95) / 100, // 5% tolerance
          lte: (amount * 1.05) / 100,
        },
      },
    });

    if (matchingInvoice) {
      // Check if already recorded
      const existingRecovery = await prisma.recoveryEvent.findFirst({
        where: {
          invoiceId: matchingInvoice.id,
          eventDate: {
            gte: new Date(tx.date.getTime() - 24 * 60 * 60 * 1000),
            lte: new Date(tx.date.getTime() + 24 * 60 * 60 * 1000),
          },
        },
      });

      if (!existingRecovery) {
        await recordPayment({
          invoiceId: matchingInvoice.id,
          amount,
          paymentDate: tx.date,
          source: 'plaid',
        });
        matched++;
      }
    }
  }

  return matched;
}

// Get success fee summary for an organization
export async function getSuccessFeeSummary(organizationId: string): Promise<{
  currentMonth: { recovered: number; fees: number };
  lastMonth: { recovered: number; fees: number };
  allTime: { recovered: number; fees: number };
  pendingFees: number;
}> {
  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

  const currentMonth = await prisma.recoveryEvent.aggregate({
    where: {
      organizationId,
      status: 'confirmed',
      eventDate: { gte: currentMonthStart },
    },
    _sum: { recoveredAmount: true, platformFee: true },
  });

  const lastMonth = await prisma.recoveryEvent.aggregate({
    where: {
      organizationId,
      status: 'confirmed',
      eventDate: { gte: lastMonthStart, lte: lastMonthEnd },
    },
    _sum: { recoveredAmount: true, platformFee: true },
  });

  const allTime = await prisma.recoveryEvent.aggregate({
    where: {
      organizationId,
      status: 'confirmed',
    },
    _sum: { recoveredAmount: true, platformFee: true },
  });

  const pending = await prisma.billingCycle.aggregate({
    where: {
      organizationId,
      status: 'open',
    },
    _sum: { totalFees: true },
  });

  return {
    currentMonth: {
      recovered: Number(currentMonth._sum.recoveredAmount || 0) * 100,
      fees: Number(currentMonth._sum.platformFee || 0) * 100,
    },
    lastMonth: {
      recovered: Number(lastMonth._sum.recoveredAmount || 0) * 100,
      fees: Number(lastMonth._sum.platformFee || 0) * 100,
    },
    allTime: {
      recovered: Number(allTime._sum.recoveredAmount || 0) * 100,
      fees: Number(allTime._sum.platformFee || 0) * 100,
    },
    pendingFees: Number(pending._sum.totalFees || 0) * 100,
  };
}

// Helper
function getDayName(day: number): string {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  return days[day];
}
