/**
 * Economic Impact Calculations
 *
 * Calculates how economic conditions impact payment behavior.
 * Uses economic indicators to adjust payment predictions.
 */

import {
  EconomicData,
  PaymentImpactFactors,
  RecessionRiskAssessment,
  RecessionRiskLevel,
  EconomicTrend,
  StoredEconomicIndicator,
} from './types';

/**
 * Reference values for "normal" economic conditions
 * Used as baseline for impact calculations
 */
const BASELINE = {
  fedFundsRate: 3.0, // Historical average around 3%
  unemploymentRate: 4.5, // Natural rate of unemployment
  inflationRate: 2.0, // Fed target
  consumerConfidence: 100, // Index baseline
  businessConfidence: 50, // PMI neutral point
  creditAvailability: 70, // Moderate availability
  supplyChainStress: 20, // Low stress
};

/**
 * Weights for combining impact factors
 */
const IMPACT_WEIGHTS = {
  fedFundsImpact: 0.20,
  unemploymentImpact: 0.30,
  inflationImpact: 0.20,
  confidenceImpact: 0.30,
};

/**
 * Calculate payment impact score from economic data
 * Returns value between -1.0 (harder to collect) and 1.0 (easier to collect)
 */
export function calculatePaymentImpactScore(data: EconomicData): number {
  const factors = calculatePaymentImpactFactors(data);
  return factors.overallImpact;
}

/**
 * Calculate detailed payment impact factors
 */
export function calculatePaymentImpactFactors(data: EconomicData): PaymentImpactFactors {
  // Fed Funds Rate impact
  // Higher rates = tighter credit = harder to pay
  const fedFundsImpact = data.fedFundsRate !== null
    ? calculateImpact(data.fedFundsRate, BASELINE.fedFundsRate, -0.1, true)
    : 0;

  // Unemployment impact
  // Higher unemployment = less income = harder to pay
  const unemploymentImpact = data.unemploymentRate !== null
    ? calculateImpact(data.unemploymentRate, BASELINE.unemploymentRate, -0.15, true)
    : 0;

  // Inflation impact
  // Higher inflation = reduced purchasing power = harder to pay
  const inflationImpact = data.inflationRate !== null
    ? calculateImpact(data.inflationRate, BASELINE.inflationRate, -0.1, true)
    : 0;

  // Confidence impact
  // Higher confidence = more likely to pay promptly
  const consumerImpact = data.consumerConfidence !== null
    ? calculateImpact(data.consumerConfidence, BASELINE.consumerConfidence, 0.01, false)
    : 0;

  const businessImpact = data.businessConfidence !== null
    ? calculateImpact(data.businessConfidence, BASELINE.businessConfidence, 0.02, false)
    : 0;

  const confidenceImpact = (consumerImpact + businessImpact) / 2;

  // Calculate weighted overall impact
  const overallImpact = clamp(
    fedFundsImpact * IMPACT_WEIGHTS.fedFundsImpact +
    unemploymentImpact * IMPACT_WEIGHTS.unemploymentImpact +
    inflationImpact * IMPACT_WEIGHTS.inflationImpact +
    confidenceImpact * IMPACT_WEIGHTS.confidenceImpact,
    -1,
    1
  );

  return {
    fedFundsImpact: round(fedFundsImpact, 3),
    unemploymentImpact: round(unemploymentImpact, 3),
    inflationImpact: round(inflationImpact, 3),
    confidenceImpact: round(confidenceImpact, 3),
    overallImpact: round(overallImpact, 3),
  };
}

/**
 * Adjust a base payment probability based on economic conditions
 */
export function getAdjustedPaymentProbability(
  baseProbability: number,
  economicImpact: number,
  industrySensitivity: number = 1.0
): number {
  // Apply economic impact with industry sensitivity multiplier
  const adjustment = economicImpact * industrySensitivity * 0.2; // Max 20% adjustment
  const adjusted = baseProbability + adjustment;
  return clamp(adjusted, 0, 1);
}

/**
 * Adjust expected days to pay based on economic conditions
 */
export function getAdjustedDaysToPay(
  baseDays: number,
  economicImpact: number,
  industrySensitivity: number = 1.0
): number {
  // Negative impact = longer payment times
  // Max adjustment of 30% in either direction
  const adjustmentFactor = 1 - (economicImpact * industrySensitivity * 0.3);
  return Math.max(1, Math.round(baseDays * adjustmentFactor));
}

/**
 * Assess recession risk based on economic indicators
 */
