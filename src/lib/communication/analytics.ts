/**
 * Communication Analytics
 *
 * Functions for aggregating and analyzing communication effectiveness data.
 * Provides dashboard metrics and channel comparisons.
 */

import { prisma } from '@/lib/prisma';
import {
  ChannelEffectiveness,
  ActionType,
  DAY_NAMES,
} from './types';

/**
 * Communication statistics summary
 */
export interface CommunicationStats {
  totalAttempts: number;
  successfulAttempts: number;
  overallSuccessRate: number;
  avgDaysToPayment: number | null;
  avgResponseTimeMs: number | null;
  mostEffectiveChannel: ActionType | null;
  mostEffectiveDay: string | null;
  mostEffectiveHour: number | null;
  period: {
    start: Date;
    end: Date;
  };
}

/**
 * Get aggregated communication statistics for an organization
 */
export async function aggregateCommunicationStats(
  organizationId: string,
  dateRange?: { start: Date; end: Date }
): Promise<CommunicationStats> {
  const where: {
    organizationId: string;
    actionDate?: { gte?: Date; lte?: Date };
  } = { organizationId };

  if (dateRange) {
    where.actionDate = {
      gte: dateRange.start,
      lte: dateRange.end,
    };
  }

  // Get total count and averages
  const [totalCount, successCount, avgData] = await Promise.all([
    prisma.followUpAction.count({ where }),
    prisma.followUpAction.count({ where: { ...where, ledToPayment: true } }),
    prisma.followUpAction.aggregate({
      where,
      _avg: {
        responseTimeMs: true,
        daysToPayment: true,
      },
    }),
  ]);

  const totalAttempts = totalCount;
  const successfulAttempts = successCount;

  // Get most effective channel
  const channelStats = await getChannelEffectiveness(organizationId, dateRange);
  const mostEffectiveChannel = channelStats.length > 0
    ? channelStats.reduce((best, curr) =>
        curr.successRate > best.successRate ? curr : best
      ).channel
    : null;

  // Get most effective day
  const dayStats = await prisma.followUpAction.groupBy({
    by: ['dayOfWeek'],
    where: {
      ...where,
      dayOfWeek: { not: null },
    },
    _count: { _all: true },
  });

  // Get success counts by day
  const daySuccessCounts = await prisma.followUpAction.groupBy({
    by: ['dayOfWeek'],
    where: {
      ...where,
      dayOfWeek: { not: null },
      ledToPayment: true,
    },
    _count: { _all: true },
  });

  const daySuccessMap = new Map<number, number>();
  for (const d of daySuccessCounts) {
    if (d.dayOfWeek !== null) {
      daySuccessMap.set(d.dayOfWeek, d._count._all);
    }
  }

  let mostEffectiveDay: string | null = null;
  let bestDayRate = 0;

  for (const day of dayStats) {
    if (day.dayOfWeek !== null) {
      const successCnt = daySuccessMap.get(day.dayOfWeek) ?? 0;
      const total = day._count._all;
      const rate = total > 0 ? successCnt / total : 0;
      if (rate > bestDayRate) {
        bestDayRate = rate;
        mostEffectiveDay = DAY_NAMES[day.dayOfWeek];
      }
    }
  }

  // Get most effective hour
  const hourStats = await prisma.followUpAction.groupBy({
    by: ['hourOfDay'],
    where: {
      ...where,
      hourOfDay: { not: null },
    },
    _count: { _all: true },
  });

  const hourSuccessCounts = await prisma.followUpAction.groupBy({
    by: ['hourOfDay'],
    where: {
      ...where,
      hourOfDay: { not: null },
      ledToPayment: true,
    },
    _count: { _all: true },
  });

  const hourSuccessMap = new Map<number, number>();
  for (const h of hourSuccessCounts) {
    if (h.hourOfDay !== null) {
      hourSuccessMap.set(h.hourOfDay, h._count._all);
    }
  }

  let mostEffectiveHour: number | null = null;
  let bestHourRate = 0;

  for (const hour of hourStats) {
    if (hour.hourOfDay !== null) {
      const successCnt = hourSuccessMap.get(hour.hourOfDay) ?? 0;
      const total = hour._count._all;
      const rate = total > 0 ? successCnt / total : 0;
      if (rate > bestHourRate) {
        bestHourRate = rate;
        mostEffectiveHour = hour.hourOfDay;
      }
    }
  }

  // Determine period
  const periodStart = dateRange?.start ?? new Date(0);
  const periodEnd = dateRange?.end ?? new Date();

  return {
    totalAttempts,
    successfulAttempts,
    overallSuccessRate: totalAttempts > 0 ? successfulAttempts / totalAttempts : 0,
    avgDaysToPayment: avgData._avg?.daysToPayment ?? null,
    avgResponseTimeMs: avgData._avg?.responseTimeMs
      ? Math.round(avgData._avg.responseTimeMs)
      : null,
    mostEffectiveChannel,
    mostEffectiveDay,
    mostEffectiveHour,
    period: {
      start: periodStart,
      end: periodEnd,
    },
  };
}

