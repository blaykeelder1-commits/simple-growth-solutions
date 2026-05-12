/**
 * Follow-up Recommendation Engine
 *
 * Generates intelligent follow-up recommendations based on:
 * - Days overdue
 * - Client tier (A/B/C/D)
 * - Last contact date
 * - Invoice amount
 * - Previous follow-up attempts
 * - Payment history
 *
 * Determines:
 * - Optimal timing for follow-up
 * - Appropriate tone (friendly -> firm -> urgent)
 * - Action type (email -> call -> escalate)
 * - Suggested message content
 */

import type {
  Client,
  Invoice,
  FollowUpRecommendation,
  FollowUpFactors,
  FollowUpTone,
  FollowUpAction,
  ClientTier,
} from './types';

// Tone thresholds based on days overdue
const TONE_THRESHOLDS = {
  friendly: 7,      // 0-7 days overdue
  professional: 14, // 8-14 days overdue
  firm: 30,         // 15-30 days overdue
  urgent: Infinity, // 30+ days overdue
} as const;

// Action escalation by days overdue and client tier
const ACTION_MATRIX: Record<ClientTier, { threshold: number; action: FollowUpAction }[]> = {
  A: [
    { threshold: 7, action: 'email' },
    { threshold: 14, action: 'email' },
    { threshold: 30, action: 'call' },
    { threshold: 60, action: 'call' },
    { threshold: Infinity, action: 'escalate' },
  ],
  B: [
    { threshold: 7, action: 'email' },
    { threshold: 14, action: 'call' },
    { threshold: 30, action: 'call' },
    { threshold: 60, action: 'escalate' },
    { threshold: Infinity, action: 'legal' },
  ],
  C: [
    { threshold: 3, action: 'email' },
    { threshold: 7, action: 'call' },
    { threshold: 21, action: 'call' },
    { threshold: 45, action: 'escalate' },
    { threshold: Infinity, action: 'legal' },
  ],
  D: [
    { threshold: 1, action: 'call' },
    { threshold: 7, action: 'call' },
    { threshold: 14, action: 'escalate' },
    { threshold: 30, action: 'legal' },
    { threshold: Infinity, action: 'legal' },
  ],
};

// Priority weights
const PRIORITY_WEIGHTS = {
  amount: 0.3,
  overdueDays: 0.25,
  tierRisk: 0.25,
  contactRecency: 0.2,
} as const;

/**
 * Generate a follow-up recommendation for an invoice
 */
export function generateFollowUpRecommendation(
  invoice: Invoice,
  client: Client,
  clientTier: ClientTier,
  recoveryLikelihood: number,
  previousFollowUps: number = 0
): FollowUpRecommendation {
  const factors = calculateFollowUpFactors(
    invoice,
    client,
    clientTier,
    recoveryLikelihood,
    previousFollowUps
  );

  const tone = determineTone(factors.daysOverdue);
  const action = determineAction(factors.daysOverdue, clientTier, previousFollowUps);
  const priority = calculatePriority(factors);
  const recommendedDate = calculateRecommendedDate(factors, client.lastContactDate);
  const suggestedMessage = generateSuggestedMessage(invoice, client, tone, factors);
  const reasoning = generateReasoning(factors, tone, action);

  return {
    invoiceId: invoice.id,
    clientId: client.id,
    priority,
    recommendedDate,
    tone,
    action,
    suggestedMessage,
    reasoning,
    factors,
  };
}

/**
 * Calculate factors for follow-up decision
 */
function calculateFollowUpFactors(
  invoice: Invoice,
  client: Client,
  clientTier: ClientTier,
  recoveryLikelihood: number,
  previousFollowUps: number
): FollowUpFactors {
  const now = new Date();

  const daysOverdue = Math.max(
    0,
    Math.floor((now.getTime() - invoice.dueDate.getTime()) / (1000 * 60 * 60 * 24))
  );

  const daysSinceLastContact = client.lastContactDate
    ? Math.floor((now.getTime() - client.lastContactDate.getTime()) / (1000 * 60 * 60 * 24))
    : 999; // Default high value if never contacted

  const hasPartialPayment = invoice.paidAmount > 0 && invoice.status !== 'paid';

  return {
    daysOverdue,
    clientTier,
    invoiceAmount: invoice.amount - invoice.paidAmount,
    previousFollowUps,
    daysSinceLastContact,
    hasPartialPayment,
    recoveryLikelihood,
  };
}

/**
 * Determine appropriate tone based on days overdue
 */
function determineTone(daysOverdue: number): FollowUpTone {
  if (daysOverdue <= TONE_THRESHOLDS.friendly) return 'friendly';
  if (daysOverdue <= TONE_THRESHOLDS.professional) return 'professional';
  if (daysOverdue <= TONE_THRESHOLDS.firm) return 'firm';
  return 'urgent';
}

/**
 * Determine recommended action based on days overdue and client tier
 */
function determineAction(
  daysOverdue: number,
  clientTier: ClientTier,
  previousFollowUps: number
): FollowUpAction {
  const matrix = ACTION_MATRIX[clientTier];

  // Escalate faster based on previous failed follow-ups
  const adjustedDays = daysOverdue + previousFollowUps * 7;

  for (const { threshold, action } of matrix) {
    if (adjustedDays <= threshold) {
      return action;
    }
  }

  return 'legal';
}

/**
 * Calculate priority score (1-10, higher = more urgent)
 */
