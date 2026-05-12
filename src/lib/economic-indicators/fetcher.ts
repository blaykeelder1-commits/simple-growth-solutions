/**
 * Economic Indicators Fetcher
 *
 * Main orchestrator for fetching and storing economic indicator data.
 * Handles provider fallback and database caching.
 */

import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import {
  EconomicData,
  IndicatorFetchResult,
  StoredEconomicIndicator,
  EconomicFetchOptions,
} from './types';
import { fetchFredData, checkFredApiHealth } from './providers/fred';
import { generateMockData, generateHistoricalMockData } from './providers/mock';
import { calculatePaymentImpactScore } from './impact';

/**
 * Default cache age in minutes before fetching fresh data
 */
const DEFAULT_CACHE_MAX_AGE_MINUTES = 60;

/**
 * Fetch the latest economic indicators
 * Uses database cache first, then tries FRED API, falls back to mock data
 */
export async function fetchLatestIndicators(
  options: EconomicFetchOptions = {}
): Promise<IndicatorFetchResult> {
  const { useMockData = false, cacheMaxAgeMinutes = DEFAULT_CACHE_MAX_AGE_MINUTES } = options;

  try {
    // Check cache first
    const cached = await getCachedIndicator(cacheMaxAgeMinutes);
    if (cached) {
      return {
        success: true,
        data: dbToEconomicData(cached),
        source: (cached.source as EconomicData['source']) || 'calculated',
        fetchedAt: cached.createdAt,
      };
    }

    // If mock mode, use mock data
    if (useMockData) {
      const mockData = generateMockData(new Date());
      await storeIndicator(mockData);
      return {
        success: true,
        data: mockData,
        source: 'mock',
        fetchedAt: new Date(),
      };
    }

    // Try FRED API
    const fredData = await fetchFredData();
    if (fredData) {
      const completeData: EconomicData = {
        indicatorDate: fredData.indicatorDate || new Date(),
        fedFundsRate: fredData.fedFundsRate ?? null,
        unemploymentRate: fredData.unemploymentRate ?? null,
        inflationRate: fredData.inflationRate ?? null,
        gdpGrowthRate: fredData.gdpGrowthRate ?? null,
        consumerConfidence: fredData.consumerConfidence ?? null,
        businessConfidence: fredData.businessConfidence ?? null,
        creditAvailability: fredData.creditAvailability ?? null,
        supplyChainStress: fredData.supplyChainStress ?? null,
        source: 'fred',
      };

      await storeIndicator(completeData);
      return {
        success: true,
        data: completeData,
        source: 'fred',
        fetchedAt: new Date(),
      };
    }

    // Fall back to mock data
    const mockData = generateMockData(new Date());
    await storeIndicator(mockData);
    return {
      success: true,
      data: mockData,
      source: 'mock',
      fetchedAt: new Date(),
    };
  } catch (error) {
    return {
      success: false,
      data: null,
      error: error instanceof Error ? error.message : 'Unknown error',
      source: 'calculated',
      fetchedAt: new Date(),
    };
  }
}

/**
 * Fetch historical indicators for a date range
 */
export async function fetchHistoricalIndicators(
  startDate: Date,
  endDate: Date
): Promise<StoredEconomicIndicator[]> {
  const indicators = await prisma.economicIndicator.findMany({
    where: {
      indicatorDate: {
        gte: startDate,
        lte: endDate,
      },
    },
    orderBy: { indicatorDate: 'asc' },
  });

  return indicators.map((ind) => ({
    id: ind.id,
    indicatorDate: ind.indicatorDate,
    fedFundsRate: ind.fedFundsRate ? Number(ind.fedFundsRate) : null,
    unemploymentRate: ind.unemploymentRate ? Number(ind.unemploymentRate) : null,
    inflationRate: ind.inflationRate ? Number(ind.inflationRate) : null,
    gdpGrowthRate: ind.gdpGrowthRate ? Number(ind.gdpGrowthRate) : null,
    consumerConfidence: ind.consumerConfidence ? Number(ind.consumerConfidence) : null,
    businessConfidence: ind.businessConfidence ? Number(ind.businessConfidence) : null,
    creditAvailability: ind.creditAvailability ? Number(ind.creditAvailability) : null,
    supplyChainStress: ind.supplyChainStress ? Number(ind.supplyChainStress) : null,
    paymentImpactScore: Number(ind.paymentImpactScore),
    source: ind.source,
    createdAt: ind.createdAt,
  }));
}

/**
 * Get indicator for a specific date (or closest available)
 */
export async function getIndicatorForDate(
  targetDate: Date
): Promise<StoredEconomicIndicator | null> {
  // Try exact date first
  const exact = await prisma.economicIndicator.findFirst({
    where: { indicatorDate: targetDate },
  });

  if (exact) {
    return dbToStoredIndicator(exact);
  }

  // Find closest date
  const closest = await prisma.economicIndicator.findFirst({
    where: {
      indicatorDate: {
        lte: targetDate,
      },
    },
    orderBy: { indicatorDate: 'desc' },
  });

  return closest ? dbToStoredIndicator(closest) : null;
}

/**
 * Refresh indicators from external sources
 */
