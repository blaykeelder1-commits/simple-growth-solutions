/**
 * Seasonal Pattern Detection
 *
 * Algorithms for detecting seasonal payment patterns
 * from historical payment data.
 */

import { prisma } from '@/lib/prisma';
import {
  SeasonalPattern,
  MonthlyMultipliers,
  QuarterlyMultipliers,
  PaymentTimingData,
  PatternConfidence,
  StoredSeasonalPattern,
  MONTH_KEYS,
} from './types';

/**
 * Minimum data points needed for reliable pattern detection
 */
const MIN_DATA_POINTS = 12;
const IDEAL_DATA_POINTS = 36;

/**
 * Detect seasonal pattern for a specific client
 */
export async function detectClientSeasonalPattern(
  clientId: string
): Promise<SeasonalPattern | null> {
  // Get all payments for this client
  const payments = await prisma.invoicePayment.findMany({
    where: {
      invoice: { clientId },
      daysFromDue: { not: null },
    },
    select: {
      paymentDate: true,
      amount: true,
      daysFromDue: true,
      invoice: {
        select: {
          dueDate: true,
        },
      },
    },
    orderBy: { paymentDate: 'asc' },
  });

  if (payments.length < MIN_DATA_POINTS) {
    return null;
  }

  // Convert to timing data
  const timingData: PaymentTimingData[] = payments.map(p => ({
    paymentDate: p.paymentDate,
    dueDate: p.invoice.dueDate,
    amount: Number(p.amount),
    daysFromDue: p.daysFromDue!,
    month: p.paymentDate.getMonth(),
    quarter: Math.floor(p.paymentDate.getMonth() / 3) + 1,
    year: p.paymentDate.getFullYear(),
  }));

  const monthly = calculateMonthlyMultipliers(timingData);
  const quarterly = calculateQuarterlyMultipliers(timingData);
  const confidence = calculatePatternConfidence(timingData.length);

  return {
    clientId,
    monthly,
    quarterly,
    dataPoints: timingData.length,
    confidenceScore: confidence.score,
    lastUpdated: new Date(),
  };
}

/**
 * Detect seasonal patterns across an industry
 */
export async function detectIndustrySeasonalPattern(
  industry: string
): Promise<SeasonalPattern | null> {
  // Get all payments for clients in this industry
  const payments = await prisma.invoicePayment.findMany({
    where: {
      invoice: {
        client: { industry },
      },
      daysFromDue: { not: null },
    },
    select: {
      paymentDate: true,
      amount: true,
      daysFromDue: true,
      invoice: {
        select: {
          dueDate: true,
          client: { select: { id: true } },
        },
      },
    },
    orderBy: { paymentDate: 'asc' },
  });

  if (payments.length < MIN_DATA_POINTS) {
    return null;
  }

  const timingData: PaymentTimingData[] = payments.map(p => ({
    paymentDate: p.paymentDate,
    dueDate: p.invoice.dueDate,
    amount: Number(p.amount),
    daysFromDue: p.daysFromDue!,
    month: p.paymentDate.getMonth(),
    quarter: Math.floor(p.paymentDate.getMonth() / 3) + 1,
    year: p.paymentDate.getFullYear(),
  }));

  const monthly = calculateMonthlyMultipliers(timingData);
  const quarterly = calculateQuarterlyMultipliers(timingData);
  const confidence = calculatePatternConfidence(timingData.length);

  return {
    clientId: `industry:${industry}`,
    monthly,
    quarterly,
    dataPoints: timingData.length,
    confidenceScore: confidence.score,
    lastUpdated: new Date(),
  };
}

/**
 * Calculate monthly multipliers from payment data
 * Multiplier > 1.0 means faster payments, < 1.0 means slower
 */
