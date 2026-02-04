// Savings Projections Library for ROI Calculator
// All projections use "could" language and include disclaimers

import { getDisclaimer } from "@/lib/legal/disclaimers";

export interface SavingsProjection {
  period: "monthly" | "quarterly" | "annual";
  projectedSavings: number;
  confidenceLevel: "high" | "medium" | "low";
  disclaimer: string;
  breakdown: {
    category: string;
    amount: number;
    description: string;
  }[];
}

export interface ComparisonBenchmark {
  category: string;
  yourValue: number;
  industryAverage: number;
  percentileDifference: number;
  trend: "above" | "below" | "at";
  insight: string;
}

// Calculate projected savings based on platform usage
export function calculateProjectedSavings(
  currentMetrics: {
    hoursOnBookkeeping: number; // hours per month on manual bookkeeping
    overdueInvoicesCount: number;
    overdueInvoicesValue: number; // in cents
    avgDaysToPayment: number;
    monthlyRevenue: number; // in cents
  },
  assumptions: {
    hourlyRate?: number; // default $50/hr
    recoveryRateImprovement?: number; // default 15% improvement
    paymentSpeedImprovement?: number; // default 20% faster
  } = {}
): SavingsProjection {
  const hourlyRate = assumptions.hourlyRate ?? 5000; // $50 in cents
  const recoveryImprovement = assumptions.recoveryRateImprovement ?? 0.15;
  const paymentSpeedImprovement = assumptions.paymentSpeedImprovement ?? 0.2;

  const breakdown: SavingsProjection["breakdown"] = [];

  // Time savings (conservative estimate: 40% reduction in manual work)
  const timeSavingsHours = currentMetrics.hoursOnBookkeeping * 0.4;
  const timeSavingsValue = Math.round(timeSavingsHours * hourlyRate);
  breakdown.push({
    category: "Time Savings",
    amount: timeSavingsValue,
    description: `Could save approximately ${timeSavingsHours.toFixed(1)} hours/month on manual analysis`,
  });

  // Invoice recovery improvement
  const recoveryValue = Math.round(
    currentMetrics.overdueInvoicesValue * recoveryImprovement
  );
  breakdown.push({
    category: "Potential Recovery",
    amount: recoveryValue,
    description: `Based on improved follow-up, you could potentially recover more overdue invoices`,
  });

  // Cash flow improvement (faster payments = better cash position)
  const daysImproved = Math.round(
    currentMetrics.avgDaysToPayment * paymentSpeedImprovement
  );
  const cashFlowBenefit = Math.round(
    (currentMetrics.monthlyRevenue * daysImproved * 0.001) / 30
  ); // Simplified cash flow benefit
  breakdown.push({
    category: "Cash Flow Benefit",
    amount: cashFlowBenefit,
    description: `Faster payments could improve cash position by approximately ${daysImproved} days`,
  });

  const totalSavings = breakdown.reduce((sum, item) => sum + item.amount, 0);

  // Determine confidence based on data quality
  let confidenceLevel: "high" | "medium" | "low" = "medium";
  if (
    currentMetrics.overdueInvoicesCount > 10 &&
    currentMetrics.monthlyRevenue > 100000
  ) {
    // $1000+
    confidenceLevel = "high";
  } else if (currentMetrics.overdueInvoicesCount < 3) {
    confidenceLevel = "low";
  }

  return {
    period: "monthly",
    projectedSavings: totalSavings,
    confidenceLevel,
    disclaimer: getDisclaimer("roi", "medium"),
    breakdown,
  };
}

// Project annual savings from monthly
export function projectAnnualSavings(
  monthlySavings: SavingsProjection
): SavingsProjection {
  const annualBreakdown = monthlySavings.breakdown.map((item) => ({
    ...item,
    amount: item.amount * 12,
    description: item.description.replace("/month", "/year"),
  }));

  return {
    period: "annual",
    projectedSavings: monthlySavings.projectedSavings * 12,
    confidenceLevel: monthlySavings.confidenceLevel,
    disclaimer: getDisclaimer("roi", "medium"),
    breakdown: annualBreakdown,
  };
}