function calculatePriority(factors: FollowUpFactors): number {
  // Amount score: higher amounts = higher priority
  const amountScore = Math.min(10, factors.invoiceAmount / 1000);

  // Overdue score: more overdue = higher priority
  const overdueScore = Math.min(10, factors.daysOverdue / 10);

  // Tier risk score: worse tier = higher priority
  const tierScores: Record<ClientTier, number> = { A: 2, B: 4, C: 6, D: 8 };
  const tierScore = tierScores[factors.clientTier];

  // Contact recency: longer since contact = higher priority
  const contactScore = Math.min(10, factors.daysSinceLastContact / 7);

  // Weighted calculation
  const priority =
    amountScore * PRIORITY_WEIGHTS.amount +
    overdueScore * PRIORITY_WEIGHTS.overdueDays +
    tierScore * PRIORITY_WEIGHTS.tierRisk +
    contactScore * PRIORITY_WEIGHTS.contactRecency;

  // Boost priority if recovery likelihood is dropping
  const recoveryBoost = factors.recoveryLikelihood < 50 ? 1 : 0;

  return Math.min(10, Math.max(1, Math.round(priority + recoveryBoost)));
}

/**
 * Calculate recommended follow-up date
 */
function calculateRecommendedDate(
  factors: FollowUpFactors,
  lastContact: Date | undefined
): Date {
  const now = new Date();

  // Minimum wait time based on client tier
  const minWaitDays: Record<ClientTier, number> = {
    A: 5,
    B: 3,
    C: 2,
    D: 1,
  };

  // If never contacted or past minimum wait, recommend today
  if (!lastContact || factors.daysSinceLastContact >= minWaitDays[factors.clientTier]) {
    return now;
  }

  // Otherwise, recommend after minimum wait period
  const daysToWait = minWaitDays[factors.clientTier] - factors.daysSinceLastContact;
  const recommendedDate = new Date(now);
  recommendedDate.setDate(recommendedDate.getDate() + daysToWait);

  return recommendedDate;
}

/**
 * Generate a suggested message based on tone and context
 */
function generateSuggestedMessage(
  invoice: Invoice,
  client: Client,
  tone: FollowUpTone,
  factors: FollowUpFactors
): string {
  const remainingAmount = (invoice.amount - invoice.paidAmount).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
  });

  const templates: Record<FollowUpTone, string> = {
    friendly: `Hi ${client.name},

I hope this message finds you well. This is a friendly reminder that invoice #${invoice.id} for ${remainingAmount} was due on ${invoice.dueDate.toLocaleDateString()}.

Please let us know if you have any questions or if there's anything we can help with regarding this payment.

Thank you for your business!`,

    professional: `Dear ${client.name},

This is a follow-up regarding invoice #${invoice.id} for ${remainingAmount}, which was due on ${invoice.dueDate.toLocaleDateString()}.

We would appreciate your prompt attention to this matter. If you've already sent payment, please disregard this notice.

Please contact us if you need to discuss payment arrangements.`,

    firm: `Dear ${client.name},

Invoice #${invoice.id} for ${remainingAmount} is now ${factors.daysOverdue} days overdue.

Immediate payment is required to avoid further action. If you are experiencing difficulties, please contact us immediately to discuss payment options.

This is time-sensitive and requires your urgent attention.`,

    urgent: `URGENT: ${client.name},

Invoice #${invoice.id} for ${remainingAmount} is seriously overdue (${factors.daysOverdue} days past due).

This requires immediate resolution. Failure to respond within 48 hours may result in escalation to our collections department.

Contact us immediately to resolve this matter.`,
  };

  return templates[tone];
}

/**
 * Generate reasoning for the recommendation
 */
function generateReasoning(
  factors: FollowUpFactors,
  tone: FollowUpTone,
  action: FollowUpAction
): string {
  const parts: string[] = [];

  parts.push(`Invoice is ${factors.daysOverdue} days overdue.`);
  parts.push(`Client tier: ${factors.clientTier}.`);

  if (factors.hasPartialPayment) {
    parts.push('Partial payment received, indicating intent to pay.');
  }

  if (factors.daysSinceLastContact > 7) {
    parts.push(`No contact in ${factors.daysSinceLastContact} days.`);
  }

  if (factors.previousFollowUps > 0) {
    parts.push(`${factors.previousFollowUps} previous follow-up(s) without resolution.`);
  }

  parts.push(`Recommended ${tone} ${action} based on these factors.`);

  return parts.join(' ');
}

/**
 * Generate batch follow-up recommendations
 */
export function generateBatchFollowUpRecommendations(
  invoices: Invoice[],
  clients: Map<string, Client>,
  clientTiers: Map<string, ClientTier>,
  recoveryScores: Map<string, number>,
  followUpCounts: Map<string, number> = new Map()
): FollowUpRecommendation[] {
  return invoices
    .filter(inv => inv.status === 'overdue' || inv.status === 'partial')
    .map(invoice => {
      const client = clients.get(invoice.clientId);
      if (!client) throw new Error(`Client not found: ${invoice.clientId}`);

      const tier = clientTiers.get(invoice.clientId) || 'C';
      const recovery = recoveryScores.get(invoice.id) || 50;
      const followUps = followUpCounts.get(invoice.id) || 0;

      return generateFollowUpRecommendation(invoice, client, tier, recovery, followUps);
    })
    .sort((a, b) => b.priority - a.priority);
}

/**
 * Get today's follow-up queue
 */
export function getTodaysFollowUpQueue(
  recommendations: FollowUpRecommendation[]
): FollowUpRecommendation[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return recommendations.filter(rec => {
    const recDate = new Date(rec.recommendedDate);
    recDate.setHours(0, 0, 0, 0);
    return recDate <= today;
  });
}
