/**
 * Communication Timing Recommendations
 *
 * Functions for recommending optimal contact times
 * based on historical effectiveness data.
 */

import { prisma } from '@/lib/prisma';
import {
  ContactRecommendation,
  ContactRecommendationOptions,
  SchedulingConstraints,
  ScheduledFollowUp,
  ActionType,
  DAY_NAMES,
  DayName,
} from './types';
import { getStoredEffectiveness } from './effectiveness';

/**
 * Default business hours constraints
 */
const DEFAULT_CONSTRAINTS: SchedulingConstraints = {
  maxContactsPerHour: 10,
  maxContactsPerDay: 50,
  businessHoursStart: 9,
  businessHoursEnd: 17,
  excludeWeekends: true,
  timezone: 'America/New_York',
};

/**
 * Get best contact time recommendation for a specific client
 */
export async function getBestContactTime(
  clientId: string,
  options: ContactRecommendationOptions = {}
): Promise<ContactRecommendation | null> {
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: {
      id: true,
      name: true,
      organizationId: true,
      paymentBehaviorTier: true,
      industry: true,
      bestContactDay: true,
      bestContactHour: true,
    },
  });

  if (!client) {
    return null;
  }

  const reasoning: string[] = [];

  // Check if client has stored best time
  if (client.bestContactDay && client.bestContactHour !== null) {
    const dayNumber = DAY_NAMES.indexOf(client.bestContactDay.toLowerCase() as DayName);
    if (dayNumber >= 0) {
      reasoning.push('Based on client-specific historical success');
      return createRecommendation(
        client.id,
        client.name,
        dayNumber,
        client.bestContactHour,
        0.75, // High confidence for client-specific data
        reasoning
      );
    }
  }

  // Fall back to tier/industry-based recommendation
  return getBestContactTimeByTier(
    client.organizationId,
    client.paymentBehaviorTier ?? undefined,
    client.industry ?? undefined,
    options,
    client.id,
    client.name
  );
}

/**
 * Get best contact time based on client tier and industry
 */
export async function getBestContactTimeByTier(
  organizationId: string,
  tier?: string,
  industry?: string,
  options: ContactRecommendationOptions = {},
  clientId?: string,
  clientName?: string
): Promise<ContactRecommendation | null> {
  const {
    preferredDays,
    preferredHoursStart = 9,
    preferredHoursEnd = 17,
    excludeWeekends = true,
    minConfidence = 0.3,
  } = options;

  const reasoning: string[] = [];

  // Get effectiveness data with various fallback levels
  let effectiveness = await getStoredEffectiveness(organizationId, {
    clientTier: tier,
    industry,
    actionType: 'email',
  });

  if (effectiveness.length === 0 && (tier || industry)) {
    // Try tier-only
    effectiveness = await getStoredEffectiveness(organizationId, {
      clientTier: tier,
      actionType: 'email',
    });
    if (effectiveness.length > 0) {
      reasoning.push(`Based on tier ${tier} communication patterns`);
    }
  }

  if (effectiveness.length === 0 && industry) {
    // Try industry-only
    effectiveness = await getStoredEffectiveness(organizationId, {
      industry,
      actionType: 'email',
    });
    if (effectiveness.length > 0) {
      reasoning.push(`Based on ${industry} industry patterns`);
    }
  }

  if (effectiveness.length === 0) {
    // Use organization aggregate
    effectiveness = await getStoredEffectiveness(organizationId, {
      actionType: 'email',
    });
    if (effectiveness.length > 0) {
      reasoning.push('Based on organization-wide communication patterns');
    }
  }

  if (effectiveness.length === 0) {
    // Return default recommendation
    reasoning.push('Using industry best practices (no historical data)');
    return createRecommendation(
      clientId ?? 'unknown',
      clientName,
      2, // Tuesday
      10, // 10 AM
      0.3,
      reasoning
    );
  }

  // Aggregate effectiveness data
  const aggregated = aggregateEffectiveness(effectiveness);

  // Find best day considering constraints
  const validDays = getValidDays(preferredDays, excludeWeekends);
  let bestDay = 2; // Default Tuesday
  let bestDayRate = 0;

  for (const day of validDays) {
    const rate = aggregated.dayRates[day];
    if (rate > bestDayRate) {
      bestDayRate = rate;
      bestDay = day;
    }
  }

  // Find best hour considering constraints
  let bestHour = 10; // Default 10 AM
  let bestHourRate = 0;

  for (let hour = preferredHoursStart; hour <= preferredHoursEnd; hour++) {
    const rate = aggregated.hourlyRates[hour] ?? 0;
    if (rate > bestHourRate) {
      bestHourRate = rate;
      bestHour = hour;
    }
  }

  const confidence = Math.min(
    1,
    aggregated.totalAttempts / 100
  );

  if (confidence < minConfidence) {
    reasoning.push('Low confidence due to limited data');
  }

  return createRecommendation(
    clientId ?? 'unknown',
    clientName,
    bestDay,
    bestHour,
    Math.max(bestDayRate, bestHourRate),
    reasoning,
    confidence
  );
}

