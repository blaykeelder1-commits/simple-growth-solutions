// AR Engine Action Plan Generator
// Creates comprehensive action plans for user approval

import { prisma } from '@/lib/db/prisma';
import { analyzeInvoices, detectCashSqueezes, analyzeSpendingPatterns } from './analyzer';
import {
  ActionPlan,
  InvoiceActionPlan,
  ScheduledAction,
  ProactiveMeasure,
  DEFAULT_AR_CONFIG,
  AREngineConfig,
  OutreachContent,
} from './types';
import { generateId } from '@/lib/utils';

// Generate a complete action plan for an organization
export async function generateActionPlan(
  organizationId: string,
  config: AREngineConfig = DEFAULT_AR_CONFIG
): Promise<ActionPlan> {
  // Analyze all invoices
  const invoiceAnalyses = await analyzeInvoices(organizationId, config);

  // Detect cash squeezes
  const cashSqueezeAlerts = await detectCashSqueezes(organizationId, config);

  // Analyze spending patterns for context (used for future enhancements)
  await analyzeSpendingPatterns(organizationId);

  // Create invoice action plans
  const invoiceActions: InvoiceActionPlan[] = invoiceAnalyses
    .filter(analysis => analysis.urgencyScore > 20 || analysis.daysOverdue > 0)
    .map(analysis => {
      const scheduledActions: ScheduledAction[] = analysis.recommendedActions.map(rec => ({
        id: generateId(),
        type: rec.type,
        scheduledFor: rec.scheduledFor,
        status: 'scheduled',
        content: generateOutreachContent(analysis, rec),
        incentive: rec.incentive,
      }));

      return {
        invoiceId: analysis.invoiceId,
        analysis,
        actions: scheduledActions,
        status: 'pending' as const,
      };
    });

  // Create proactive measures from cash squeeze recommendations
  const proactiveMeasures: ProactiveMeasure[] = [];

  for (const alert of cashSqueezeAlerts) {
    for (const rec of alert.recommendations) {
      if (rec.targetInvoices && rec.targetInvoices.length > 0) {
        proactiveMeasures.push({
          type: rec.incentiveType === 'deposit_request' ? 'request_deposit' : 'incentivize_early_payment',
          targetInvoices: rec.targetInvoices,
          description: rec.action,
          incentive: rec.discountPercent ? {
            type: 'early_pay_discount',
            discountPercent: rec.discountPercent,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            reason: rec.reasoning,
          } : undefined,
          projectedImpact: rec.potentialImpact,
          status: 'pending',
        });
      }
    }
  }

  // Calculate totals
  const totalAmountAtRisk = invoiceActions.reduce(
    (sum, ia) => sum + ia.analysis.amountDue,
    0
  );

  const projectedRecovery = invoiceActions.reduce(
    (sum, ia) => sum + ia.analysis.amountDue * ia.analysis.recoveryLikelihood,
    0
  );

  const projectedSuccessFee = Math.round(projectedRecovery * config.successFeePercent);

  const plan: ActionPlan = {
    id: generateId(),
    organizationId,
    createdAt: new Date(),
    status: 'draft',
    totalInvoicesAnalyzed: invoiceAnalyses.length,
    totalAmountAtRisk: Math.round(totalAmountAtRisk),
    projectedRecovery: Math.round(projectedRecovery),
    projectedSuccessFee,
    invoiceActions,
    cashSqueezeAlerts,
    proactiveMeasures,
  };

  return plan;
}

