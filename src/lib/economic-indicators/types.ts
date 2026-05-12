/**
 * Economic Indicators Types
 *
 * Types for economic data fetching and payment impact analysis
 */

/**
 * Raw economic data from external sources
 */
export interface EconomicData {
  indicatorDate: Date;
  fedFundsRate: number | null;
  unemploymentRate: number | null;
  inflationRate: number | null;
  gdpGrowthRate: number | null;
  consumerConfidence: number | null;
  businessConfidence: number | null;
  creditAvailability: number | null;
  supplyChainStress: number | null;
  source: EconomicDataSource;
}

/**
 * Source of economic data
 */
export type EconomicDataSource = 'fred' | 'bls' | 'census' | 'calculated' | 'mock';

/**
 * Result of fetching indicator data
 */
export interface IndicatorFetchResult {
  success: boolean;
  data: EconomicData | null;
  error?: string;
  source: EconomicDataSource;
  fetchedAt: Date;
}

/**
 * Payment impact factors derived from economic conditions
 */
export interface PaymentImpactFactors {
  fedFundsImpact: number; // -1 to 1
  unemploymentImpact: number; // -1 to 1
  inflationImpact: number; // -1 to 1
  confidenceImpact: number; // -1 to 1
  overallImpact: number; // -1 to 1 (weighted average)
}

/**
 * Stored economic indicator matching Prisma model
 */
export interface StoredEconomicIndicator {
  id: string;
  indicatorDate: Date;
  fedFundsRate: number | null;
  unemploymentRate: number | null;
  inflationRate: number | null;
  gdpGrowthRate: number | null;
  consumerConfidence: number | null;
  businessConfidence: number | null;
  creditAvailability: number | null;
  supplyChainStress: number | null;
  paymentImpactScore: number;
  source: string | null;
  createdAt: Date;
}

/**
 * Recession risk assessment
 */
export interface RecessionRiskAssessment {
  riskLevel: RecessionRiskLevel;
  probability: number; // 0-1
  factors: string[];
  recommendation: string;
  assessedAt: Date;
}

export type RecessionRiskLevel = 'low' | 'moderate' | 'elevated' | 'high';

/**
 * Economic trend analysis
 */
export interface EconomicTrend {
  indicator: string;
  direction: 'improving' | 'stable' | 'declining';
  changePercent: number;
  periodMonths: number;
  significance: 'low' | 'medium' | 'high';
}

/**
 * Options for fetching economic data
 */
export interface EconomicFetchOptions {
  useMockData?: boolean;
  cacheMaxAgeMinutes?: number;
}

/**
 * FRED API response types
 */
export interface FredSeriesObservation {
  date: string;
  value: string;
}

export interface FredApiResponse {
  observations: FredSeriesObservation[];
}

/**
 * FRED series IDs for different indicators
 */
export const FRED_SERIES = {
  FED_FUNDS_RATE: 'FEDFUNDS',
  UNEMPLOYMENT_RATE: 'UNRATE',
  CPI_ALL_ITEMS: 'CPIAUCSL',
  GDP_GROWTH: 'A191RL1Q225SBEA',
  CONSUMER_SENTIMENT: 'UMCSENT',
  BUSINESS_CONFIDENCE: 'BSCICP03USM665S',
} as const;