/**
 * Get effectiveness breakdown by communication channel
 */
export async function getChannelEffectiveness(
  organizationId: string,
  dateRange?: { start: Date; end: Date }
): Promise<ChannelEffectiveness[]> {
  const where: {
    organizationId: string;
    actionDate?: { gte?: Date; lte?: Date };
  } = { organizationId };

  if (dateRange) {
    where.actionDate = {
      gte: dateRange.start,
      lte: dateRange.end,
    };
  }

  // Group by FollowUpAction.type (the schema field). The CommunicationEffectiveness
  // table keeps its own `actionType` column — don't conflate the two.
  const channelCounts = await prisma.followUpAction.groupBy({
    by: ['type'],
    where,
    _count: { _all: true },
    _avg: {
      daysToPayment: true,
    },
  });

  const channelSuccessCounts = await prisma.followUpAction.groupBy({
    by: ['type'],
    where: { ...where, ledToPayment: true },
    _count: { _all: true },
  });

  const successMap = new Map<string, number>();
  for (const c of channelSuccessCounts) {
    successMap.set(c.type, c._count._all);
  }

  const results: ChannelEffectiveness[] = [];

  for (const group of channelCounts) {
    const successfulCount = successMap.get(group.type) ?? 0;
    const totalCount = group._count._all;

    const channelBest = await prisma.communicationEffectiveness.findFirst({
      where: {
        organizationId,
        actionType: group.type,
      },
      select: {
        bestDay: true,
        bestHour: true,
      },
    });

    results.push({
      channel: group.type as ActionType,
      totalAttempts: totalCount,
      successfulAttempts: successfulCount,
      successRate: totalCount > 0 ? successfulCount / totalCount : 0,
      avgDaysToPayment: group._avg?.daysToPayment != null ? Number(group._avg.daysToPayment) : null,
      bestDay: channelBest?.bestDay ?? null,
      bestHour: channelBest?.bestHour ?? null,
    });
  }

  return results.sort((a, b) => b.successRate - a.successRate);
}

/**
 * Refresh the CommunicationEffectiveness table for an organization
 */
