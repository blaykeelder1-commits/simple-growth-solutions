// Industry Benchmark Comparisons Library
// Activates the IndustryBenchmark model for comparison insights

import { getDisclaimer } from "@/lib/legal/disclaimers";

export interface IndustryBenchmarkData {
  industry: string;
  avgDaysToPayment: number;
  latePaymentRate: number;
  avgPaymentScore: number;
  seasonalVariation: number;
  sampleSize: number;
}

export interface BenchmarkComparison {
  metric: string;
  yourValue: number;
  industryAverage: number;
  percentile: number;
  trend: "better" | "worse" | "similar";
  insight: string;
  confidence: number;
  disclaimer: string;
}

export interface HealthScoreComparison {
  yourScore: number;
  industryAverage: number;
  percentile: number;
  ranking: string;
  recommendations: string[];
  disclaimer: string;
}

// Default industry benchmarks (used when no database data available)
export const DEFAULT_INDUSTRY_BENCHMARKS: Record<string, IndustryBenchmarkData> =
  {
    retail: {
      industry: "Retail",
      avgDaysToPayment: 28,
      latePaymentRate: 0.18,
      avgPaymentScore: 72,
      seasonalVariation: 0.25,
      sampleSize: 500,
    },
    restaurant: {
      industry: "Restaurant/Food Service",
      avgDaysToPayment: 21,
      latePaymentRate: 0.22,
      avgPaymentScore: 68,
      seasonalVariation: 0.3,
      sampleSize: 450,
    },
    professional_services: {
      industry: "Professional Services",
      avgDaysToPayment: 42,
      latePaymentRate: 0.15,
      avgPaymentScore: 75,
      seasonalVariation: 0.15,
      sampleSize: 600,
    },
    construction: {
      industry: "Construction",
      avgDaysToPayment: 52,
      latePaymentRate: 0.28,
      avgPaymentScore: 62,
      seasonalVariation: 0.35,
      sampleSize: 350,
    },
    healthcare: {
      industry: "Healthcare",
      avgDaysToPayment: 45,
      latePaymentRate: 0.12,
      avgPaymentScore: 78,
      seasonalVariation: 0.1,
      sampleSize: 400,
    },
    technology: {
      industry: "Technology/SaaS",
      avgDaysToPayment: 35,
      latePaymentRate: 0.08,
      avgPaymentScore: 82,
      seasonalVariation: 0.12,
      sampleSize: 550,
    },
    manufacturing: {
      industry: "Manufacturing",
      avgDaysToPayment: 48,
      latePaymentRate: 0.2,
      avgPaymentScore: 70,
      seasonalVariation: 0.2,
      sampleSize: 300,
    },
    ecommerce: {
      industry: "E-commerce",
      avgDaysToPayment: 14,
      latePaymentRate: 0.05,
      avgPaymentScore: 85,
      seasonalVariation: 0.4,
      sampleSize: 700,
    },
    general: {
      industry: "General/Small Business",
      avgDaysToPayment: 35,
      latePaymentRate: 0.18,
      avgPaymentScore: 72,
      seasonalVariation: 0.2,
      sampleSize: 1000,
    },
  };

// Calculate percentile position
function calculatePercentile(
  value: number,
  average: number,
  stdDev: number = 15,
  higherIsBetter: boolean = true
): number {
  // Simplified percentile calculation using z-score approximation
  const zScore = (value - average) / stdDev;
  // Approximate percentile from z-score
  let percentile = 50 + zScore * 30; // Rough approximation
  percentile = Math.max(1, Math.min(99, percentile));

  // If lower is better (like days to payment), invert
  if (!higherIsBetter) {
    percentile = 100 - percentile;
  }

  return Math.round(percentile);
}