export function calculateMonthlyMultipliers(
  payments: PaymentTimingData[]
): MonthlyMultipliers {
  // Group payments by month
  const monthlyData: number[][] = Array.from({ length: 12 }, () => []);

  for (const payment of payments) {
    monthlyData[payment.month].push(payment.daysFromDue);
  }

  // Calculate overall average days from due
  const overallAvg =
    payments.reduce((sum, p) => sum + p.daysFromDue, 0) / payments.length;

  // Calculate multiplier for each month
  // Lower days from due = faster payment = higher multiplier
  const multipliers: number[] = monthlyData.map(monthPayments => {
    if (monthPayments.length === 0) return 1.0;

    const monthAvg =
      monthPayments.reduce((sum, d) => sum + d, 0) / monthPayments.length;

    // If overall avg is 0, avoid division issues
    if (Math.abs(overallAvg) < 0.1) return 1.0;

    // Multiplier: if they pay faster (lower days), multiplier > 1
    // Formula: (overallAvg - monthAvg) / overallAvg + 1
    // Capped at 0.5 to 2.0 for reasonableness
    const rawMultiplier = 1 + (overallAvg - monthAvg) / Math.max(30, Math.abs(overallAvg));
    return Math.max(0.5, Math.min(2.0, rawMultiplier));
  });

  return {
    january: round(multipliers[0]),
    february: round(multipliers[1]),
    march: round(multipliers[2]),
    april: round(multipliers[3]),
    may: round(multipliers[4]),
    june: round(multipliers[5]),
    july: round(multipliers[6]),
    august: round(multipliers[7]),
    september: round(multipliers[8]),
    october: round(multipliers[9]),
    november: round(multipliers[10]),
    december: round(multipliers[11]),
  };
}

/**
 * Calculate quarterly multipliers from payment data
 */
export function calculateQuarterlyMultipliers(
  payments: PaymentTimingData[]
): QuarterlyMultipliers {
  // Group payments by quarter
  const quarterlyData: number[][] = [[], [], [], []];

  for (const payment of payments) {
    const quarter = Math.floor(payment.month / 3);
    quarterlyData[quarter].push(payment.daysFromDue);
  }

  const overallAvg =
    payments.reduce((sum, p) => sum + p.daysFromDue, 0) / payments.length;

  const multipliers = quarterlyData.map(quarterPayments => {
    if (quarterPayments.length === 0) return 1.0;

    const quarterAvg =
      quarterPayments.reduce((sum, d) => sum + d, 0) / quarterPayments.length;

    if (Math.abs(overallAvg) < 0.1) return 1.0;

    const rawMultiplier = 1 + (overallAvg - quarterAvg) / Math.max(30, Math.abs(overallAvg));
    return Math.max(0.5, Math.min(2.0, rawMultiplier));
  });

  return {
    q1: round(multipliers[0]),
    q2: round(multipliers[1]),
    q3: round(multipliers[2]),
    q4: round(multipliers[3]),
  };
}

/**
 * Calculate confidence level based on data points
 */
export function calculatePatternConfidence(dataPoints: number): PatternConfidence {
  // Years of data (assuming ~12 payments per year)
  const yearsOfData = dataPoints / 12;

  let score: number;
  let level: 'low' | 'medium' | 'high';
  let message: string;

  if (dataPoints < MIN_DATA_POINTS) {
    score = dataPoints / MIN_DATA_POINTS * 0.3;
    level = 'low';
    message = 'Insufficient data for reliable pattern detection';
  } else if (dataPoints < 24) {
    score = 0.3 + ((dataPoints - MIN_DATA_POINTS) / 12) * 0.3;
    level = 'low';
    message = 'Limited data - patterns may not be stable';
  } else if (dataPoints < IDEAL_DATA_POINTS) {
    score = 0.6 + ((dataPoints - 24) / 12) * 0.25;
    level = 'medium';
    message = 'Moderate confidence - continue collecting data';
  } else {
    score = Math.min(0.95, 0.85 + (dataPoints - IDEAL_DATA_POINTS) / 100);
    level = 'high';
    message = 'High confidence - pattern is well established';
  }

  return {
    score: round(score),
    level,
    dataPoints,
    yearsOfData: round(yearsOfData),
    message,
  };
}

/**
 * Save detected pattern to database
 */
