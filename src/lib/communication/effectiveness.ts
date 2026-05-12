/**
 * Communication Effectiveness Core Logic
 *
 * Functions for recording, calculating, and querying
 * communication effectiveness metrics.
 */

import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import {
  CommunicationAttempt,
  EffectivenessMetrics,
  StoredCommunicationEffectiveness,
  TimingHeatmapData,
  DAY_NAMES,
  DayName,
} from './types';

/**
 * Type for day rate field names
 */
type DayRateField = 'sundayRate' | 'mondayRate' | 'tuesdayRate' | 'wednesdayRate' | 'thursdayRate' | 'fridayRate' | 'saturdayRate';

/**
 * Type for accessing day rate fields dynamically
 */
type DayRateRecord = Record<DayRateField, Prisma.Decimal>;

/**
 * Record a communication attempt and update effectiveness stats
 */
export async function recordCommunicationAttempt(
  attempt: CommunicationAttempt
): Promise<void> {
  // Create the follow-up action record (schema field is `type`, not `actionType`)
  await prisma.followUpAction.create({
    data: {
      organizationId: attempt.organizationId,
      clientId: attempt.clientId,
      invoiceId: attempt.invoiceId,
      type: attempt.actionType,
      actionDate: attempt.attemptDate,
      outcome: attempt.outcome,
      dayOfWeek: attempt.dayOfWeek,
      hourOfDay: attempt.hourOfDay,
      responseTimeMs: attempt.responseTimeMs,
      ledToPayment: attempt.ledToPayment,
      daysToPayment: attempt.daysToPayment,
    },
  });

  // Update effectiveness statistics
  await updateEffectivenessStats(
    attempt.organizationId,
    attempt.clientTier ?? null,
    attempt.industry ?? null,
    attempt.actionType,
    attempt.dayOfWeek,
    attempt.hourOfDay,
    attempt.ledToPayment
  );
}

/**
 * Calculate effectiveness rate from an array of attempts
 */
export function calculateEffectivenessRate(
  attempts: Array<{ ledToPayment: boolean; daysToPayment?: number | null }>
): EffectivenessMetrics {
  if (attempts.length === 0) {
    return {
      totalAttempts: 0,
      successfulAttempts: 0,
      successRate: 0,
      confidence: 0,
    };
  }

  const successful = attempts.filter(a => a.ledToPayment);
  const successRate = successful.length / attempts.length;

  // Calculate average days to payment for successful attempts
  const daysToPaymentValues = successful
    .filter(a => a.daysToPayment !== null && a.daysToPayment !== undefined)
    .map(a => a.daysToPayment!);

  const avgDaysToPayment = daysToPaymentValues.length > 0
    ? daysToPaymentValues.reduce((a, b) => a + b, 0) / daysToPaymentValues.length
    : undefined;

  // Confidence based on sample size (95% confidence at 100+ samples)
  const confidence = Math.min(1, attempts.length / 100);

  return {
    totalAttempts: attempts.length,
    successfulAttempts: successful.length,
    successRate,
    avgDaysToPayment,
    confidence,
  };
}

/**
 * Get effectiveness metrics by day and hour for heatmap visualization
 */