// Generate outreach content for an action
function generateOutreachContent(
  analysis: InvoiceActionPlan['analysis'],
  action: InvoiceActionPlan['analysis']['recommendedActions'][0]
): OutreachContent {
  const formatCurrency = (cents: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);

  const amountDue = formatCurrency(analysis.amountDue);
  const clientName = analysis.clientName;

  // Determine tone based on days overdue
  let tone: OutreachContent['tone'] = 'friendly';
  if (analysis.daysOverdue > 30) tone = 'urgent';
  else if (analysis.daysOverdue > 14) tone = 'reminder';
  else if (analysis.daysOverdue > 45) tone = 'final';

  // Generate content based on action type
  switch (action.type) {
    case 'email':
      if (analysis.daysOverdue === 0) {
        return {
          subject: `Upcoming Payment Reminder - Invoice Due Soon`,
          body: `Hi ${clientName},\n\nJust a friendly reminder that your invoice for ${amountDue} is due on ${analysis.dueDate.toLocaleDateString()}.\n\nClick below to pay now and keep your account in good standing.\n\nThank you for your business!`,
          tone: 'friendly',
        };
      } else if (analysis.daysOverdue <= 7) {
        return {
          subject: `Payment Reminder - Invoice Now Due`,
          body: `Hi ${clientName},\n\nWe hope this message finds you well. This is a friendly reminder that your invoice for ${amountDue} was due on ${analysis.dueDate.toLocaleDateString()}.\n\nFor your convenience, you can pay instantly using the link below.\n\nIf you've already sent payment, please disregard this message.\n\nThank you!`,
          tone: 'friendly',
        };
      } else if (analysis.daysOverdue <= 21) {
        return {
          subject: `Action Needed - Invoice ${analysis.daysOverdue} Days Past Due`,
          body: `Hi ${clientName},\n\nWe're reaching out regarding your outstanding invoice of ${amountDue}, which is now ${analysis.daysOverdue} days past due.\n\nWe value your business and want to make it easy for you to resolve this. Please use the payment link below to pay now.\n\nIf you're experiencing any issues, let's talk - we're here to help.\n\nThank you for your prompt attention.`,
          tone: 'reminder',
        };
      } else {
        return {
          subject: `Urgent: Invoice ${analysis.daysOverdue} Days Overdue - Please Respond`,
          body: `Hi ${clientName},\n\nYour invoice of ${amountDue} is now ${analysis.daysOverdue} days overdue. We need to resolve this as soon as possible.\n\nPlease pay using the link below or contact us immediately to discuss payment options.\n\nWe're committed to finding a solution that works for both of us.`,
          tone: 'urgent',
        };
      }

    case 'sms':
      if (analysis.daysOverdue <= 7) {
        return {
          body: `Hi ${clientName}, quick reminder: Your invoice of ${amountDue} is due. Pay easily here: [PAYMENT_LINK]. Thank you!`,
          tone: 'friendly',
        };
      } else {
        return {
          body: `Hi ${clientName}, your invoice of ${amountDue} is ${analysis.daysOverdue} days overdue. Please pay here: [PAYMENT_LINK] or call us to discuss options.`,
          tone: 'reminder',
        };
      }

    case 'payment_link':
      return {
        body: `Click here to pay ${amountDue} securely: [PAYMENT_LINK]`,
        tone,
      };

    case 'discount_offer':
      const discount = action.incentive?.discountPercent || 5;
      const discountAmount = action.incentive?.discountAmount ? formatCurrency(action.incentive.discountAmount) : '';
      return {
        subject: `Special Offer - Save ${discount}% on Your Outstanding Invoice`,
        body: `Hi ${clientName},\n\nWe'd like to offer you a ${discount}% discount (${discountAmount} off) if you pay your outstanding balance of ${amountDue} within the next 7 days.\n\nThis brings your total to ${formatCurrency(analysis.amountDue - (action.incentive?.discountAmount || 0))}.\n\nPay now to take advantage of this limited-time offer.\n\nThank you for being a valued customer!`,
        tone: 'friendly',
      };

    case 'payment_plan':
      const months = action.incentive?.paymentPlanMonths || 3;
      const monthlyAmount = action.incentive?.paymentPlanAmount ? formatCurrency(action.incentive.paymentPlanAmount) : '';
      return {
        subject: `Flexible Payment Options Available for Your Invoice`,
        body: `Hi ${clientName},\n\nWe understand that managing cash flow can be challenging. That's why we'd like to offer you a payment plan option for your outstanding balance of ${amountDue}.\n\nPay in ${months} easy monthly installments of ${monthlyAmount}.\n\nTo set up your payment plan, simply reply to this email or click the link below.\n\nWe value our relationship and want to make this work for you.`,
        tone: 'friendly',
      };

    case 'call':
      return {
        body: `Call ${clientName} to discuss invoice ${amountDue}. Key points: ${analysis.daysOverdue} days overdue, payment options available.`,
        tone,
      };

    default:
      return {
        body: `Follow up with ${clientName} regarding outstanding invoice of ${amountDue}.`,
        tone,
      };
  }
}

