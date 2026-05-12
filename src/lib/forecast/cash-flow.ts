/**
 * Cash Flow Forecasting Engine
 *
 * Generates 7, 14, and 30 day cash flow projections using:
 * - Weighted moving average of historical cash flow
 * - Pending invoices weighted by recovery likelihood
 * - Known upcoming expenses/outflows
 * - Invoice-level payment predictions
 */

import type {
  Invoice,
  CashTransaction,
  CashFlowForecast,
  DailyProjection,
  ExpectedInvoicePayment,
  ForecastSummary,
  PeriodSummary,
  RecoveryLikelihood,
} from '../scoring/types';

// Forecast configuration
const HISTORICAL_DAYS = 90;
const MOVING_AVERAGE_WEIGHTS = [0.4, 0.3, 0.2, 0.1]; // Most recent weeks weighted higher

interface ForecastInput {
  currentBalance: number;
  pendingInvoices: Invoice[];
  recoveryScores: Map<string, RecoveryLikelihood>;
  historicalTransactions: CashTransaction[];
  scheduledOutflows: CashTransaction[];
}

/**
 * Generate comprehensive cash flow forecast
 */
export function generateCashFlowForecast(input: ForecastInput): CashFlowForecast {
  const { currentBalance, pendingInvoices, recoveryScores, historicalTransactions, scheduledOutflows } = input;

  // Calculate historical patterns
  const historicalPattern = analyzeHistoricalPattern(historicalTransactions);

  // Generate daily projections for 30 days
  const projections = generateDailyProjections(
    currentBalance,
    pendingInvoices,
    recoveryScores,
    historicalPattern,
    scheduledOutflows
  );

  // Generate period summaries
  const summary = generateForecastSummary(projections, currentBalance);

  return {
    generatedAt: new Date(),
    currentBalance,
    projections,
    summary,
  };
}

/**
 * Analyze historical transaction patterns
 */
function analyzeHistoricalPattern(transactions: CashTransaction[]): HistoricalPattern {
  const now = new Date();
  const cutoff = new Date(now.getTime() - HISTORICAL_DAYS * 24 * 60 * 60 * 1000);

  // Filter to relevant period
  const relevantTxns = transactions.filter(t => t.date >= cutoff);

  // Calculate weekly averages
  const weeklyData: { inflows: number; outflows: number }[] = [];

  for (let week = 0; week < Math.ceil(HISTORICAL_DAYS / 7); week++) {
    const weekStart = new Date(now.getTime() - (week + 1) * 7 * 24 * 60 * 60 * 1000);
    const weekEnd = new Date(now.getTime() - week * 7 * 24 * 60 * 60 * 1000);

    const weekTxns = relevantTxns.filter(t => t.date >= weekStart && t.date < weekEnd);

    weeklyData.push({
      inflows: weekTxns.filter(t => t.type === 'inflow').reduce((sum, t) => sum + t.amount, 0),
      outflows: weekTxns.filter(t => t.type === 'outflow').reduce((sum, t) => sum + t.amount, 0),
    });
  }

  // Calculate weighted moving averages
  const weightedInflows = calculateWeightedAverage(
    weeklyData.slice(0, MOVING_AVERAGE_WEIGHTS.length).map(w => w.inflows),
    MOVING_AVERAGE_WEIGHTS
  );

  const weightedOutflows = calculateWeightedAverage(
    weeklyData.slice(0, MOVING_AVERAGE_WEIGHTS.length).map(w => w.outflows),
    MOVING_AVERAGE_WEIGHTS
  );

  // Calculate day-of-week patterns
  const dayOfWeekPatterns = calculateDayOfWeekPatterns(relevantTxns);

  return {
    avgWeeklyInflows: weightedInflows,
    avgWeeklyOutflows: weightedOutflows,
    avgDailyInflows: weightedInflows / 7,
    avgDailyOutflows: weightedOutflows / 7,
    dayOfWeekMultipliers: dayOfWeekPatterns,
    volatility: calculateVolatility(weeklyData.map(w => w.inflows - w.outflows)),
  };
}

interface HistoricalPattern {
  avgWeeklyInflows: number;
  avgWeeklyOutflows: number;
  avgDailyInflows: number;
  avgDailyOutflows: number;
  dayOfWeekMultipliers: number[];
  volatility: number;
}

/**
 * Calculate weighted average
 */
