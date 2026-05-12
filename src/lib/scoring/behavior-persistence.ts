/**
 * Payment Behavior Persistence
 *
 * Database operations for storing and retrieving payment behavior scores.
 * Handles syncing calculated scores with the Client table.
 */

import { prisma } from '@/lib/prisma';
import type { ClientTier, PaymentBehaviorScore } from './types';
import { scoreTierFromScore } from './payment-behavior';

/**
 * Stored score data from the database
 */
export interface StoredPaymentBehaviorScore {
  clientId: string;
  clientName: string;
  score: number;
  tier: ClientTier;
  avgDaysToPay: number | null;
  totalInvoiced: number;
  totalPaid: number;
  totalOutstanding: number;
  industryBenchmarkDelta: number | null;
  updatedAt: Date;
}

/**
 * Save a calculated payment behavior score to the Client table
 */
export async function savePaymentBehaviorScore(
  clientId: string,
  score: PaymentBehaviorScore
): Promise<void> {
  await prisma.client.update({
    where: { id: clientId },
    data: {
      paymentScore: Math.round(score.score),
      paymentBehaviorTier: score.tier,
      avgDaysToPayment: score.factors.avgDaysToPay,
    },
  });
}

/**
 * Get the stored score for a client
 */
export async function getStoredScore(
  clientId: string
): Promise<StoredPaymentBehaviorScore | null> {
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: {
      id: true,
      name: true,
      paymentScore: true,
      paymentBehaviorTier: true,
      avgDaysToPayment: true,
      totalInvoiced: true,
      totalPaid: true,
      totalOutstanding: true,
      industryBenchmarkDelta: true,
      updatedAt: true,
    },
  });

  if (!client || client.paymentScore === null) {
    return null;
  }

  return {
    clientId: client.id,
    clientName: client.name,
    score: client.paymentScore,
    tier: (client.paymentBehaviorTier as ClientTier) || scoreTierFromScore(client.paymentScore),
    avgDaysToPay: client.avgDaysToPayment ? Number(client.avgDaysToPayment) : null,
    totalInvoiced: Number(client.totalInvoiced),
    totalPaid: Number(client.totalPaid),
    totalOutstanding: Number(client.totalOutstanding),
    industryBenchmarkDelta: client.industryBenchmarkDelta,
    updatedAt: client.updatedAt,
  };
}

/**
 * Get all stored scores for an organization
 */
export async function getStoredScoresForOrganization(
  organizationId: string
): Promise<StoredPaymentBehaviorScore[]> {
  const clients = await prisma.client.findMany({
    where: { organizationId },
    select: {
      id: true,
      name: true,
      paymentScore: true,
      paymentBehaviorTier: true,
      avgDaysToPayment: true,
      totalInvoiced: true,
      totalPaid: true,
      totalOutstanding: true,
      industryBenchmarkDelta: true,
      updatedAt: true,
    },
    orderBy: { paymentScore: 'desc' },
  });

  return clients
    .filter(c => c.paymentScore !== null)
    .map(client => ({
      clientId: client.id,
      clientName: client.name,
      score: client.paymentScore!,
      tier: (client.paymentBehaviorTier as ClientTier) || scoreTierFromScore(client.paymentScore!),
      avgDaysToPay: client.avgDaysToPayment ? Number(client.avgDaysToPayment) : null,
      totalInvoiced: Number(client.totalInvoiced),
      totalPaid: Number(client.totalPaid),
      totalOutstanding: Number(client.totalOutstanding),
      industryBenchmarkDelta: client.industryBenchmarkDelta,
      updatedAt: client.updatedAt,
    }));
}

/**
 * Batch update scores for all clients in an organization
 */
export async function batchUpdateScores(
  organizationId: string,
  scores: Map<string, PaymentBehaviorScore>
): Promise<{ updated: number; failed: number }> {
  let updated = 0;
  let failed = 0;

  // Use transaction for atomicity
  const scoreEntries = Array.from(scores.entries());
  await prisma.$transaction(async (tx) => {
    for (const [clientId, score] of scoreEntries) {
      try {
        await tx.client.update({
          where: {
            id: clientId,
            organizationId, // Ensure client belongs to org
          },
          data: {
            paymentScore: Math.round(score.score),
            paymentBehaviorTier: score.tier,
            avgDaysToPayment: score.factors.avgDaysToPay,
          },
        });
        updated++;
      } catch {
        failed++;
      }
    }
  });

  return { updated, failed };
}

/**
 * Get clients with stale scores (not updated within maxAgeDays)
 */
export async function getClientsWithStaleScores(
  organizationId: string,
  maxAgeDays: number = 7
): Promise<string[]> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - maxAgeDays);

  const clients = await prisma.client.findMany({
    where: {
      organizationId,
      OR: [
        { paymentScore: null },
        { updatedAt: { lt: cutoff } },
      ],
    },
    select: { id: true },
  });

  return clients.map(c => c.id);
}

/**
 * Get score distribution for an organization
 */
export async function getScoreDistribution(
  organizationId: string
): Promise<Record<ClientTier, number>> {
  const clients = await prisma.client.groupBy({
    by: ['paymentBehaviorTier'],
    where: {
      organizationId,
      paymentBehaviorTier: { not: null },
    },
    _count: true,
  });

  const distribution: Record<ClientTier, number> = { A: 0, B: 0, C: 0, D: 0 };

  for (const group of clients) {
    if (group.paymentBehaviorTier) {
      distribution[group.paymentBehaviorTier as ClientTier] = group._count;
    }
  }

  return distribution;
}

/**
 * Get score statistics for an organization
 */
export async function getScoreStatistics(
  organizationId: string
): Promise<{
  total: number;
  avgScore: number;
  medianScore: number;
  minScore: number;
  maxScore: number;
}> {
  const aggregate = await prisma.client.aggregate({
    where: {
      organizationId,
      paymentScore: { not: null },
    },
    _count: { _all: true },
    _avg: { paymentScore: true },
    _min: { paymentScore: true },
    _max: { paymentScore: true },
  });

  // Get median
  const scores = await prisma.client.findMany({
    where: {
      organizationId,
      paymentScore: { not: null },
    },
    select: { paymentScore: true },
    orderBy: { paymentScore: 'asc' },
  });

  const medianScore = scores.length > 0
    ? scores[Math.floor(scores.length / 2)].paymentScore ?? 0
    : 0;

  return {
    total: aggregate._count._all,
    avgScore: aggregate._avg?.paymentScore ?? 0,
    medianScore,
    minScore: aggregate._min?.paymentScore ?? 0,
    maxScore: aggregate._max?.paymentScore ?? 0,
  };
}