// Save action plan to database
export async function saveActionPlan(plan: ActionPlan): Promise<void> {
  // Store as AIRecommendation records with plan reference
  for (const invoiceAction of plan.invoiceActions) {
    await prisma.aIRecommendation.create({
      data: {
        organizationId: plan.organizationId,
        invoiceId: invoiceAction.invoiceId,
        clientId: invoiceAction.analysis.clientId || null,
        type: 'collection_strategy',
        title: `Action Plan for Invoice - ${invoiceAction.analysis.clientName}`,
        description: `${invoiceAction.actions.length} actions scheduled. Amount due: $${(invoiceAction.analysis.amountDue / 100).toFixed(2)}. Days overdue: ${invoiceAction.analysis.daysOverdue}.`,
        priority: invoiceAction.analysis.urgencyScore > 70 ? 'critical' :
                  invoiceAction.analysis.urgencyScore > 50 ? 'high' :
                  invoiceAction.analysis.urgencyScore > 30 ? 'medium' : 'low',
        confidence: invoiceAction.analysis.recoveryLikelihood,
        reasoning: JSON.stringify({
          planId: plan.id,
          actions: invoiceAction.actions,
          analysis: {
            urgencyScore: invoiceAction.analysis.urgencyScore,
            riskLevel: invoiceAction.analysis.riskLevel,
            predictedPaymentDate: invoiceAction.analysis.predictedPaymentDate,
          },
        }),
        status: 'pending',
      },
    });
  }

  // Store cash squeeze alerts as business insights
  for (const alert of plan.cashSqueezeAlerts) {
    await prisma.businessInsight.create({
      data: {
        organizationId: plan.organizationId,
        category: 'cash_flow',
        type: 'alert',
        title: `Cash Squeeze Alert: ${alert.type.replace(/_/g, ' ')}`,
        description: alert.description,
        confidence: 0.85,
        dataPoints: JSON.stringify(alert.recommendations),
        actionRequired: true,
        relevantFrom: alert.date,
      },
    });
  }
}

// Approve and activate an action plan
export async function approveActionPlan(
  planId: string,
  organizationId: string,
  selectedInvoiceIds?: string[]
): Promise<void> {
  // Update all pending recommendations for this plan to approved
  const recommendations = await prisma.aIRecommendation.findMany({
    where: {
      organizationId,
      status: 'pending',
      reasoning: { contains: planId },
    },
  });

  for (const rec of recommendations) {
    // If specific invoices selected, only approve those
    if (selectedInvoiceIds && !selectedInvoiceIds.includes(rec.invoiceId || '')) {
      continue;
    }

    await prisma.aIRecommendation.update({
      where: { id: rec.id },
      data: {
        status: 'accepted',
        actionTakenAt: new Date(),
      },
    });

    // Create follow-up actions from the plan
    const reasoning = JSON.parse(rec.reasoning || '{}');
    const actions = reasoning.actions || [];

    for (const action of actions) {
      await prisma.followUpAction.create({
        data: {
          organizationId,
          invoiceId: rec.invoiceId,
          clientId: rec.clientId,
          type: action.type,
          scheduledFor: new Date(action.scheduledFor),
          status: 'scheduled',
          notes: JSON.stringify({
            content: action.content,
            incentive: action.incentive,
          }),
        },
      });
    }
  }
}