/**
 * Generate an optimized schedule for multiple follow-ups
 */
export async function getOptimalSchedule(
  invoices: Array<{
    invoiceId: string;
    clientId: string;
    clientName?: string;
    priority: number;
    actionType?: ActionType;
  }>,
  constraints: Partial<SchedulingConstraints> = {}
): Promise<ScheduledFollowUp[]> {
  const mergedConstraints = { ...DEFAULT_CONSTRAINTS, ...constraints };
  const schedule: ScheduledFollowUp[] = [];

  // Get recommendations for each invoice
  const recommendations = await Promise.all(
    invoices.map(async inv => ({
      ...inv,
      recommendation: await getBestContactTime(inv.clientId),
    }))
  );

  // Sort by priority (highest first)
  recommendations.sort((a, b) => b.priority - a.priority);

  // Track slots used per day/hour
  const slotsUsed: Record<string, number> = {};

  // Start scheduling from tomorrow
  const startDate = new Date();
  startDate.setDate(startDate.getDate() + 1);
  startDate.setHours(0, 0, 0, 0);

  // Look up to 14 days ahead
  const maxDays = 14;

  for (const item of recommendations) {
    const rec = item.recommendation;
    let scheduled = false;

    // Try to schedule on recommended day/hour first
    for (let dayOffset = 0; dayOffset < maxDays && !scheduled; dayOffset++) {
      const targetDate = new Date(startDate);
      targetDate.setDate(targetDate.getDate() + dayOffset);

      const dayOfWeek = targetDate.getDay();

      // Skip weekends if excluded
      if (mergedConstraints.excludeWeekends && (dayOfWeek === 0 || dayOfWeek === 6)) {
        continue;
      }

      // Try preferred hour first, then other hours
      const hours = getHourPriority(
        rec?.recommendedHour ?? 10,
        mergedConstraints.businessHoursStart,
        mergedConstraints.businessHoursEnd
      );

      for (const hour of hours) {
        const slotKey = `${targetDate.toDateString()}-${hour}`;
        const dayKey = targetDate.toDateString();

        const hourCount = slotsUsed[slotKey] ?? 0;
        const dayCount = Object.entries(slotsUsed)
          .filter(([key]) => key.startsWith(dayKey))
          .reduce((sum, [, count]) => sum + count, 0);

        if (
          hourCount < mergedConstraints.maxContactsPerHour &&
          dayCount < mergedConstraints.maxContactsPerDay
        ) {
          // Schedule this slot
          const scheduledDate = new Date(targetDate);
          scheduledDate.setHours(hour, 0, 0, 0);

          schedule.push({
            invoiceId: item.invoiceId,
            clientId: item.clientId,
            clientName: item.clientName,
            scheduledDate,
            scheduledHour: hour,
            actionType: item.actionType ?? 'email',
            expectedSuccessRate: rec?.expectedSuccessRate ?? 0.5,
            priority: item.priority,
          });

          slotsUsed[slotKey] = hourCount + 1;
          scheduled = true;
          break;
        }
      }
    }
  }

  return schedule.sort((a, b) => a.scheduledDate.getTime() - b.scheduledDate.getTime());
}

/**
 * Update a client's best contact time based on successful contact
 */
export async function updateClientBestContactTime(
  clientId: string,
  dayOfWeek: number,
  hourOfDay: number
): Promise<void> {
  const dayName = DAY_NAMES[dayOfWeek];

  await prisma.client.update({
    where: { id: clientId },
    data: {
      bestContactDay: dayName,
      bestContactHour: hourOfDay,
    },
  });
}

