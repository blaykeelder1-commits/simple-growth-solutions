/**
 * Forecast Module Exports
 *
 * Centralized exports for cash flow forecasting and gap detection
 */

// Cash flow forecasting
export {
  generateCashFlowForecast,
  getForecastForDays,
  getProjectionsForPeriod,
} from './cash-flow';

// Cash gap detection
export {
  detectCashGaps,
  getCashGapSummary,
  getMostUrgentGap,
  calculateCashNeeded,
  simulateAcceleratedCollection,
  type CashGapSummary,
} from './cash-gap';