export function getRecessionRiskLevel(
  data: EconomicData
): RecessionRiskAssessment {
  const factors: string[] = [];
  let riskScore = 0;

  // Inverted yield curve indicator (approximated by high fed funds rate)
  if (data.fedFundsRate !== null && data.fedFundsRate > 5.0) {
    riskScore += 20;
    factors.push('Elevated interest rates');
  }

  // High unemployment
  if (data.unemploymentRate !== null && data.unemploymentRate > 5.0) {
    riskScore += 25;
    factors.push('Above-average unemployment');
  } else if (data.unemploymentRate !== null && data.unemploymentRate > 4.5) {
    riskScore += 10;
    factors.push('Rising unemployment');
  }

  // High inflation
  if (data.inflationRate !== null && data.inflationRate > 4.0) {
    riskScore += 20;
    factors.push('High inflation');
  } else if (data.inflationRate !== null && data.inflationRate > 3.0) {
    riskScore += 10;
    factors.push('Above-target inflation');
  }

  // Negative GDP growth
  if (data.gdpGrowthRate !== null && data.gdpGrowthRate < 0) {
    riskScore += 30;
    factors.push('Negative GDP growth');
  } else if (data.gdpGrowthRate !== null && data.gdpGrowthRate < 1.0) {
    riskScore += 15;
    factors.push('Slowing GDP growth');
  }

  // Low consumer confidence
  if (data.consumerConfidence !== null && data.consumerConfidence < 80) {
    riskScore += 20;
    factors.push('Low consumer confidence');
  } else if (data.consumerConfidence !== null && data.consumerConfidence < 95) {
    riskScore += 10;
    factors.push('Below-average consumer confidence');
  }

  // Low business confidence
  if (data.businessConfidence !== null && data.businessConfidence < 45) {
    riskScore += 15;
    factors.push('Contracting business activity');
  }

  // Supply chain stress
  if (data.supplyChainStress !== null && data.supplyChainStress > 50) {
    riskScore += 10;
    factors.push('Supply chain disruptions');
  }

  // Determine risk level
  let riskLevel: RecessionRiskLevel;
  let recommendation: string;

  if (riskScore >= 60) {
    riskLevel = 'high';
    recommendation = 'Consider tightening credit terms and accelerating collections';
  } else if (riskScore >= 40) {
    riskLevel = 'elevated';
    recommendation = 'Monitor high-risk clients more closely';
  } else if (riskScore >= 20) {
    riskLevel = 'moderate';
    recommendation = 'Maintain current collection practices';
  } else {
    riskLevel = 'low';
    recommendation = 'Economic conditions favorable for collections';
  }

  return {
    riskLevel,
    probability: Math.min(riskScore / 100, 0.95),
    factors: factors.length > 0 ? factors : ['Economic conditions stable'],
    recommendation,
    assessedAt: new Date(),
  };
}

/**
 * Analyze economic trends over time
 */
export function analyzeEconomicTrends(
  indicators: StoredEconomicIndicator[]
): EconomicTrend[] {
  if (indicators.length < 2) {
    return [];
  }

  const trends: EconomicTrend[] = [];
  const sorted = [...indicators].sort(
    (a, b) => a.indicatorDate.getTime() - b.indicatorDate.getTime()
  );

  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const periodMonths = Math.round(
    (last.indicatorDate.getTime() - first.indicatorDate.getTime()) /
    (1000 * 60 * 60 * 24 * 30)
  );

  // Analyze Fed Funds Rate trend
  if (first.fedFundsRate !== null && last.fedFundsRate !== null) {
    const change = last.fedFundsRate - first.fedFundsRate;
    trends.push(createTrend('Fed Funds Rate', first.fedFundsRate, change, periodMonths));
  }

  // Analyze Unemployment trend
  if (first.unemploymentRate !== null && last.unemploymentRate !== null) {
    const change = last.unemploymentRate - first.unemploymentRate;
    trends.push(createTrend('Unemployment Rate', first.unemploymentRate, change, periodMonths, true));
  }

  // Analyze Inflation trend
  if (first.inflationRate !== null && last.inflationRate !== null) {
    const change = last.inflationRate - first.inflationRate;
    trends.push(createTrend('Inflation Rate', first.inflationRate, change, periodMonths));
  }

  // Analyze Consumer Confidence trend
  if (first.consumerConfidence !== null && last.consumerConfidence !== null) {
    const change = last.consumerConfidence - first.consumerConfidence;
    trends.push(createTrend('Consumer Confidence', first.consumerConfidence, change, periodMonths, false, 5));
  }

  return trends;
}

/**
 * Calculate impact of deviation from baseline
 */
function calculateImpact(
  value: number,
  baseline: number,
  sensitivity: number,
  invertDirection: boolean
): number {
  const deviation = value - baseline;
  let impact = deviation * sensitivity;

  if (invertDirection) {
    impact = -impact;
  }

  return clamp(impact, -1, 1);
}

/**
 * Create a trend analysis object
 */
function createTrend(
  indicator: string,
  baseValue: number,
  change: number,
  periodMonths: number,
  invertDirection: boolean = false,
  significanceThreshold: number = 0.5
): EconomicTrend {
  const changePercent = (change / baseValue) * 100;
  const absChange = Math.abs(changePercent);

  let direction: EconomicTrend['direction'];
  if (absChange < 2) {
    direction = 'stable';
  } else if (change > 0) {
    direction = invertDirection ? 'declining' : 'improving';
  } else {
    direction = invertDirection ? 'improving' : 'declining';
  }

  let significance: EconomicTrend['significance'];
  if (absChange > significanceThreshold * 2) {
    significance = 'high';
  } else if (absChange > significanceThreshold) {
    significance = 'medium';
  } else {
    significance = 'low';
  }

  return {
    indicator,
    direction,
    changePercent: round(changePercent, 1),
    periodMonths,
    significance,
  };
}

/**
 * Clamp value between min and max
 */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Round to specified decimal places
 */
function round(value: number, decimals: number): number {
  return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
}
