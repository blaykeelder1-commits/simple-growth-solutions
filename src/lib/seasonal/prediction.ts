/**
 * Seasonal Prediction
 *
 * Functions for applying seasonal patterns to payment predictions
 * and cash flow forecasting.
 */

import { prisma } from '@/lib/prisma';
import {
  PredictionAdjustment,
  SeasonalRiskPeriod,
  SeasonalCashFlowForecast,
  MONTH_NAMES,
  MONTH_KEYS,
} from './types';
import { getStoredPattern, storedToSeasonalPattern } from './detection';

/**
 * Adjust a payment prediction based on seasonal pattern
 */
export async function adjustPredictionForSeason(
  clientId: string,
  baseDaysToPay: number,
  targetDate: Date
): Promise<PredictionAdjustment> {
  const month = targetDate.getMonth();
  const quarter = Math.floor(month / 3) + 1;

  // Get pattern for client
  const stored = await getStoredPattern(clientId);

  if (!stored || stored.confidenceScore < 0.3) {
    // No pattern or low confidence - return unadjusted
    return {
      originalDaysToPay: baseDaysToPay,
      adjustedDaysToPay: baseDaysToPay,
      seasonalMultiplier: 1.0,
      month,
      quarter,
      confidence: 0,
      reasoning: 'No seasonal pattern available for this client',
    };
  }

  const pattern = storedToSeasonalPattern(stored);
  const multiplier = pattern.monthly[MONTH_KEYS[month]];

  // Higher multiplier = faster payment = fewer days
  // Adjusted = base / multiplier
  const adjustedDays = Math.round(baseDaysToPay / multiplier);

  let reasoning: string;
  if (multiplier > 1.05) {
    reasoning = `${MONTH_NAMES[month]} typically sees ${Math.round((multiplier - 1) * 100)}% faster payments`;
  } else if (multiplier < 0.95) {
    reasoning = `${MONTH_NAMES[month]} typically sees ${Math.round((1 - multiplier) * 100)}% slower payments`;
  } else {
    reasoning = `${MONTH_NAMES[month]} shows typical payment behavior`;
  }

  return {
    originalDaysToPay: baseDaysToPay,
    adjustedDaysToPay: adjustedDays,
    seasonalMultiplier: multiplier,
    month,
    quarter,
    confidence: pattern.confidenceScore,
    reasoning,
  };
}

/**
 * Get seasonal risk periods for a client
 * Identifies months where payment delays are likely
 */
export async function getSeasonalRiskPeriods(
  clientId: string
): Promise<SeasonalRiskPeriod[]> {
  const stored = await getStoredPattern(clientId);

  if (!stored) {
    return [];
  }

  const pattern = storedToSeasonalPattern(stored);
  const risks: SeasonalRiskPeriod[] = [];

  for (let month = 0; month < 12; month++) {
    const multiplier = pattern.monthly[MONTH_KEYS[month]];

    let riskLevel: SeasonalRiskPeriod['riskLevel'];
    let recommendation: string;
    let expectedDaysDelay: number;

    if (multiplier < 0.75) {
      riskLevel = 'critical';
      expectedDaysDelay = Math.round((1 / multiplier - 1) * 30);
      recommendation = 'Consider early outreach and flexible payment terms';
    } else if (multiplier < 0.9) {
      riskLevel = 'high';
      expectedDaysDelay = Math.round((1 / multiplier - 1) * 30);
      recommendation = 'Plan for delayed payment, send early reminders';
    } else if (multiplier < 0.95) {
      riskLevel = 'medium';
      expectedDaysDelay = Math.round((1 / multiplier - 1) * 30);
      recommendation = 'Monitor closely, standard follow-up procedures';
    } else {
      riskLevel = 'low';
      expectedDaysDelay = 0;
      recommendation = 'Normal payment behavior expected';
    }

    risks.push({
      month,
      monthName: MONTH_NAMES[month],
      riskLevel,
      multiplier,
      expectedDaysDelay,
      recommendation,
    });
  }

  // Sort by risk level (critical first)
  const riskOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  return risks.sort((a, b) => riskOrder[a.riskLevel] - riskOrder[b.riskLevel]);
}

/**
 * Generate seasonal cash flow forecast for a client
 */
