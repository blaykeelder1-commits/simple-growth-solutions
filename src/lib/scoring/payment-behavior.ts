/**
 * Payment Behavior Scoring Engine
 *
 * Calculates a 0-100 score based on client payment history with weighted factors:
 * - On-time payment rate (40%)
 * - Average days to pay vs terms (25%)
 * - Payment consistency/variance (20%)
 * - Relationship length bonus (15%)
 *
 * Assigns tiers: A (80-100), B (60-79), C (40-59), D (0-39)
 */

import type {
  Client,
  Invoice,
  PaymentBehaviorScore,
  PaymentBehaviorFactors,
  ClientTier,
} from './types';

// Scoring weights
const WEIGHTS = {
  onTimeRate: 0.40,
  avgDaysToPay: 0.25,
  consistency: 0.20,
  relationshipLength: 0.15,
} as const;

// Tier thresholds
const TIER_THRESHOLDS = {
  A: 80,
  B: 60,
  C: 40,
} as const;

/**
 * Calculate the payment behavior score for a client
 */
export function calculatePaymentBehaviorScore(client: Client): PaymentBehaviorScore {
  const factors = calculateFactors(client);
  const score = calculateWeightedScore(factors, client.invoices);
  const tier = scoreTierFromScore(score);

  return {
    clientId: client.id,
    score: Math.round(score * 100) / 100,
    tier,
    factors,
    calculatedAt: new Date(),
  };
}

/**
 * Calculate individual scoring factors from client data
 */
function calculateFactors(client: Client): PaymentBehaviorFactors {
  const { invoices, payments, createdAt } = client;

  // Filter to completed invoices (paid or partial)
  const completedInvoices = invoices.filter(
    inv => inv.status === 'paid' || inv.status === 'partial'
  );

  const totalInvoices = completedInvoices.length;
  const totalPayments = payments.length;

  // On-time rate: percentage of invoices paid on or before due date
  const onTimePayments = payments.filter(p => p.daysFromDue <= 0);
  const onTimeRate = totalPayments > 0
    ? (onTimePayments.length / totalPayments) * 100
    : 0;

  // Average days to pay (from due date, negative = early)
  const avgDaysToPay = totalPayments > 0
    ? payments.reduce((sum, p) => sum + p.daysFromDue, 0) / totalPayments
    : 0;

  // Payment consistency (standard deviation of days to pay)
  const avgDaysVariance = calculateVariance(payments.map(p => p.daysFromDue));

  // Relationship length in days
  const relationshipLengthDays = Math.floor(
    (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24)
  );

  return {
    onTimeRate,
    avgDaysToPay,
    avgDaysVariance,
    relationshipLengthDays,
    totalInvoices,
    totalPayments,
  };
}

/**
 * Calculate the weighted score from factors
 */
function calculateWeightedScore(factors: PaymentBehaviorFactors, invoices: Invoice[]): number {
  // Handle new clients with no payment history
  if (factors.totalPayments === 0) {
    // New clients start at 50 (neutral)
    return 50;
  }

  // 1. On-time rate score (0-100)
  const onTimeScore = factors.onTimeRate;

  // 2. Average days to pay score (0-100)
  // Perfect score for on-time or early, decreasing as days late increases
  // -30 or earlier: 100, 0: 85, +30: 50, +60: 20, +90+: 0
  const avgPaymentTerms = invoices.length > 0
    ? invoices.reduce((sum, inv) => sum + inv.paymentTermDays, 0) / invoices.length
    : 30;

  const daysToPayScore = calculateDaysToPayScore(factors.avgDaysToPay, avgPaymentTerms);

  // 3. Consistency score (0-100)
  // Lower variance = higher score
  // Variance of 0: 100, 5: 90, 10: 75, 20: 50, 40+: 20
  const consistencyScore = calculateConsistencyScore(factors.avgDaysVariance);

  // 4. Relationship length bonus (0-100)
  // < 30 days: 30, 30-90 days: 50, 90-180 days: 70, 180-365 days: 85, 365+: 100
  const relationshipScore = calculateRelationshipScore(factors.relationshipLengthDays);

  // Calculate weighted total
  const weightedScore =
    onTimeScore * WEIGHTS.onTimeRate +
    daysToPayScore * WEIGHTS.avgDaysToPay +
    consistencyScore * WEIGHTS.consistency +
    relationshipScore * WEIGHTS.relationshipLength;

  // Clamp to 0-100
  return Math.max(0, Math.min(100, weightedScore));
}