export async function refreshIndicators(): Promise<{
  success: boolean;
  message: string;
  recordsUpdated: number;
}> {
  try {
    // Check if FRED API is available
    const fredAvailable = await checkFredApiHealth();

    if (fredAvailable) {
      const result = await fetchLatestIndicators({ useMockData: false });
      if (result.success) {
        return {
          success: true,
          message: 'Successfully refreshed from FRED API',
          recordsUpdated: 1,
        };
      }
    }

    // Fall back to mock data generation for missing months
    const historical = generateHistoricalMockData(12);
    let updated = 0;

    for (const data of historical) {
      const existing = await prisma.economicIndicator.findFirst({
        where: { indicatorDate: data.indicatorDate },
      });

      if (!existing) {
        await storeIndicator(data);
        updated++;
      }
    }

    return {
      success: true,
      message: fredAvailable
        ? 'FRED data current, filled gaps with mock data'
        : 'FRED unavailable, used mock data',
      recordsUpdated: updated,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
      recordsUpdated: 0,
    };
  }
}

/**
 * Store an indicator in the database
 */
async function storeIndicator(data: EconomicData): Promise<void> {
  const impactScore = calculatePaymentImpactScore(data);

  await prisma.economicIndicator.upsert({
    where: { indicatorDate: data.indicatorDate },
    update: {
      fedFundsRate: data.fedFundsRate,
      unemploymentRate: data.unemploymentRate,
      inflationRate: data.inflationRate,
      gdpGrowthRate: data.gdpGrowthRate,
      consumerConfidence: data.consumerConfidence,
      businessConfidence: data.businessConfidence,
      creditAvailability: data.creditAvailability,
      supplyChainStress: data.supplyChainStress,
      paymentImpactScore: impactScore,
      source: data.source,
    },
    create: {
      indicatorDate: data.indicatorDate,
      fedFundsRate: data.fedFundsRate,
      unemploymentRate: data.unemploymentRate,
      inflationRate: data.inflationRate,
      gdpGrowthRate: data.gdpGrowthRate,
      consumerConfidence: data.consumerConfidence,
      businessConfidence: data.businessConfidence,
      creditAvailability: data.creditAvailability,
      supplyChainStress: data.supplyChainStress,
      paymentImpactScore: impactScore,
      source: data.source,
    },
  });
}

/**
 * Get cached indicator if fresh enough
 */
async function getCachedIndicator(
  maxAgeMinutes: number
): Promise<StoredEconomicIndicator | null> {
  const cutoff = new Date();
  cutoff.setMinutes(cutoff.getMinutes() - maxAgeMinutes);

  const cached = await prisma.economicIndicator.findFirst({
    where: {
      createdAt: { gte: cutoff },
    },
    orderBy: { createdAt: 'desc' },
  });

  return cached ? dbToStoredIndicator(cached) : null;
}

/**
 * Convert DB record to StoredEconomicIndicator
 */
function dbToStoredIndicator(record: {
  id: string;
  indicatorDate: Date;
  fedFundsRate: Prisma.Decimal | null;
  unemploymentRate: Prisma.Decimal | null;
  inflationRate: Prisma.Decimal | null;
  gdpGrowthRate: Prisma.Decimal | null;
  consumerConfidence: Prisma.Decimal | null;
  businessConfidence: Prisma.Decimal | null;
  creditAvailability: Prisma.Decimal | null;
  supplyChainStress: Prisma.Decimal | null;
  paymentImpactScore: Prisma.Decimal | null;
  source: string | null;
  createdAt: Date;
}): StoredEconomicIndicator {
  return {
    id: record.id,
    indicatorDate: record.indicatorDate,
    fedFundsRate: record.fedFundsRate ? Number(record.fedFundsRate) : null,
    unemploymentRate: record.unemploymentRate ? Number(record.unemploymentRate) : null,
    inflationRate: record.inflationRate ? Number(record.inflationRate) : null,
    gdpGrowthRate: record.gdpGrowthRate ? Number(record.gdpGrowthRate) : null,
    consumerConfidence: record.consumerConfidence ? Number(record.consumerConfidence) : null,
    businessConfidence: record.businessConfidence ? Number(record.businessConfidence) : null,
    creditAvailability: record.creditAvailability ? Number(record.creditAvailability) : null,
    supplyChainStress: record.supplyChainStress ? Number(record.supplyChainStress) : null,
    paymentImpactScore: Number(record.paymentImpactScore),
    source: record.source,
    createdAt: record.createdAt,
  };
}

/**
 * Convert DB record to EconomicData
 */
function dbToEconomicData(stored: StoredEconomicIndicator): EconomicData {
  return {
    indicatorDate: stored.indicatorDate,
    fedFundsRate: stored.fedFundsRate,
    unemploymentRate: stored.unemploymentRate,
    inflationRate: stored.inflationRate,
    gdpGrowthRate: stored.gdpGrowthRate,
    consumerConfidence: stored.consumerConfidence,
    businessConfidence: stored.businessConfidence,
    creditAvailability: stored.creditAvailability,
    supplyChainStress: stored.supplyChainStress,
    source: (stored.source as EconomicData['source']) || 'calculated',
  };
}
