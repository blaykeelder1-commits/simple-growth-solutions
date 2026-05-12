/**
 * Seasonal Pattern Analysis
 *
 * Statistical analysis and batch operations for seasonal patterns.
 */

import { prisma } from '@/lib/prisma';
import {
  SeasonalPattern,
  SeasonalAnomaly,
  MONTH_NAMES,
  MONTH_KEYS,
} from './types';
import {
  detectClientSeasonalPattern,
  saveSeasonalPattern,
  getStoredPattern,
  storedToSeasonalPattern,
} from './detection';

/**
 * Result of batch pattern refresh
 */
export interface PatternRefreshResult {
  organizationId: string;
  totalClients: number;
  patternsDetected: number;
  patternsUpdated: number;
  insufficientData: number;
  duration: number;
  completedAt: Date;
}

/**
 * Detect anomalies in recent payments compared to expected pattern
 */
export async function detectAnomalies(
  clientId: string,
  organizationId: string,
  recentDays: number = 90
): Promise<SeasonalAnomaly[]> {
  const stored = await getStoredPattern(clientId);

  if (!stored || stored.confidenceScore < 0.5) {
    return [];
  }

  const pattern = storedToSeasonalPattern(stored);

  // Get recent payments
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - recentDays);

  const payments = await prisma.invoicePayment.findMany({
    where: {
      invoice: { clientId, organizationId },
      paymentDate: { gte: cutoff },
      daysFromDue: { not: null },
    },
    select: {
      id: true,
      paymentDate: true,
      daysFromDue: true,
      invoiceId: true,
    },
  });

  const anomalies: SeasonalAnomaly[] = [];

  // Calculate expected behavior distribution per month
  const stdDevDays = 15; // Typical standard deviation

  for (const payment of payments) {
    const month = payment.paymentDate.getMonth();
    const expectedMultiplier = pattern.monthly[MONTH_KEYS[month]];

    // Calculate what the "normal" days from due would be
    // If multiplier > 1, they usually pay faster (lower days from due)
    const overallAvg = calculateOverallAvg(pattern.monthly);
    const expectedDaysFromDue = Math.round(overallAvg / expectedMultiplier);
    const actualDaysFromDue = payment.daysFromDue!;

    // Calculate deviation in standard deviations
    const deviation = (actualDaysFromDue - expectedDaysFromDue) / stdDevDays;
    const absDeviation = Math.abs(deviation);

    // Determine if anomaly
    let isAnomaly = false;
    let severity: SeasonalAnomaly['severity'] = 'minor';
    let explanation = '';

    if (absDeviation > 2) {
      isAnomaly = true;
      if (absDeviation > 3) {
        severity = 'significant';
        explanation = `Payment was ${Math.abs(actualDaysFromDue - expectedDaysFromDue)} days ${actualDaysFromDue > expectedDaysFromDue ? 'later' : 'earlier'} than typical for ${MONTH_NAMES[month]}`;
      } else {
        severity = 'moderate';
        explanation = `Payment timing deviated significantly from ${MONTH_NAMES[month]} pattern`;
      }
    } else if (absDeviation > 1.5) {
      severity = 'minor';
      explanation = `Slight deviation from expected ${MONTH_NAMES[month]} behavior`;
    }

    if (isAnomaly || absDeviation > 1.5) {
      anomalies.push({
        invoiceId: payment.invoiceId,
        paymentDate: payment.paymentDate,
        expectedMultiplier,
        actualBehavior: actualDaysFromDue,
        deviation: Math.round(deviation * 100) / 100,
        isAnomaly,
        severity,
        explanation,
      });
    }
  }

  // Sort by deviation magnitude
  return anomalies.sort((a, b) => Math.abs(b.deviation) - Math.abs(a.deviation));
}

/**
 * Refresh seasonal patterns for all clients in an organization
 */
export async function refreshSeasonalPatterns(
  organizationId: string
): Promise<PatternRefreshResult> {
  const startTime = Date.now();

  // Get all clients
  const clients = await prisma.client.findMany({
    where: { organizationId },
    select: { id: true },
  });

  let patternsDetected = 0;
  let patternsUpdated = 0;
  let insufficientData = 0;

  for (const client of clients) {
    const pattern = await detectClientSeasonalPattern(client.id);

    if (pattern) {
      await saveSeasonalPattern(pattern);
      patternsDetected++;

      // Check if this is an update vs new
      const existing = await prisma.clientSeasonalPattern.findUnique({
        where: { clientId: client.id },
      });
      if (existing) {
        patternsUpdated++;
      }
    } else {
      insufficientData++;
    }
  }

  return {
    organizationId,
    totalClients: clients.length,
    patternsDetected,
    patternsUpdated,
    insufficientData,
    duration: Date.now() - startTime,
    completedAt: new Date(),
  };
}

