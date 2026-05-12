/**
 * Seasonal Pattern Module Exports
 *
 * Centralized exports for seasonal pattern detection and prediction
 */

// Type exports
export * from './types';

// Detection functions
export {
  detectClientSeasonalPattern,
  detectIndustrySeasonalPattern,
  calculateMonthlyMultipliers,
  calculateQuarterlyMultipliers,
  calculatePatternConfidence,
  saveSeasonalPattern,
  getStoredPattern,
  storedToSeasonalPattern,
  getMonthMultiplier,
} from './detection';

// Prediction functions
export {
  adjustPredictionForSeason,
  getSeasonalRiskPeriods,
  forecastSeasonalCashFlow,
  getBestCollectionMonths,
  calculateSeasonalPaymentDate,
  getCurrentSeasonalFactor,
} from './prediction';

// Analysis functions
export {
  detectAnomalies,
  refreshSeasonalPatterns,
  getOrganizationSeasonalStats,
  compareToIndustryPattern,
  getClientsNeedingPatternUpdate,
  storePatternInClient,
  type PatternRefreshResult,
} from './analysis';
