/**
 * Economic Indicators Module Exports
 *
 * Centralized exports for economic indicator functions and types
 */

// Type exports
export * from './types';

// Fetcher functions
export {
  fetchLatestIndicators,
  fetchHistoricalIndicators,
  getIndicatorForDate,
  refreshIndicators,
} from './fetcher';

// Impact calculation functions
export {
  calculatePaymentImpactScore,
  calculatePaymentImpactFactors,
  getAdjustedPaymentProbability,
  getAdjustedDaysToPay,
  getRecessionRiskLevel,
  analyzeEconomicTrends,
} from './impact';

// Provider functions (for direct access if needed)
export { fetchFredData, checkFredApiHealth } from './providers/fred';
export {
  generateMockData,
  generateMockDataRange,
  generateHistoricalMockData,
  getLatestMockData,
} from './providers/mock';
