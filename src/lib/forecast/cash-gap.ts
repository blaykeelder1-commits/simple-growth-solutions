/**
 * Cash Gap Detection Algorithm
 *
 * Identifies periods where projected cash balance falls below threshold.
 *
 * Features:
 * - Detects continuous gap periods
 * - Calculates severity based on gap size and duration
 * - Generates actionable recommendations
 * - Supports custom minimum balance thresholds
 */

import type {
  CashFlowForecast,
  DailyProjection,
  CashGap,
  GapSeverity,
} from '../scoring/types';

// Severity thresholds
const SEVERITY_THRESHOLDS = {
  low: { maxDays: 3, maxDeficit: 5000 },
  medium: { maxDays: 7, maxDeficit: 15000 },
  high: { maxDays: 14, maxDeficit: 50000 },
  // Anything beyond is critical
} as const;

interface GapDetectionConfig {
  minimumBalance: number;
  includeRecommendations?: boolean;
}

/**
 * Detect all cash gaps in a forecast
 */
export function detectCashGaps(
  forecast: CashFlowForecast,
  config: GapDetectionConfig
): CashGap[] {
  const { minimumBalance, includeRecommendations = true } = config;
  const gaps: CashGap[] = [];

  let currentGap: Partial<CashGap> | null = null;
  let gapIndex = 0;

  forecast.projections.forEach((projection, index) => {
    const isInGap = projection.runningBalance < minimumBalance;

    if (isInGap && !currentGap) {
      // Starting a new gap
      currentGap = {
        id: `gap-${++gapIndex}`,
        startDate: projection.date,
        lowestBalance: projection.runningBalance,
        gapAmount: minimumBalance - projection.runningBalance,
      };
    } else if (isInGap && currentGap) {
      // Continuing existing gap
      if (projection.runningBalance < (currentGap.lowestBalance || 0)) {
        currentGap.lowestBalance = projection.runningBalance;
        currentGap.gapAmount = minimumBalance - projection.runningBalance;
      }
    } else if (!isInGap && currentGap) {
      // Ending a gap
      const prevProjection = forecast.projections[index - 1];
      currentGap.endDate = prevProjection.date;
      currentGap.durationDays = calculateDurationDays(
        currentGap.startDate!,
        currentGap.endDate
      );
      currentGap.severity = calculateSeverity(
        currentGap.durationDays,
        currentGap.gapAmount!
      );

      if (includeRecommendations) {
        currentGap.recommendations = generateGapRecommendations(
          currentGap as CashGap
        );
      } else {
        currentGap.recommendations = [];
      }

      gaps.push(currentGap as CashGap);
      currentGap = null;
    }
  });

  // Handle gap that extends to end of forecast period
  const finalGap = currentGap as Partial<CashGap> | null;
  if (finalGap) {
    const lastProjection = forecast.projections[forecast.projections.length - 1];
    finalGap.endDate = lastProjection.date;
    finalGap.durationDays = calculateDurationDays(
      finalGap.startDate!,
      finalGap.endDate
    );
    finalGap.severity = calculateSeverity(
      finalGap.durationDays,
      finalGap.gapAmount!
    );

    if (includeRecommendations) {
      finalGap.recommendations = generateGapRecommendations(
        finalGap as CashGap
      );
    } else {
      finalGap.recommendations = [];
    }

    gaps.push(finalGap as CashGap);
  }

  return gaps;
}

/**
 * Calculate duration in days between two dates
 */
function calculateDurationDays(start: Date, end: Date): number {
  return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
}

/**
 * Calculate gap severity based on duration and deficit amount
 */
function calculateSeverity(durationDays: number, gapAmount: number): GapSeverity {
  // Critical if either metric is very high
  if (durationDays > SEVERITY_THRESHOLDS.high.maxDays ||
      gapAmount > SEVERITY_THRESHOLDS.high.maxDeficit) {
    return 'critical';
  }

  if (durationDays > SEVERITY_THRESHOLDS.medium.maxDays ||
      gapAmount > SEVERITY_THRESHOLDS.medium.maxDeficit) {
    return 'high';
  }

  if (durationDays > SEVERITY_THRESHOLDS.low.maxDays ||
      gapAmount > SEVERITY_THRESHOLDS.low.maxDeficit) {
    return 'medium';
  }

  return 'low';
}

/**
 * Generate recommendations to address a cash gap
 */