// Compare payment collection speed
export function comparePaymentSpeed(
  yourAvgDays: number,
  industryKey: string = "general"
): BenchmarkComparison {
  const benchmark =
    DEFAULT_INDUSTRY_BENCHMARKS[industryKey] ||
    DEFAULT_INDUSTRY_BENCHMARKS.general;
  const difference = benchmark.avgDaysToPayment - yourAvgDays;
  const percentile = calculatePercentile(
    yourAvgDays,
    benchmark.avgDaysToPayment,
    12,
    false
  );

  let trend: "better" | "worse" | "similar";
  let insight: string;

  if (difference > 5) {
    trend = "better";
    insight = `Your payment collection could be approximately ${Math.abs(difference)} days faster than the ${benchmark.industry} industry average.`;
  } else if (difference < -5) {
    trend = "worse";
    insight = `Your payment collection appears to be approximately ${Math.abs(difference)} days slower than typical for ${benchmark.industry}. You could consider strategies to improve this.`;
  } else {
    trend = "similar";
    insight = `Your payment collection timeline is approximately in line with the ${benchmark.industry} industry average.`;
  }

  const confidence = Math.min(0.9, benchmark.sampleSize / 1000);

  return {
    metric: "Average Days to Payment",
    yourValue: yourAvgDays,
    industryAverage: benchmark.avgDaysToPayment,
    percentile,
    trend,
    insight,
    confidence,
    disclaimer: getDisclaimer("benchmark", "short"),
  };
}

// Compare late payment rate
export function compareLatePaymentRate(
  yourLateRate: number,
  industryKey: string = "general"
): BenchmarkComparison {
  const benchmark =
    DEFAULT_INDUSTRY_BENCHMARKS[industryKey] ||
    DEFAULT_INDUSTRY_BENCHMARKS.general;
  const difference = benchmark.latePaymentRate - yourLateRate;
  const percentile = calculatePercentile(
    yourLateRate * 100,
    benchmark.latePaymentRate * 100,
    8,
    false
  );

  let trend: "better" | "worse" | "similar";
  let insight: string;

  if (difference > 0.03) {
    trend = "better";
    insight = `Your late payment rate appears to be ${(difference * 100).toFixed(1)}% better than the ${benchmark.industry} industry average.`;
  } else if (difference < -0.03) {
    trend = "worse";
    insight = `Your late payment rate is approximately ${(Math.abs(difference) * 100).toFixed(1)}% higher than typical for ${benchmark.industry}. You could consider implementing payment reminders.`;
  } else {
    trend = "similar";
    insight = `Your late payment rate is approximately in line with the ${benchmark.industry} industry norm.`;
  }

  const confidence = Math.min(0.9, benchmark.sampleSize / 1000);

  return {
    metric: "Late Payment Rate",
    yourValue: yourLateRate,
    industryAverage: benchmark.latePaymentRate,
    percentile,
    trend,
    insight,
    confidence,
    disclaimer: getDisclaimer("benchmark", "short"),
  };
}

// Compare client payment score
export function comparePaymentScore(
  yourAvgScore: number,
  industryKey: string = "general"
): BenchmarkComparison {
  const benchmark =
    DEFAULT_INDUSTRY_BENCHMARKS[industryKey] ||
    DEFAULT_INDUSTRY_BENCHMARKS.general;
  const difference = yourAvgScore - benchmark.avgPaymentScore;
  const percentile = calculatePercentile(
    yourAvgScore,
    benchmark.avgPaymentScore,
    10,
    true
  );

  let trend: "better" | "worse" | "similar";
  let insight: string;

  if (difference > 5) {
    trend = "better";
    insight = `Your average client payment score could be approximately ${Math.abs(difference).toFixed(0)} points higher than the ${benchmark.industry} industry average.`;
  } else if (difference < -5) {
    trend = "worse";
    insight = `Your average client payment score appears to be approximately ${Math.abs(difference).toFixed(0)} points below the ${benchmark.industry} norm. You could consider reviewing client selection criteria.`;
  } else {
    trend = "similar";
    insight = `Your client payment scores are approximately in line with the ${benchmark.industry} industry average.`;
  }

  const confidence = Math.min(0.9, benchmark.sampleSize / 1000);

  return {
    metric: "Average Payment Score",
    yourValue: yourAvgScore,
    industryAverage: benchmark.avgPaymentScore,
    percentile,
    trend,
    insight,
    confidence,
    disclaimer: getDisclaimer("benchmark", "short"),
  };
}