/**
 * Calculate score based on average days to pay
 */
function calculateDaysToPayScore(avgDaysToPay: number, avgPaymentTerms: number): number {
  // Normalize to days relative to payment terms
  const daysLate = avgDaysToPay;

  if (daysLate <= -avgPaymentTerms) return 100; // Very early payer
  if (daysLate <= 0) return 85 + ((-daysLate / avgPaymentTerms) * 15); // On time or early
  if (daysLate <= 15) return 85 - (daysLate * 2.33); // 1-15 days late
  if (daysLate <= 30) return 50 - ((daysLate - 15) * 2); // 15-30 days late
  if (daysLate <= 60) return 20 - ((daysLate - 30) * 0.67); // 30-60 days late
  return 0; // 60+ days late
}

/**
 * Calculate score based on payment consistency (variance)
 */
function calculateConsistencyScore(variance: number): number {
  if (variance <= 0) return 100;
  if (variance <= 5) return 100 - (variance * 2);
  if (variance <= 10) return 90 - ((variance - 5) * 3);
  if (variance <= 20) return 75 - ((variance - 10) * 2.5);
  if (variance <= 40) return 50 - ((variance - 20) * 1.5);
  return 20;
}

/**
 * Calculate score based on relationship length
 */
function calculateRelationshipScore(days: number): number {
  if (days < 30) return 30;
  if (days < 90) return 30 + ((days - 30) / 60) * 20;
  if (days < 180) return 50 + ((days - 90) / 90) * 20;
  if (days < 365) return 70 + ((days - 180) / 185) * 15;
  return 100;
}

/**
 * Calculate variance of a number array
 */
function calculateVariance(values: number[]): number {
  if (values.length === 0) return 0;

  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
  const avgSquaredDiff = squaredDiffs.reduce((sum, v) => sum + v, 0) / values.length;

  return Math.sqrt(avgSquaredDiff); // Return standard deviation
}

/**
 * Determine tier from score
 */
export function scoreTierFromScore(score: number): ClientTier {
  if (score >= TIER_THRESHOLDS.A) return 'A';
  if (score >= TIER_THRESHOLDS.B) return 'B';
  if (score >= TIER_THRESHOLDS.C) return 'C';
  return 'D';
}

/**
 * Get tier description
 */
export function getTierDescription(tier: ClientTier): string {
  const descriptions: Record<ClientTier, string> = {
    A: 'Excellent - Consistently pays on time or early',
    B: 'Good - Generally reliable with occasional delays',
    C: 'Fair - Moderate payment delays, requires monitoring',
    D: 'Poor - Significant payment issues, high risk',
  };
  return descriptions[tier];
}

/**
 * Batch calculate scores for multiple clients
 */
export function calculateBatchPaymentScores(clients: Client[]): PaymentBehaviorScore[] {
  return clients.map(client => calculatePaymentBehaviorScore(client));
}

/**
 * Get clients by tier
 */
export function groupClientsByTier(scores: PaymentBehaviorScore[]): Record<ClientTier, PaymentBehaviorScore[]> {
  return {
    A: scores.filter(s => s.tier === 'A'),
    B: scores.filter(s => s.tier === 'B'),
    C: scores.filter(s => s.tier === 'C'),
    D: scores.filter(s => s.tier === 'D'),
  };
}