export async function getEffectivenessByDayHour(
  organizationId: string,
  filters?: {
    actionType?: string;
    clientTier?: string;
    industry?: string;
    dateFrom?: Date;
    dateTo?: Date;
  }
): Promise<TimingHeatmapData[]> {
  const where: {
    organizationId: string;
    type?: string;
    actionDate?: { gte?: Date; lte?: Date };
    client?: { paymentBehaviorTier?: string; industry?: string };
    dayOfWeek?: { not: null };
    hourOfDay?: { not: null };
  } = {
    organizationId,
    dayOfWeek: { not: null },
    hourOfDay: { not: null },
  };

  if (filters?.actionType) {
    where.type = filters.actionType;
  }

  if (filters?.dateFrom || filters?.dateTo) {
    where.actionDate = {};
    if (filters.dateFrom) where.actionDate.gte = filters.dateFrom;
    if (filters.dateTo) where.actionDate.lte = filters.dateTo;
  }

  if (filters?.clientTier || filters?.industry) {
    where.client = {};
    if (filters.clientTier) where.client.paymentBehaviorTier = filters.clientTier;
    if (filters.industry) where.client.industry = filters.industry;
  }

  // Group by day and hour for total counts
  const totalCounts = await prisma.followUpAction.groupBy({
    by: ['dayOfWeek', 'hourOfDay'],
    where,
    _count: { _all: true },
  });

  // Get success counts separately (can't _sum on boolean)
  const successCounts = await prisma.followUpAction.groupBy({
    by: ['dayOfWeek', 'hourOfDay'],
    where: { ...where, ledToPayment: true },
    _count: { _all: true },
  });

  // Build success count map
  const successMap = new Map<string, number>();
  for (const s of successCounts) {
    if (s.dayOfWeek !== null && s.hourOfDay !== null) {
      successMap.set(`${s.dayOfWeek}-${s.hourOfDay}`, s._count._all);
    }
  }

  const heatmapData: TimingHeatmapData[] = [];

  // Initialize all day/hour combinations
  for (let day = 0; day <= 6; day++) {
    for (let hour = 0; hour <= 23; hour++) {
      const result = totalCounts.find(
        r => r.dayOfWeek === day && r.hourOfDay === hour
      );

      const attempts = result?._count._all ?? 0;
      const successful = successMap.get(`${day}-${hour}`) ?? 0;

      heatmapData.push({
        day,
        dayName: DAY_NAMES[day],
        hour,
        successRate: attempts > 0 ? successful / attempts : 0,
        attempts,
        confidence: Math.min(1, attempts / 20), // Confidence threshold
      });
    }
  }

  return heatmapData;
}

/**
 * Get stored effectiveness data for an organization
 */
export async function getStoredEffectiveness(
  organizationId: string,
  filters?: {
    clientTier?: string;
    industry?: string;
    actionType?: string;
  }
): Promise<StoredCommunicationEffectiveness[]> {
  const where: {
    organizationId: string;
    clientTier?: string | null;
    industry?: string | null;
    actionType?: string;
  } = { organizationId };

  if (filters?.clientTier !== undefined) {
    where.clientTier = filters.clientTier || null;
  }
  if (filters?.industry !== undefined) {
    where.industry = filters.industry || null;
  }
  if (filters?.actionType) {
    where.actionType = filters.actionType;
  }

  const records = await prisma.communicationEffectiveness.findMany({
    where,
    orderBy: [
      { clientTier: 'asc' },
      { industry: 'asc' },
      { actionType: 'asc' },
    ],
  });

  return records.map(r => ({
    id: r.id,
    organizationId: r.organizationId,
    clientTier: r.clientTier,
    industry: r.industry,
    actionType: r.actionType,
    sundayRate: Number(r.sundayRate),
    mondayRate: Number(r.mondayRate),
    tuesdayRate: Number(r.tuesdayRate),
    wednesdayRate: Number(r.wednesdayRate),
    thursdayRate: Number(r.thursdayRate),
    fridayRate: Number(r.fridayRate),
    saturdayRate: Number(r.saturdayRate),
    hourlyRates: r.hourlyRates ? JSON.parse(r.hourlyRates) : null,
    bestDay: r.bestDay,
    bestHour: r.bestHour,
    bestDayHourRate: r.bestDayHourRate ? Number(r.bestDayHourRate) : null,
    totalAttempts: r.totalAttempts,
    successfulAttempts: r.successfulAttempts,
    lastUpdated: r.lastUpdated,
  }));
}

/**
 * Update effectiveness statistics in the database
 */