function calculateWeightedAverage(values: number[], weights: number[]): number {
  if (values.length === 0) return 0;

  const effectiveWeights = weights.slice(0, values.length);
  const totalWeight = effectiveWeights.reduce((sum, w) => sum + w, 0);

  return values.reduce((sum, val, i) => sum + val * (effectiveWeights[i] || 0), 0) / totalWeight;
}

/**
 * Calculate day-of-week transaction patterns
 */
function calculateDayOfWeekPatterns(transactions: CashTransaction[]): number[] {
  const dayTotals = [0, 0, 0, 0, 0, 0, 0]; // Sun-Sat
  const dayCounts = [0, 0, 0, 0, 0, 0, 0];

  transactions.forEach(t => {
    const day = t.date.getDay();
    dayTotals[day] += t.type === 'inflow' ? t.amount : -t.amount;
    dayCounts[day]++;
  });

  const avgDailyFlow = dayTotals.reduce((sum, t) => sum + t, 0) / transactions.length || 1;

  return dayTotals.map((total, i) => {
    const avg = dayCounts[i] > 0 ? total / dayCounts[i] : 0;
    return avgDailyFlow !== 0 ? avg / avgDailyFlow : 1;
  });
}

/**
 * Calculate volatility (standard deviation)
 */
function calculateVolatility(values: number[]): number {
  if (values.length === 0) return 0;

  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
  const avgSquaredDiff = squaredDiffs.reduce((sum, v) => sum + v, 0) / values.length;

  return Math.sqrt(avgSquaredDiff);
}

/**
 * Generate daily projections for the forecast period
 */
function generateDailyProjections(
  currentBalance: number,
  pendingInvoices: Invoice[],
  recoveryScores: Map<string, RecoveryLikelihood>,
  historicalPattern: HistoricalPattern,
  scheduledOutflows: CashTransaction[]
): DailyProjection[] {
  const projections: DailyProjection[] = [];
  let runningBalance = currentBalance;

  for (let day = 1; day <= 30; day++) {
    const date = new Date();
    date.setDate(date.getDate() + day);
    date.setHours(0, 0, 0, 0);

    // Calculate expected invoice payments for this day
    const invoicesExpected = calculateExpectedPaymentsForDay(
      date,
      pendingInvoices,
      recoveryScores
    );

    const projectedInflows = invoicesExpected.reduce(
      (sum, inv) => sum + inv.amount * inv.probability,
      0
    );

    // Get scheduled outflows for this day
    const dayOutflows = scheduledOutflows.filter(t => {
      const txDate = new Date(t.date);
      txDate.setHours(0, 0, 0, 0);
      return txDate.getTime() === date.getTime();
    });

    // Combine scheduled outflows with historical pattern
    const dayOfWeek = date.getDay();
    const patternOutflow = historicalPattern.avgDailyOutflows *
      (historicalPattern.dayOfWeekMultipliers[dayOfWeek] || 1);

    const projectedOutflows =
      dayOutflows.reduce((sum, t) => sum + t.amount, 0) ||
      patternOutflow;

    const netCashFlow = projectedInflows - projectedOutflows;
    runningBalance += netCashFlow;

    // Calculate confidence based on distance and data quality
    const confidence = calculateConfidence(day, invoicesExpected, historicalPattern.volatility);

    projections.push({
      date,
      projectedInflows,
      projectedOutflows,
      netCashFlow,
      runningBalance,
      confidence,
      invoicesExpected,
    });
  }

  return projections;
}

/**
 * Calculate expected invoice payments for a specific day
 */
function calculateExpectedPaymentsForDay(
  date: Date,
  invoices: Invoice[],
  recoveryScores: Map<string, RecoveryLikelihood>
): ExpectedInvoicePayment[] {
  const expected: ExpectedInvoicePayment[] = [];

  invoices.forEach(invoice => {
    const recovery = recoveryScores.get(invoice.id);
    if (!recovery) return;

    const remainingAmount = invoice.amount - invoice.paidAmount;
    if (remainingAmount <= 0) return;

    // Estimate payment date based on due date and client behavior
    const estimatedPayDate = estimatePaymentDate(invoice, recovery);

    const estDate = new Date(estimatedPayDate);
    estDate.setHours(0, 0, 0, 0);

    if (estDate.getTime() === date.getTime()) {
      expected.push({
        invoiceId: invoice.id,
        clientId: invoice.clientId,
        amount: remainingAmount,
        probability: recovery.probability,
        expectedDate: estimatedPayDate,
      });
    }
  });

  return expected;
}