function generateGapRecommendations(gap: CashGap): string[] {
  const recommendations: string[] = [];
  const daysUntilGap = Math.ceil(
    (gap.startDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );

  // Time-based recommendations
  if (daysUntilGap > 14) {
    recommendations.push(
      `You have ${daysUntilGap} days to prepare. Focus on accelerating receivables collection.`
    );
  } else if (daysUntilGap > 7) {
    recommendations.push(
      `Cash gap approaching in ${daysUntilGap} days. Prioritize follow-ups on overdue invoices.`
    );
  } else if (daysUntilGap > 0) {
    recommendations.push(
      `URGENT: Cash gap begins in ${daysUntilGap} days. Consider immediate collection actions.`
    );
  } else {
    recommendations.push(
      `Cash gap is currently active. Focus on immediate cash inflows.`
    );
  }

  // Amount-based recommendations
  const deficit = gap.gapAmount;

  if (deficit <= 5000) {
    recommendations.push(
      `Shortfall of ${formatCurrency(deficit)} may be covered by accelerating 1-2 invoice payments.`
    );
  } else if (deficit <= 20000) {
    recommendations.push(
      `Shortfall of ${formatCurrency(deficit)} requires focused collection effort.`
    );
    recommendations.push(
      'Consider offering early payment discounts to key clients.'
    );
  } else {
    recommendations.push(
      `Significant shortfall of ${formatCurrency(deficit)} detected.`
    );
    recommendations.push(
      'Consider line of credit or invoice factoring for immediate liquidity.'
    );
    recommendations.push(
      'Review and delay non-essential expenses where possible.'
    );
  }

  // Duration-based recommendations
  if (gap.durationDays > 7) {
    recommendations.push(
      `Gap lasts ${gap.durationDays} days. Plan for sustained reduced cash flow.`
    );
  }

  // Severity-specific recommendations
  if (gap.severity === 'critical') {
    recommendations.unshift(
      'CRITICAL: This cash gap requires immediate executive attention.'
    );
  }

  return recommendations;
}

/**
 * Format currency for display
 */
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Get summary of all detected gaps
 */
export function getCashGapSummary(gaps: CashGap[]): CashGapSummary {
  if (gaps.length === 0) {
    return {
      totalGaps: 0,
      criticalGaps: 0,
      highGaps: 0,
      mediumGaps: 0,
      lowGaps: 0,
      totalGapDays: 0,
      largestDeficit: 0,
      earliestGapDate: null,
      requiresImmediateAction: false,
    };
  }

  const criticalGaps = gaps.filter(g => g.severity === 'critical').length;
  const highGaps = gaps.filter(g => g.severity === 'high').length;
  const mediumGaps = gaps.filter(g => g.severity === 'medium').length;
  const lowGaps = gaps.filter(g => g.severity === 'low').length;

  const totalGapDays = gaps.reduce((sum, g) => sum + g.durationDays, 0);
  const largestDeficit = Math.max(...gaps.map(g => g.gapAmount));
  const earliestGapDate = new Date(Math.min(...gaps.map(g => g.startDate.getTime())));

  const daysToEarliestGap = Math.ceil(
    (earliestGapDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );

  return {
    totalGaps: gaps.length,
    criticalGaps,
    highGaps,
    mediumGaps,
    lowGaps,
    totalGapDays,
    largestDeficit,
    earliestGapDate,
    requiresImmediateAction: criticalGaps > 0 || (highGaps > 0 && daysToEarliestGap <= 7),
  };
}

export interface CashGapSummary {
  totalGaps: number;
  criticalGaps: number;
  highGaps: number;
  mediumGaps: number;
  lowGaps: number;
  totalGapDays: number;
  largestDeficit: number;
  earliestGapDate: Date | null;
  requiresImmediateAction: boolean;
}

/**
 * Get the most urgent gap requiring attention
 */
export function getMostUrgentGap(gaps: CashGap[]): CashGap | null {
  if (gaps.length === 0) return null;

  // Sort by severity (critical first), then by start date (earliest first)
  const severityOrder: Record<GapSeverity, number> = {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3,
  };

  const sorted = [...gaps].sort((a, b) => {
    const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
    if (severityDiff !== 0) return severityDiff;
    return a.startDate.getTime() - b.startDate.getTime();
  });

  return sorted[0];
}

/**
 * Calculate how much additional cash is needed to avoid all gaps
 */
export function calculateCashNeeded(
  forecast: CashFlowForecast,
  minimumBalance: number
): number {
  let maxDeficit = 0;

  forecast.projections.forEach(projection => {
    const deficit = minimumBalance - projection.runningBalance;
    if (deficit > maxDeficit) {
      maxDeficit = deficit;
    }
  });

  return Math.max(0, maxDeficit);
}

/**
 * Simulate impact of accelerating invoice collection
 */
export function simulateAcceleratedCollection(
  forecast: CashFlowForecast,
  invoiceId: string,
  newPaymentDate: Date,
  amount: number
): DailyProjection[] {
  const adjustedProjections = forecast.projections.map(p => ({ ...p }));

  // Find original payment date
  let originalDayIndex = -1;
  adjustedProjections.forEach((p, i) => {
    const hasInvoice = p.invoicesExpected.some(inv => inv.invoiceId === invoiceId);
    if (hasInvoice) originalDayIndex = i;
  });

  // Find new payment date index
  const newDayIndex = adjustedProjections.findIndex(p => {
    const pDate = new Date(p.date);
    pDate.setHours(0, 0, 0, 0);
    const targetDate = new Date(newPaymentDate);
    targetDate.setHours(0, 0, 0, 0);
    return pDate.getTime() === targetDate.getTime();
  });

  if (newDayIndex >= 0 && originalDayIndex >= 0 && newDayIndex < originalDayIndex) {
    // Move the inflow to earlier date
    adjustedProjections[newDayIndex].projectedInflows += amount;
    adjustedProjections[originalDayIndex].projectedInflows -= amount;

    // Recalculate running balances
    let runningBalance = forecast.currentBalance;
    adjustedProjections.forEach(p => {
      runningBalance += p.netCashFlow;
      p.runningBalance = runningBalance;
      p.netCashFlow = p.projectedInflows - p.projectedOutflows;
    });
  }

  return adjustedProjections;
}