/**
 * Create a contact recommendation object
 */
function createRecommendation(
  clientId: string,
  clientName: string | undefined,
  dayNumber: number,
  hour: number,
  expectedSuccessRate: number,
  reasoning: string[],
  confidence: number = 0.5
): ContactRecommendation {
  return {
    clientId,
    clientName,
    recommendedDay: DAY_NAMES[dayNumber],
    recommendedDayNumber: dayNumber,
    recommendedHour: hour,
    expectedSuccessRate,
    confidence,
    reasoning,
    alternativeTimes: generateAlternatives(dayNumber, hour),
    calculatedAt: new Date(),
  };
}

/**
 * Generate alternative contact times
 */
function generateAlternatives(
  primaryDay: number,
  primaryHour: number
): ContactRecommendation['alternativeTimes'] {
  const alternatives: ContactRecommendation['alternativeTimes'] = [];

  // Same day, different hours
  if (primaryHour > 9) {
    alternatives.push({
      day: DAY_NAMES[primaryDay],
      dayNumber: primaryDay,
      hour: primaryHour - 1,
      successRate: 0.6,
    });
  }
  if (primaryHour < 16) {
    alternatives.push({
      day: DAY_NAMES[primaryDay],
      dayNumber: primaryDay,
      hour: primaryHour + 1,
      successRate: 0.6,
    });
  }

  // Next best weekday
  const nextDay = primaryDay === 5 ? 1 : primaryDay + 1;
  if (nextDay !== 0 && nextDay !== 6) {
    alternatives.push({
      day: DAY_NAMES[nextDay],
      dayNumber: nextDay,
      hour: primaryHour,
      successRate: 0.55,
    });
  }

  return alternatives;
}

/**
 * Aggregate multiple effectiveness records
 */
function aggregateEffectiveness(
  records: Array<{
    sundayRate: number;
    mondayRate: number;
    tuesdayRate: number;
    wednesdayRate: number;
    thursdayRate: number;
    fridayRate: number;
    saturdayRate: number;
    hourlyRates: Record<string, number> | null;
    totalAttempts: number;
  }>
): {
  dayRates: number[];
  hourlyRates: Record<number, number>;
  totalAttempts: number;
} {
  const dayRates = [0, 0, 0, 0, 0, 0, 0];
  const hourlyRates: Record<number, number> = {};
  let totalAttempts = 0;
  let recordCount = 0;

  for (const record of records) {
    dayRates[0] += record.sundayRate;
    dayRates[1] += record.mondayRate;
    dayRates[2] += record.tuesdayRate;
    dayRates[3] += record.wednesdayRate;
    dayRates[4] += record.thursdayRate;
    dayRates[5] += record.fridayRate;
    dayRates[6] += record.saturdayRate;

    if (record.hourlyRates) {
      for (const [hour, rate] of Object.entries(record.hourlyRates)) {
        const h = parseInt(hour);
        hourlyRates[h] = (hourlyRates[h] ?? 0) + (typeof rate === 'number' ? rate : 0);
      }
    }

    totalAttempts += record.totalAttempts;
    recordCount++;
  }

  // Average the rates
  if (recordCount > 0) {
    for (let i = 0; i < 7; i++) {
      dayRates[i] /= recordCount;
    }
    for (const hour of Object.keys(hourlyRates)) {
      hourlyRates[parseInt(hour)] /= recordCount;
    }
  }

  return { dayRates, hourlyRates, totalAttempts };
}

/**
 * Get valid days based on preferences
 */
function getValidDays(preferredDays?: number[], excludeWeekends?: boolean): number[] {
  if (preferredDays && preferredDays.length > 0) {
    return preferredDays;
  }

  if (excludeWeekends) {
    return [1, 2, 3, 4, 5]; // Monday-Friday
  }

  return [0, 1, 2, 3, 4, 5, 6];
}

/**
 * Get hours in priority order (preferred first, then surrounding)
 */
function getHourPriority(preferred: number, start: number, end: number): number[] {
  const hours: number[] = [preferred];

  for (let offset = 1; offset <= 8; offset++) {
    if (preferred + offset <= end) hours.push(preferred + offset);
    if (preferred - offset >= start) hours.push(preferred - offset);
  }

  return hours.filter(h => h >= start && h <= end);
}
