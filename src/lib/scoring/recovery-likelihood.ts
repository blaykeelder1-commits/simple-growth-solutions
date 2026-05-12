/**
 * Invoice Recovery Likelihood Scoring Engine
 *
 * Calculates the probability of recovering payment on an invoice.
 *
 * Algorithm:
 * score = baseScore - overduePenalty + partialPaymentBonus + contactBonus
 *
 * - Base score from client tier: A=85, B=70, C=50, D=30
 * - Overdue penalty: -2 points per day overdue (max -40)
 * - Partial payment bonus: +15 if any partial payments made
 * - Recent contact bonus: +10 if contacted within 7 days
 */

import type {
  Client,
  Invoice,
  RecoveryLikelihood,
  RecoveryFactors,
  ClientTier,
} from './types';

// Base scores by client tier
const BASE_SCORES: Record<ClientTier, number> = {
  A: 85,
  B: 70,
  C: 50,
  D: 30,
};

// Penalty and bonus constants
const OVERDUE_PENALTY_PER_DAY = 2;
const MAX_OVERDUE_PENALTY = 40;
const PARTIAL_PAYMENT_BONUS = 15;
const RECENT_CONTACT_BONUS = 10;
const RECENT_CONTACT_DAYS = 7;

/**
 * Calculate recovery likelihood for an invoice
 */
export function calculateRecoveryLikelihood(
  invoice: Invoice,
  client: Client,
  clientTier: ClientTier
): RecoveryLikelihood {
  const factors = calculateRecoveryFactors(invoice, client, clientTier);
  const score = calculateRecoveryScore(factors);

  return {
    invoiceId: invoice.id,
    clientId: client.id,
    score: Math.round(score * 100) / 100,
    probability: score / 100,
    factors,
    calculatedAt: new Date(),
  };
}

/**
 * Calculate the factors that contribute to recovery likelihood
 */
function calculateRecoveryFactors(
  invoice: Invoice,
  client: Client,
  clientTier: ClientTier
): RecoveryFactors {
  const now = new Date();

  // Calculate days overdue
  const overdueDays = Math.max(
    0,
    Math.floor((now.getTime() - invoice.dueDate.getTime()) / (1000 * 60 * 60 * 24))
  );

  // Calculate overdue penalty (capped)
  const overduePenalty = Math.min(
    overdueDays * OVERDUE_PENALTY_PER_DAY,
    MAX_OVERDUE_PENALTY
  );

  // Check for partial payment
  const hasPartialPayment = invoice.paidAmount > 0 && invoice.status !== 'paid';
  const partialPaymentBonus = hasPartialPayment ? PARTIAL_PAYMENT_BONUS : 0;

  // Check for recent contact
  const recentContact = client.lastContactDate
    ? (now.getTime() - client.lastContactDate.getTime()) / (1000 * 60 * 60 * 24) <= RECENT_CONTACT_DAYS
    : false;
  const contactBonus = recentContact ? RECENT_CONTACT_BONUS : 0;

  // Get base score from tier
  const baseScore = BASE_SCORES[clientTier];

  return {
    baseScore,
    overdueDays,
    overduePenalty,
    hasPartialPayment,
    partialPaymentBonus,
    recentContact,
    contactBonus,
    clientTier,
  };
}

/**
 * Calculate final recovery score from factors
 */
function calculateRecoveryScore(factors: RecoveryFactors): number {
  const score =
    factors.baseScore -
    factors.overduePenalty +
    factors.partialPaymentBonus +
    factors.contactBonus;

  // Clamp to 0-100
  return Math.max(0, Math.min(100, score));
}

/**
 * Get recovery likelihood category
 */
export function getRecoveryCategory(score: number): {
  category: 'high' | 'medium' | 'low' | 'unlikely';
  description: string;
} {
  if (score >= 75) {
    return {
      category: 'high',
      description: 'High likelihood of recovery - prioritize collection',
    };
  }
  if (score >= 50) {
    return {
      category: 'medium',
      description: 'Moderate likelihood - follow up recommended',
    };
  }
  if (score >= 25) {
    return {
      category: 'low',
      description: 'Low likelihood - consider escalation',
    };
  }
  return {
    category: 'unlikely',
    description: 'Recovery unlikely - may require legal action',
  };
}

/**
 * Calculate expected value of an invoice based on recovery likelihood
 */
export function calculateExpectedValue(invoice: Invoice, recoveryScore: number): number {
  const remainingAmount = invoice.amount - invoice.paidAmount;
  return remainingAmount * (recoveryScore / 100);
}

/**
 * Batch calculate recovery likelihood for multiple invoices
 */
export function calculateBatchRecoveryLikelihood(
  invoices: Invoice[],
  clients: Map<string, Client>,
  clientTiers: Map<string, ClientTier>
): RecoveryLikelihood[] {
  return invoices.map(invoice => {
    const client = clients.get(invoice.clientId);
    const tier = clientTiers.get(invoice.clientId) || 'C';

    if (!client) {
      throw new Error(`Client not found: ${invoice.clientId}`);
    }

    return calculateRecoveryLikelihood(invoice, client, tier);
  });
}

/**
 * Get overdue invoices sorted by recovery likelihood
 */
export function prioritizeOverdueInvoices(
  recoveryScores: RecoveryLikelihood[]
): RecoveryLikelihood[] {
  return [...recoveryScores].sort((a, b) => {
    // First sort by score (higher = more likely to recover)
    // Then by factors.overdueDays (lower = more urgent)
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    return a.factors.overdueDays - b.factors.overdueDays;
  });
}

/**
 * Calculate total expected recovery amount
 */
export function calculateTotalExpectedRecovery(
  invoices: Invoice[],
  recoveryScores: Map<string, RecoveryLikelihood>
): number {
  return invoices.reduce((total, invoice) => {
    const recovery = recoveryScores.get(invoice.id);
    if (!recovery) return total;

    const remainingAmount = invoice.amount - invoice.paidAmount;
    return total + remainingAmount * recovery.probability;
  }, 0);
}

/**
 * Get recovery improvement recommendations
 */
export function getRecoveryRecommendations(factors: RecoveryFactors): string[] {
  const recommendations: string[] = [];

  if (!factors.recentContact) {
    recommendations.push('Contact client - last contact was over 7 days ago');
  }

  if (factors.overdueDays > 30 && !factors.hasPartialPayment) {
    recommendations.push('Consider offering a payment plan to encourage partial payment');
  }

  if (factors.clientTier === 'D' && factors.overdueDays > 60) {
    recommendations.push('Consider escalating to collections or legal action');
  }

  if (factors.overdueDays > 0 && factors.overdueDays <= 7) {
    recommendations.push('Send friendly payment reminder');
  }

  if (factors.overdueDays > 14 && factors.overdueDays <= 30) {
    recommendations.push('Follow up with a phone call');
  }

  return recommendations;
}