async function updateEffectivenessStats(
  organizationId: string,
  clientTier: string | null,
  industry: string | null,
  actionType: string,
  dayOfWeek: number,
  hourOfDay: number,
  wasSuccessful: boolean
): Promise<void> {
  // Find or create the effectiveness record
  const existing = await prisma.communicationEffectiveness.findFirst({
    where: {
      organizationId,
      clientTier,
      industry,
      actionType,
    },
  });

  const dayRateField = getDayRateField(dayOfWeek);

  if (existing) {
    // Update existing record
    const currentDayRate = Number((existing as DayRateRecord)[dayRateField] ?? 0);
    const currentTotal = existing.totalAttempts;
    const currentSuccessful = existing.successfulAttempts;

    // Incremental update of success rate
    const newTotal = currentTotal + 1;
    const newSuccessful = currentSuccessful + (wasSuccessful ? 1 : 0);

    // Recalculate day rate (weighted average)
    const newDayRate = (currentDayRate * currentTotal + (wasSuccessful ? 1 : 0)) / newTotal;

    // Update hourly rates
    const hourlyRates = existing.hourlyRates
      ? JSON.parse(existing.hourlyRates)
      : {};
    const hourKey = hourOfDay.toString();
    const currentHourData = hourlyRates[hourKey] || { total: 0, successful: 0 };
    hourlyRates[hourKey] = {
      total: currentHourData.total + 1,
      successful: currentHourData.successful + (wasSuccessful ? 1 : 0),
      rate: (currentHourData.successful + (wasSuccessful ? 1 : 0)) /
            (currentHourData.total + 1),
    };

    // Find best day and hour
    const dayRates = getDayRates({
      ...existing,
      [dayRateField]: newDayRate,
    });
    const bestDayInfo = findBestDay(dayRates);
    const bestHourInfo = findBestHour(hourlyRates);

    await prisma.communicationEffectiveness.update({
      where: { id: existing.id },
      data: {
        [dayRateField]: newDayRate,
        hourlyRates: JSON.stringify(hourlyRates),
        totalAttempts: newTotal,
        successfulAttempts: newSuccessful,
        bestDay: bestDayInfo.day,
        bestHour: bestHourInfo.hour,
        bestDayHourRate: Math.max(bestDayInfo.rate, bestHourInfo.rate),
      },
    });
  } else {
    // Create new record
    const hourlyRates = {
      [hourOfDay.toString()]: {
        total: 1,
        successful: wasSuccessful ? 1 : 0,
        rate: wasSuccessful ? 1 : 0,
      },
    };

    await prisma.communicationEffectiveness.create({
      data: {
        organizationId,
        clientTier,
        industry,
        actionType,
        [dayRateField]: wasSuccessful ? 1 : 0,
        hourlyRates: JSON.stringify(hourlyRates),
        totalAttempts: 1,
        successfulAttempts: wasSuccessful ? 1 : 0,
        bestDay: wasSuccessful ? DAY_NAMES[dayOfWeek] : null,
        bestHour: wasSuccessful ? hourOfDay : null,
        bestDayHourRate: wasSuccessful ? 1 : 0,
      },
    });
  }
}

/**
 * Get the field name for a day's rate
 */
function getDayRateField(dayOfWeek: number): DayRateField {
  const fields: DayRateField[] = [
    'sundayRate',
    'mondayRate',
    'tuesdayRate',
    'wednesdayRate',
    'thursdayRate',
    'fridayRate',
    'saturdayRate',
  ];
  return fields[dayOfWeek];
}

/**
 * Extract day rates from record
 */
function getDayRates(record: {
  sundayRate: unknown;
  mondayRate: unknown;
  tuesdayRate: unknown;
  wednesdayRate: unknown;
  thursdayRate: unknown;
  fridayRate: unknown;
  saturdayRate: unknown;
}): Array<{ day: DayName; rate: number }> {
  return [
    { day: 'sunday' as DayName, rate: Number(record.sundayRate) },
    { day: 'monday' as DayName, rate: Number(record.mondayRate) },
    { day: 'tuesday' as DayName, rate: Number(record.tuesdayRate) },
    { day: 'wednesday' as DayName, rate: Number(record.wednesdayRate) },
    { day: 'thursday' as DayName, rate: Number(record.thursdayRate) },
    { day: 'friday' as DayName, rate: Number(record.fridayRate) },
    { day: 'saturday' as DayName, rate: Number(record.saturdayRate) },
  ];
}

/**
 * Find best performing day
 */
function findBestDay(
  rates: Array<{ day: DayName; rate: number }>
): { day: string | null; rate: number } {
  const best = rates.reduce(
    (max, curr) => (curr.rate > max.rate ? curr : max),
    { day: null as DayName | null, rate: 0 }
  );
  return { day: best.day, rate: best.rate };
}

/**
 * Find best performing hour
 */
function findBestHour(
  hourlyRates: Record<string, { rate: number }>
): { hour: number | null; rate: number } {
  let bestHour: number | null = null;
  let bestRate = 0;

  for (const [hour, data] of Object.entries(hourlyRates)) {
    if (data.rate > bestRate) {
      bestRate = data.rate;
      bestHour = parseInt(hour);
    }
  }

  return { hour: bestHour, rate: bestRate };
}
