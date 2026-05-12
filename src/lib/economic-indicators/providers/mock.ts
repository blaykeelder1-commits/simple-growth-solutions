/**
 * Mock Economic Data Provider
 *
 * Provides realistic mock economic data for development and testing.
 * Used as fallback when external APIs are unavailable.
 */

import { EconomicData, EconomicDataSource } from '../types';

/**
 * Base values representing typical economic conditions
 */
const BASE_VALUES = {
  fedFundsRate: 5.25,
  unemploymentRate: 3.8,
  inflationRate: 3.2,
  gdpGrowthRate: 2.1,
  consumerConfidence: 102.0,
  businessConfidence: 51.5,
  creditAvailability: 65.0,
  supplyChainStress: 25.0,
};

/**
 * Generate mock economic data for a specific date
 * Adds realistic variation based on date
 */
export function generateMockData(date: Date): EconomicData {
  // Use date components to create deterministic but varied data
  const month = date.getMonth();
  const year = date.getFullYear();
  const dayOfYear = getDayOfYear(date);

  // Create variation factors based on date
  const seasonalFactor = Math.sin((month / 12) * Math.PI * 2) * 0.1;
  const yearFactor = (year - 2024) * 0.05;
  const dailyNoise = Math.sin(dayOfYear * 0.1) * 0.02;

  return {
    indicatorDate: date,
    fedFundsRate: round(
      BASE_VALUES.fedFundsRate + seasonalFactor * 0.5 + yearFactor,
      2
    ),
    unemploymentRate: round(
      BASE_VALUES.unemploymentRate + seasonalFactor * 0.3 - yearFactor * 0.2 + dailyNoise,
      1
    ),
    inflationRate: round(
      BASE_VALUES.inflationRate - seasonalFactor * 0.2 + yearFactor * 0.3,
      1
    ),
    gdpGrowthRate: round(
      BASE_VALUES.gdpGrowthRate + seasonalFactor + dailyNoise * 5,
      1
    ),
    consumerConfidence: round(
      BASE_VALUES.consumerConfidence - seasonalFactor * 5 + dailyNoise * 10,
      1
    ),
    businessConfidence: round(
      BASE_VALUES.businessConfidence + seasonalFactor * 2 + dailyNoise * 3,
      1
    ),
    creditAvailability: round(
      BASE_VALUES.creditAvailability - yearFactor * 5 + dailyNoise * 5,
      1
    ),
    supplyChainStress: round(
      BASE_VALUES.supplyChainStress + seasonalFactor * 10 + dailyNoise * 5,
      1
    ),
    source: 'mock' as EconomicDataSource,
  };
}

/**
 * Generate mock data for a date range
 */
export function generateMockDataRange(
  startDate: Date,
  endDate: Date,
  intervalDays: number = 30
): EconomicData[] {
  const results: EconomicData[] = [];
  const current = new Date(startDate);

  while (current <= endDate) {
    results.push(generateMockData(new Date(current)));
    current.setDate(current.getDate() + intervalDays);
  }

  return results;
}

/**
 * Generate 12 months of historical mock data
 */
export function generateHistoricalMockData(monthsBack: number = 12): EconomicData[] {
  const results: EconomicData[] = [];
  const now = new Date();

  for (let i = monthsBack; i >= 0; i--) {
    const date = new Date(now);
    date.setMonth(date.getMonth() - i);
    date.setDate(1); // First of each month
    results.push(generateMockData(date));
  }

  return results;
}

/**
 * Get the latest mock economic data
 */
export function getLatestMockData(): EconomicData {
  return generateMockData(new Date());
}

/**
 * Helper: Get day of year (1-365)
 */
function getDayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  const oneDay = 1000 * 60 * 60 * 24;
  return Math.floor(diff / oneDay);
}

/**
 * Helper: Round to specified decimal places
 */
function round(value: number, decimals: number): number {
  return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
}