// Generate comprehensive health score comparison
export function generateHealthScoreComparison(
  yourScore: number,
  industryKey: string = "general"
): HealthScoreComparison {
  const benchmark =
    DEFAULT_INDUSTRY_BENCHMARKS[industryKey] ||
    DEFAULT_INDUSTRY_BENCHMARKS.general;

  // Industry average health score (derived from other metrics)
  const industryAvgHealth = Math.round(
    (100 - benchmark.latePaymentRate * 100) * 0.4 +
      benchmark.avgPaymentScore * 0.4 +
      (50 - Math.min(benchmark.avgDaysToPayment - 30, 20)) * 0.2
  );

  const percentile = calculatePercentile(
    yourScore,
    industryAvgHealth,
    12,
    true
  );

  let ranking: string;
  if (percentile >= 80) {
    ranking = "Top performers";
  } else if (percentile >= 60) {
    ranking = "Above average";
  } else if (percentile >= 40) {
    ranking = "Average";
  } else if (percentile >= 20) {
    ranking = "Below average";
  } else {
    ranking = "Needs attention";
  }

  const recommendations: string[] = [];

  if (yourScore < industryAvgHealth) {
    recommendations.push(
      "You could consider reviewing payment terms for chronically late clients"
    );
    recommendations.push(
      "Setting up automated payment reminders might help improve collection rates"
    );
  }

  if (yourScore < 60) {
    recommendations.push(
      "You might want to consider requiring deposits for new high-risk clients"
    );
    recommendations.push(
      "Reviewing your invoicing process could potentially improve payment speed"
    );
  }

  if (yourScore >= industryAvgHealth) {
    recommendations.push(
      "Your cash flow health appears solid - you could consider maintaining current practices"
    );
    recommendations.push(
      "You might explore early payment discounts to further improve cash position"
    );
  }

  return {
    yourScore,
    industryAverage: industryAvgHealth,
    percentile,
    ranking,
    recommendations,
    disclaimer: getDisclaimer("benchmark", "medium"),
  };
}

// Generate all benchmark comparisons for a business
export function generateAllBenchmarks(
  businessMetrics: {
    avgDaysToPayment: number;
    latePaymentRate: number;
    avgPaymentScore: number;
    healthScore: number;
  },
  industryKey: string = "general"
): {
  comparisons: BenchmarkComparison[];
  healthComparison: HealthScoreComparison;
  overallInsight: string;
  disclaimer: string;
} {
  const comparisons = [
    comparePaymentSpeed(businessMetrics.avgDaysToPayment, industryKey),
    compareLatePaymentRate(businessMetrics.latePaymentRate, industryKey),
    comparePaymentScore(businessMetrics.avgPaymentScore, industryKey),
  ];

  const healthComparison = generateHealthScoreComparison(
    businessMetrics.healthScore,
    industryKey
  );

  // Generate overall insight
  const betterCount = comparisons.filter((c) => c.trend === "better").length;
  const worseCount = comparisons.filter((c) => c.trend === "worse").length;

  let overallInsight: string;
  if (betterCount >= 2) {
    overallInsight =
      "Your business appears to be performing above industry averages in most cash flow metrics. Maintaining these practices could continue to serve you well.";
  } else if (worseCount >= 2) {
    overallInsight =
      "There could be opportunities to improve your cash flow performance compared to industry peers. The insights above suggest areas you might want to consider addressing.";
  } else {
    overallInsight =
      "Your cash flow metrics appear to be approximately in line with industry norms, with some areas of strength and some potential opportunities for improvement.";
  }

  return {
    comparisons,
    healthComparison,
    overallInsight,
    disclaimer: getDisclaimer("benchmark", "full"),
  };
}

// Get industry list for dropdown
export function getIndustryList(): { value: string; label: string }[] {
  return Object.entries(DEFAULT_INDUSTRY_BENCHMARKS).map(([key, data]) => ({
    value: key,
    label: data.industry,
  }));
}