/**
 * Estimate when an invoice will be paid
 */
function estimatePaymentDate(invoice: Invoice, recovery: RecoveryLikelihood): Date {
  const now = new Date();

  // If already overdue, estimate based on recovery likelihood
  if (invoice.dueDate < now) {
    // Higher recovery = sooner payment
    const daysToPayment = Math.ceil((100 - recovery.score) / 10);
    const estimated = new Date(now);
    estimated.setDate(estimated.getDate() + daysToPayment);
    return estimated;
  }

  // If not yet due, use due date adjusted for client tier
  const tierAdjustments: Record<string, number> = {
    A: -2, // Tier A pays early
    B: 0,
    C: 5,
    D: 14,
  };

  const adjustment = tierAdjustments[recovery.factors.clientTier] || 0;
  const estimated = new Date(invoice.dueDate);
  estimated.setDate(estimated.getDate() + adjustment);

  return estimated;
}

/**
 * Calculate confidence score for a projection
 */
function calculateConfidence(
  daysOut: number,
  invoicesExpected: ExpectedInvoicePayment[],
  volatility: number
): number {
  // Base confidence decreases with time
  let confidence = Math.max(0.3, 1 - daysOut * 0.02);

  // Boost if we have specific invoice expectations
  if (invoicesExpected.length > 0) {
    const avgInvoiceConfidence =
      invoicesExpected.reduce((sum, inv) => sum + inv.probability, 0) /
      invoicesExpected.length;
    confidence = (confidence + avgInvoiceConfidence) / 2;
  }

  // Reduce for high volatility
  const volatilityPenalty = Math.min(0.2, volatility / 10000);
  confidence -= volatilityPenalty;

  return Math.max(0.1, Math.min(1, confidence));
}

/**
 * Generate forecast summary for key periods
 */
function generateForecastSummary(
  projections: DailyProjection[],
  currentBalance: number
): ForecastSummary {
  return {
    period7Day: generatePeriodSummary(projections.slice(0, 7), currentBalance),
    period14Day: generatePeriodSummary(projections.slice(0, 14), currentBalance),
    period30Day: generatePeriodSummary(projections.slice(0, 30), currentBalance),
  };
}

/**
 * Generate summary for a specific period
 */
function generatePeriodSummary(
  projections: DailyProjection[],
  startingBalance: number
): PeriodSummary {
  if (projections.length === 0) {
    return {
      totalExpectedInflows: 0,
      totalExpectedOutflows: 0,
      netCashFlow: 0,
      endingBalance: startingBalance,
      lowestBalance: startingBalance,
      lowestBalanceDate: new Date(),
      avgConfidence: 0,
    };
  }

  const totalExpectedInflows = projections.reduce((sum, p) => sum + p.projectedInflows, 0);
  const totalExpectedOutflows = projections.reduce((sum, p) => sum + p.projectedOutflows, 0);
  const netCashFlow = totalExpectedInflows - totalExpectedOutflows;
  const endingBalance = projections[projections.length - 1].runningBalance;

  // Find lowest balance point
  let lowestBalance = startingBalance;
  let lowestBalanceDate = new Date();

  projections.forEach(p => {
    if (p.runningBalance < lowestBalance) {
      lowestBalance = p.runningBalance;
      lowestBalanceDate = p.date;
    }
  });

  const avgConfidence = projections.reduce((sum, p) => sum + p.confidence, 0) / projections.length;

  return {
    totalExpectedInflows,
    totalExpectedOutflows,
    netCashFlow,
    endingBalance,
    lowestBalance,
    lowestBalanceDate,
    avgConfidence,
  };
}

/**
 * Get forecast for specific number of days
 */
export function getForecastForDays(
  forecast: CashFlowForecast,
  days: 7 | 14 | 30
): PeriodSummary {
  switch (days) {
    case 7:
      return forecast.summary.period7Day;
    case 14:
      return forecast.summary.period14Day;
    case 30:
      return forecast.summary.period30Day;
  }
}

/**
 * Get daily projections for a specific period
 */
export function getProjectionsForPeriod(
  forecast: CashFlowForecast,
  days: number
): DailyProjection[] {
  return forecast.projections.slice(0, days);
}