export async function forecastSeasonalCashFlow(
  clientId: string,
  monthsAhead: number = 12,
  expectedMonthlyInflow: number
): Promise<SeasonalCashFlowForecast | null> {
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: { name: true },
  });

  const stored = await getStoredPattern(clientId);

  if (!stored) {
    return null;
  }

  const pattern = storedToSeasonalPattern(stored);
  const forecastMonths: SeasonalCashFlowForecast['forecastMonths'] = [];

  const now = new Date();
  let totalExpected = 0;
  let totalAdjusted = 0;

  for (let i = 0; i < monthsAhead; i++) {
    const targetDate = new Date(now);
    targetDate.setMonth(targetDate.getMonth() + i);

    const month = targetDate.getMonth();
    const year = targetDate.getFullYear();
    const multiplier = pattern.monthly[MONTH_KEYS[month]];

    // For cash flow, higher multiplier = money comes in faster
    // but total amount stays same - just timing shifts
    const adjustedInflow = Math.round(expectedMonthlyInflow * multiplier);

    totalExpected += expectedMonthlyInflow;
    totalAdjusted += adjustedInflow;

    forecastMonths.push({
      month,
      monthName: MONTH_NAMES[month],
      year,
      expectedInflow: expectedMonthlyInflow,
      seasonalMultiplier: multiplier,
      adjustedInflow,
      confidence: pattern.confidenceScore,
    });
  }

  return {
    clientId,
    clientName: client?.name,
    forecastMonths,
    totalExpected,
    totalAdjusted,
    calculatedAt: new Date(),
  };
}

/**
 * Get the best months to collect from a client
 */
export async function getBestCollectionMonths(
  clientId: string,
  count: number = 3
): Promise<Array<{ month: number; monthName: string; multiplier: number }>> {
  const stored = await getStoredPattern(clientId);

  if (!stored) {
    // Return typical best months (often Q4)
    return [
      { month: 11, monthName: 'December', multiplier: 1.0 },
      { month: 10, monthName: 'November', multiplier: 1.0 },
      { month: 3, monthName: 'April', multiplier: 1.0 },
    ].slice(0, count);
  }

  const pattern = storedToSeasonalPattern(stored);

  // Create array with month info
  const months = MONTH_KEYS.map((key, index) => ({
    month: index,
    monthName: MONTH_NAMES[index],
    multiplier: pattern.monthly[key],
  }));

  // Sort by multiplier (highest first)
  return months
    .sort((a, b) => b.multiplier - a.multiplier)
    .slice(0, count);
}

/**
 * Calculate expected payment date considering seasonal patterns
 */
export async function calculateSeasonalPaymentDate(
  clientId: string,
  invoiceDueDate: Date,
  baseAvgDaysToPay: number
): Promise<{
  expectedDate: Date;
  daysFromDue: number;
  confidence: number;
  isAdjusted: boolean;
}> {
  const adjustment = await adjustPredictionForSeason(
    clientId,
    baseAvgDaysToPay,
    invoiceDueDate
  );

  const expectedDate = new Date(invoiceDueDate);
  expectedDate.setDate(expectedDate.getDate() + adjustment.adjustedDaysToPay);

  return {
    expectedDate,
    daysFromDue: adjustment.adjustedDaysToPay,
    confidence: adjustment.confidence,
    isAdjusted: adjustment.adjustedDaysToPay !== adjustment.originalDaysToPay,
  };
}

/**
 * Get seasonal adjustment factor for current period
 */
export async function getCurrentSeasonalFactor(
  clientId: string
): Promise<{
  multiplier: number;
  month: number;
  monthName: string;
  quarter: number;
  quarterlyMultiplier: number;
  confidence: number;
}> {
  const now = new Date();
  const month = now.getMonth();
  const quarter = Math.floor(month / 3) + 1;

  const stored = await getStoredPattern(clientId);

  if (!stored) {
    return {
      multiplier: 1.0,
      month,
      monthName: MONTH_NAMES[month],
      quarter,
      quarterlyMultiplier: 1.0,
      confidence: 0,
    };
  }

  const pattern = storedToSeasonalPattern(stored);

  return {
    multiplier: pattern.monthly[MONTH_KEYS[month]],
    month,
    monthName: MONTH_NAMES[month],
    quarter,
    quarterlyMultiplier: pattern.quarterly[`q${quarter}` as keyof typeof pattern.quarterly],
    confidence: pattern.confidenceScore,
  };
}