// Get pending action plan for an organization
export async function getPendingActionPlan(organizationId: string): Promise<ActionPlan | null> {
  const recommendations = await prisma.aIRecommendation.findMany({
    where: {
      organizationId,
      status: 'pending',
      type: 'collection_strategy',
    },
    include: {
      invoice: { include: { client: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (recommendations.length === 0) return null;

  // Reconstruct plan from recommendations
  const invoiceActions: InvoiceActionPlan[] = [];
  let planId = '';

  for (const rec of recommendations) {
    const reasoning = JSON.parse(rec.reasoning || '{}');
    planId = reasoning.planId || '';

    if (rec.invoice) {
      invoiceActions.push({
        invoiceId: rec.invoiceId!,
        analysis: {
          invoiceId: rec.invoiceId!,
          clientId: rec.clientId || '',
          clientName: rec.invoice.client?.name || 'Unknown',
          clientEmail: rec.invoice.client?.email || null,
          clientPhone: rec.invoice.client?.phone || null,
          amount: Number(rec.invoice.amount) * 100,
          amountPaid: Number(rec.invoice.amountPaid) * 100,
          amountDue: (Number(rec.invoice.amount) - Number(rec.invoice.amountPaid)) * 100,
          dueDate: new Date(rec.invoice.dueDate),
          daysOverdue: rec.invoice.daysOverdue,
          daysToDue: 0 - rec.invoice.daysOverdue,
          riskLevel: reasoning.analysis?.riskLevel || 'medium',
          recoveryLikelihood: Number(rec.confidence) || 0.5,
          predictedPaymentDate: reasoning.analysis?.predictedPaymentDate ? new Date(reasoning.analysis.predictedPaymentDate) : null,
          clientPaymentScore: rec.invoice.client?.paymentScore || 50,
          clientAvgDaysToPayment: Number(rec.invoice.client?.avgDaysToPayment) || 30,
          clientPreferredPaymentMethod: rec.invoice.client?.preferredPaymentMethod || null,
          clientBestContactDay: rec.invoice.client?.bestContactDay || null,
          clientBestContactHour: rec.invoice.client?.bestContactHour || null,
          recommendedActions: [],
          urgencyScore: reasoning.analysis?.urgencyScore || 50,
        },
        actions: reasoning.actions || [],
        status: 'pending',
      });
    }
  }

  // Get cash squeeze alerts
  const insights = await prisma.businessInsight.findMany({
    where: {
      organizationId,
      category: 'cash_flow',
      type: 'alert',
      actionTaken: false,
    },
    orderBy: { createdAt: 'desc' },
  });

  const cashSqueezeAlerts = insights.map(insight => ({
    type: 'invoice_clustering' as const,
    severity: 'warning' as const,
    date: insight.relevantFrom || new Date(),
    description: insight.description,
    projectedShortfall: 0,
    recommendations: JSON.parse(insight.dataPoints || '[]'),
  }));

  const totalAmountAtRisk = invoiceActions.reduce((sum, ia) => sum + ia.analysis.amountDue, 0);
  const projectedRecovery = invoiceActions.reduce(
    (sum, ia) => sum + ia.analysis.amountDue * ia.analysis.recoveryLikelihood,
    0
  );

  return {
    id: planId,
    organizationId,
    createdAt: recommendations[0]?.createdAt || new Date(),
    status: 'pending_approval',
    totalInvoicesAnalyzed: invoiceActions.length,
    totalAmountAtRisk: Math.round(totalAmountAtRisk),
    projectedRecovery: Math.round(projectedRecovery),
    projectedSuccessFee: Math.round(projectedRecovery * 0.08),
    invoiceActions,
    cashSqueezeAlerts,
    proactiveMeasures: [],
  };
}