export async function updateEffectivenessTable(
  organizationId: string
): Promise<{ updated: number; created: number }> {
  // Get all follow-up actions grouped by tier, industry, action type
  const groups = await prisma.followUpAction.findMany({
    where: {
      organizationId,
      dayOfWeek: { not: null },
      hourOfDay: { not: null },
    },
    include: {
      client: {
        select: {
          paymentBehaviorTier: true,
          industry: true,
        },
      },
    },
  });

  // Group by tier/industry/type (FollowUpAction.type — we'll write it as
  // actionType on the CommunicationEffectiveness row at upsert time).
  const aggregated = new Map<string, {
    clientTier: string | null;
    industry: string | null;
    actionType: string;
    dayStats: number[];
    daySuccesses: number[];
    hourStats: Record<number, { total: number; successful: number }>;
    totalAttempts: number;
    successfulAttempts: number;
  }>();

  for (const action of groups) {
    const key = `${action.client?.paymentBehaviorTier ?? 'null'}|${action.client?.industry ?? 'null'}|${action.type}`;

    if (!aggregated.has(key)) {
      aggregated.set(key, {
        clientTier: action.client?.paymentBehaviorTier ?? null,
        industry: action.client?.industry ?? null,
        actionType: action.type,
        dayStats: [0, 0, 0, 0, 0, 0, 0],
        daySuccesses: [0, 0, 0, 0, 0, 0, 0],
        hourStats: {},
        totalAttempts: 0,
        successfulAttempts: 0,
      });
    }

    const agg = aggregated.get(key)!;
    const day = action.dayOfWeek!;
    const hour = action.hourOfDay!;

    agg.dayStats[day]++;
    if (action.ledToPayment) agg.daySuccesses[day]++;

    if (!agg.hourStats[hour]) {
      agg.hourStats[hour] = { total: 0, successful: 0 };
    }
    agg.hourStats[hour].total++;
    if (action.ledToPayment) agg.hourStats[hour].successful++;

    agg.totalAttempts++;
    if (action.ledToPayment) agg.successfulAttempts++;
  }

  let updated = 0;
  let created = 0;

  // Upsert effectiveness records
  const aggregatedValues = Array.from(aggregated.values());
  for (const agg of aggregatedValues) {
    const dayRates = agg.dayStats.map((total: number, i: number) =>
      total > 0 ? agg.daySuccesses[i] / total : 0
    );

    const hourlyRates: Record<string, number> = {};
    for (const [hour, stats] of Object.entries(agg.hourStats)) {
      const typedStats = stats as { total: number; successful: number };
      hourlyRates[hour] = typedStats.total > 0 ? typedStats.successful / typedStats.total : 0;
    }

    // Find best day and hour
    let bestDay: string | null = null;
    let bestDayRate = 0;
    dayRates.forEach((rate: number, i: number) => {
      if (rate > bestDayRate) {
        bestDayRate = rate;
        bestDay = DAY_NAMES[i];
      }
    });

    let bestHour: number | null = null;
    let bestHourRate = 0;
    for (const [hour, rate] of Object.entries(hourlyRates)) {
      if (rate > bestHourRate) {
        bestHourRate = rate;
        bestHour = parseInt(hour);
      }
    }

    const existing = await prisma.communicationEffectiveness.findFirst({
      where: {
        organizationId,
        clientTier: agg.clientTier,
        industry: agg.industry,
        actionType: agg.actionType,
      },
    });

    const data = {
      sundayRate: dayRates[0],
      mondayRate: dayRates[1],
      tuesdayRate: dayRates[2],
      wednesdayRate: dayRates[3],
      thursdayRate: dayRates[4],
      fridayRate: dayRates[5],
      saturdayRate: dayRates[6],
      hourlyRates: JSON.stringify(hourlyRates),
      bestDay,
      bestHour,
      bestDayHourRate: Math.max(bestDayRate, bestHourRate),
      totalAttempts: agg.totalAttempts,
      successfulAttempts: agg.successfulAttempts,
    };

    if (existing) {
      await prisma.communicationEffectiveness.update({
        where: { id: existing.id },
        data,
      });
      updated++;
    } else {
      await prisma.communicationEffectiveness.create({
        data: {
          organizationId,
          clientTier: agg.clientTier,
          industry: agg.industry,
          actionType: agg.actionType,
          ...data,
        },
      });
      created++;
    }
  }

  return { updated, created };
}

/**
 * Get communication trends over time
 */
export async function getCommunicationTrends(
  organizationId: string,
  periodDays: number = 30
): Promise<Array<{
  date: string;
  attempts: number;
  successful: number;
  successRate: number;
}>> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - periodDays);
  startDate.setHours(0, 0, 0, 0);

  const actions = await prisma.followUpAction.findMany({
    where: {
      organizationId,
      actionDate: { gte: startDate },
    },
    select: {
      actionDate: true,
      ledToPayment: true,
    },
    orderBy: { actionDate: 'asc' },
  });

  // Group by date
  const byDate = new Map<string, { attempts: number; successful: number }>();

  for (const action of actions) {
    const dateKey = action.actionDate.toISOString().split('T')[0];

    if (!byDate.has(dateKey)) {
      byDate.set(dateKey, { attempts: 0, successful: 0 });
    }

    const day = byDate.get(dateKey)!;
    day.attempts++;
    if (action.ledToPayment) day.successful++;
  }

  return Array.from(byDate.entries()).map(([date, stats]) => ({
    date,
    attempts: stats.attempts,
    successful: stats.successful,
    successRate: stats.attempts > 0 ? stats.successful / stats.attempts : 0,
  }));
}