/**
 * Get organization-wide seasonal statistics
 */
export async function getOrganizationSeasonalStats(
  organizationId: string
): Promise<{
  clientsWithPatterns: number;
  averageConfidence: number;
  avgDataPoints: number;
  strongestMonth: { month: number; monthName: string; avgMultiplier: number };
  weakestMonth: { month: number; monthName: string; avgMultiplier: number };
}> {
  const patterns = await prisma.clientSeasonalPattern.findMany({
    where: {
      client: { organizationId },
    },
  });

  if (patterns.length === 0) {
    return {
      clientsWithPatterns: 0,
      averageConfidence: 0,
      avgDataPoints: 0,
      strongestMonth: { month: 0, monthName: 'January', avgMultiplier: 1.0 },
      weakestMonth: { month: 0, monthName: 'January', avgMultiplier: 1.0 },
    };
  }

  // Calculate averages
  const totalConfidence = patterns.reduce(
    (sum, p) => sum + Number(p.confidenceScore),
    0
  );
  const totalDataPoints = patterns.reduce(
    (sum, p) => sum + p.dataPoints,
    0
  );

  // Calculate average multiplier per month
  const monthlyAvgs = MONTH_KEYS.map((key, index) => {
    const sum = patterns.reduce(
      (s, p) => s + Number(p[`${key}Multiplier` as keyof typeof p]),
      0
    );
    return {
      month: index,
      monthName: MONTH_NAMES[index],
      avgMultiplier: sum / patterns.length,
    };
  });

  const sorted = [...monthlyAvgs].sort((a, b) => b.avgMultiplier - a.avgMultiplier);

  return {
    clientsWithPatterns: patterns.length,
    averageConfidence: totalConfidence / patterns.length,
    avgDataPoints: totalDataPoints / patterns.length,
    strongestMonth: sorted[0],
    weakestMonth: sorted[sorted.length - 1],
  };
}

/**
 * Compare client pattern to industry average
 */
export async function compareToIndustryPattern(
  clientId: string,
  industryPattern: SeasonalPattern
): Promise<{
  clientId: string;
  deviations: Array<{
    month: number;
    monthName: string;
    clientMultiplier: number;
    industryMultiplier: number;
    difference: number;
  }>;
  avgDeviation: number;
  isTypical: boolean;
}> {
  const stored = await getStoredPattern(clientId);

  if (!stored) {
    return {
      clientId,
      deviations: [],
      avgDeviation: 0,
      isTypical: true,
    };
  }

  const clientPattern = storedToSeasonalPattern(stored);

  const deviations = MONTH_KEYS.map((key, index) => {
    const clientMult = clientPattern.monthly[key];
    const industryMult = industryPattern.monthly[key];
    return {
      month: index,
      monthName: MONTH_NAMES[index],
      clientMultiplier: clientMult,
      industryMultiplier: industryMult,
      difference: clientMult - industryMult,
    };
  });

  const avgDeviation =
    deviations.reduce((sum, d) => sum + Math.abs(d.difference), 0) / 12;

  return {
    clientId,
    deviations,
    avgDeviation,
    isTypical: avgDeviation < 0.15,
  };
}

/**
 * Get clients that need pattern updates
 */
export async function getClientsNeedingPatternUpdate(
  organizationId: string,
  maxAgeDays: number = 30
): Promise<string[]> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - maxAgeDays);

  // Get clients without patterns
  const clientsWithoutPatterns = await prisma.client.findMany({
    where: {
      organizationId,
      seasonalPatterns: { none: {} },
    },
    select: { id: true },
  });

  // Get clients with stale patterns
  const clientsWithStalePatterns = await prisma.client.findMany({
    where: {
      organizationId,
      seasonalPatterns: {
        some: {
          lastUpdated: { lt: cutoff },
        },
      },
    },
    select: { id: true },
  });

  return [
    ...clientsWithoutPatterns.map(c => c.id),
    ...clientsWithStalePatterns.map(c => c.id),
  ];
}

/**
 * Store pattern as JSON string in client table
 */
export async function storePatternInClient(
  clientId: string,
  pattern: SeasonalPattern
): Promise<void> {
  const jsonPattern = JSON.stringify({
    monthly: pattern.monthly,
    quarterly: pattern.quarterly,
    confidence: pattern.confidenceScore,
    dataPoints: pattern.dataPoints,
    updatedAt: pattern.lastUpdated.toISOString(),
  });

  await prisma.client.update({
    where: { id: clientId },
    data: { seasonalPaymentPattern: jsonPattern },
  });
}

/**
 * Calculate overall average from monthly multipliers
 */
function calculateOverallAvg(monthly: SeasonalPattern['monthly']): number {
  const sum = MONTH_KEYS.reduce((s, key) => s + monthly[key], 0);
  return sum / 12;
}