export async function saveSeasonalPattern(
  pattern: SeasonalPattern
): Promise<void> {
  await prisma.clientSeasonalPattern.upsert({
    where: { clientId: pattern.clientId },
    update: {
      januaryMultiplier: pattern.monthly.january,
      februaryMultiplier: pattern.monthly.february,
      marchMultiplier: pattern.monthly.march,
      aprilMultiplier: pattern.monthly.april,
      mayMultiplier: pattern.monthly.may,
      juneMultiplier: pattern.monthly.june,
      julyMultiplier: pattern.monthly.july,
      augustMultiplier: pattern.monthly.august,
      septemberMultiplier: pattern.monthly.september,
      octoberMultiplier: pattern.monthly.october,
      novemberMultiplier: pattern.monthly.november,
      decemberMultiplier: pattern.monthly.december,
      q1Multiplier: pattern.quarterly.q1,
      q2Multiplier: pattern.quarterly.q2,
      q3Multiplier: pattern.quarterly.q3,
      q4Multiplier: pattern.quarterly.q4,
      dataPoints: pattern.dataPoints,
      confidenceScore: pattern.confidenceScore,
    },
    create: {
      clientId: pattern.clientId,
      januaryMultiplier: pattern.monthly.january,
      februaryMultiplier: pattern.monthly.february,
      marchMultiplier: pattern.monthly.march,
      aprilMultiplier: pattern.monthly.april,
      mayMultiplier: pattern.monthly.may,
      juneMultiplier: pattern.monthly.june,
      julyMultiplier: pattern.monthly.july,
      augustMultiplier: pattern.monthly.august,
      septemberMultiplier: pattern.monthly.september,
      octoberMultiplier: pattern.monthly.october,
      novemberMultiplier: pattern.monthly.november,
      decemberMultiplier: pattern.monthly.december,
      q1Multiplier: pattern.quarterly.q1,
      q2Multiplier: pattern.quarterly.q2,
      q3Multiplier: pattern.quarterly.q3,
      q4Multiplier: pattern.quarterly.q4,
      dataPoints: pattern.dataPoints,
      confidenceScore: pattern.confidenceScore,
    },
  });
}

/**
 * Get stored pattern for a client
 */
export async function getStoredPattern(
  clientId: string
): Promise<StoredSeasonalPattern | null> {
  const pattern = await prisma.clientSeasonalPattern.findUnique({
    where: { clientId },
  });

  if (!pattern) return null;

  return {
    id: pattern.id,
    clientId: pattern.clientId,
    januaryMultiplier: Number(pattern.januaryMultiplier),
    februaryMultiplier: Number(pattern.februaryMultiplier),
    marchMultiplier: Number(pattern.marchMultiplier),
    aprilMultiplier: Number(pattern.aprilMultiplier),
    mayMultiplier: Number(pattern.mayMultiplier),
    juneMultiplier: Number(pattern.juneMultiplier),
    julyMultiplier: Number(pattern.julyMultiplier),
    augustMultiplier: Number(pattern.augustMultiplier),
    septemberMultiplier: Number(pattern.septemberMultiplier),
    octoberMultiplier: Number(pattern.octoberMultiplier),
    novemberMultiplier: Number(pattern.novemberMultiplier),
    decemberMultiplier: Number(pattern.decemberMultiplier),
    q1Multiplier: Number(pattern.q1Multiplier),
    q2Multiplier: Number(pattern.q2Multiplier),
    q3Multiplier: Number(pattern.q3Multiplier),
    q4Multiplier: Number(pattern.q4Multiplier),
    dataPoints: pattern.dataPoints,
    confidenceScore: Number(pattern.confidenceScore),
    lastUpdated: pattern.lastUpdated,
    createdAt: pattern.createdAt,
  };
}

/**
 * Convert stored pattern to SeasonalPattern
 */
export function storedToSeasonalPattern(stored: StoredSeasonalPattern): SeasonalPattern {
  return {
    clientId: stored.clientId,
    monthly: {
      january: stored.januaryMultiplier,
      february: stored.februaryMultiplier,
      march: stored.marchMultiplier,
      april: stored.aprilMultiplier,
      may: stored.mayMultiplier,
      june: stored.juneMultiplier,
      july: stored.julyMultiplier,
      august: stored.augustMultiplier,
      september: stored.septemberMultiplier,
      october: stored.octoberMultiplier,
      november: stored.novemberMultiplier,
      december: stored.decemberMultiplier,
    },
    quarterly: {
      q1: stored.q1Multiplier,
      q2: stored.q2Multiplier,
      q3: stored.q3Multiplier,
      q4: stored.q4Multiplier,
    },
    dataPoints: stored.dataPoints,
    confidenceScore: stored.confidenceScore,
    lastUpdated: stored.lastUpdated,
  };
}

/**
 * Get multiplier for a specific month from a pattern
 */
export function getMonthMultiplier(
  pattern: SeasonalPattern,
  month: number
): number {
  const key = MONTH_KEYS[month];
  return pattern.monthly[key];
}

/**
 * Round to 2 decimal places
 */
function round(value: number): number {
  return Math.round(value * 100) / 100;
}