// Calculate ROI multiplier
export function calculateROIMultiplier(
  projectedMonthlySavings: number,
  monthlySubscriptionCost: number
): {
  multiplier: number;
  isPositive: boolean;
  displayText: string;
  disclaimer: string;
} {
  if (monthlySubscriptionCost === 0) {
    return {
      multiplier: 0,
      isPositive: false,
      displayText: "Unable to calculate",
      disclaimer: getDisclaimer("roi", "short"),
    };
  }

  const multiplier = projectedMonthlySavings / monthlySubscriptionCost;
  const isPositive = multiplier > 1;

  let displayText: string;
  if (multiplier >= 5) {
    displayText = `Could deliver ${multiplier.toFixed(1)}x return on your investment`;
  } else if (multiplier >= 2) {
    displayText = `Potential ${multiplier.toFixed(1)}x value on your $${(monthlySubscriptionCost / 100).toFixed(0)}/month investment`;
  } else if (multiplier >= 1) {
    displayText = `Could provide ${multiplier.toFixed(1)}x the value of your subscription`;
  } else {
    displayText = `Based on current data, value is still being established`;
  }

  return {
    multiplier,
    isPositive,
    displayText,
    disclaimer: getDisclaimer("roi", "short"),
  };
}

// Service comparison data (what similar services would cost)
export const SERVICE_COST_COMPARISONS = {
  bookkeeper: {
    name: "Part-time Bookkeeper",
    lowRange: 30000, // $300/month in cents
    highRange: 50000, // $500/month
    description: "Traditional bookkeeping services",
  },
  consultant: {
    name: "Business Consultant",
    lowRange: 15000, // $150/hour in cents
    highRange: 30000, // $300/hour
    description: "Per-hour business consulting",
  },
  analyticsTools: {
    name: "Separate Analytics Tools",
    lowRange: 5000, // $50/month
    highRange: 15000, // $150/month
    description: "Individual SaaS analytics subscriptions",
  },
  collectionService: {
    name: "Collection Agency",
    lowRange: 2500, // 25% of recovered (simplified)
    highRange: 5000, // 50% of recovered
    description: "Percentage of recovered amounts",
  },
};

export function generateCostComparison(subscriptionCost: number): {
  totalAlternativeCost: {
    low: number;
    high: number;
  };
  savingsVsAlternatives: {
    low: number;
    high: number;
  };
  comparison: {
    service: string;
    cost: { low: number; high: number };
    description: string;
  }[];
  disclaimer: string;
} {
  const comparison = Object.values(SERVICE_COST_COMPARISONS).map((service) => ({
    service: service.name,
    cost: { low: service.lowRange, high: service.highRange },
    description: service.description,
  }));

  const totalLow = Object.values(SERVICE_COST_COMPARISONS).reduce(
    (sum, s) => sum + s.lowRange,
    0
  );
  const totalHigh = Object.values(SERVICE_COST_COMPARISONS).reduce(
    (sum, s) => sum + s.highRange,
    0
  );

  return {
    totalAlternativeCost: { low: totalLow, high: totalHigh },
    savingsVsAlternatives: {
      low: totalLow - subscriptionCost,
      high: totalHigh - subscriptionCost,
    },
    comparison,
    disclaimer: getDisclaimer("benchmark", "medium"),
  };
}

// Value proposition messaging
export function generateValueProposition(
  projectedSavings: SavingsProjection,
  roi: ReturnType<typeof calculateROIMultiplier>
): {
  headline: string;
  subheadline: string;
  bulletPoints: string[];
  disclaimer: string;
} {
  const monthlySavings = projectedSavings.projectedSavings;
  const annualSavings = monthlySavings * 12;

  const bulletPoints: string[] = [];

  projectedSavings.breakdown.forEach((item) => {
    if (item.amount > 0) {
      bulletPoints.push(
        `${item.category}: Could save ~$${(item.amount / 100).toLocaleString()}/month`
      );
    }
  });

  if (roi.multiplier >= 2) {
    bulletPoints.push(
      `Potential ${roi.multiplier.toFixed(1)}x return on your investment`
    );
  }

  return {
    headline:
      annualSavings > 0
        ? `Could save up to $${(annualSavings / 100).toLocaleString()} per year`
        : "Value building as you use the platform",
    subheadline:
      projectedSavings.confidenceLevel === "high"
        ? "Based on your business data patterns"
        : "Estimate based on available data",
    bulletPoints,
    disclaimer: getDisclaimer("roi", "full"),
  };
}
