// Seasonal Pattern Analysis Engine
// Analyzes business data against industry seasonal patterns to identify opportunities

import type { IndustryProfile } from "./profiles";

export interface DailyRevenue {
  date: Date;
  revenue: number; // cents
  transactionCount: number;
  averageTicket: number; // cents
}

export interface SeasonalAnalysis {
  currentMonth: number;
  currentDemandLevel: "peak" | "high" | "normal" | "low" | "off-peak";
  expectedDemandMultiplier: number;
  actualDemandMultiplier: number;
  performanceVsExpected: "outperforming" | "meeting" | "underperforming";

  monthlyBreakdown: MonthlyPerformance[];

  opportunities: SeasonalOpportunity[];
  warnings: SeasonalWarning[];

  upcomingPeriods: {
    nextPeak: { month: number; monthName: string; weeksAway: number };
    nextSlow: { month: number; monthName: string; weeksAway: number };
  };
}

export interface MonthlyPerformance {
  month: number;
  monthName: string;
  expectedMultiplier: number;
  actualMultiplier: number;
  revenue: number;
  vsExpected: number; // percentage difference
  notes?: string;
}

export interface SeasonalOpportunity {
  type: "promotion" | "staffing" | "inventory" | "marketing" | "pricing";
  title: string;
  description: string;
  timing: string;
  potentialImpact: string;
  confidence: "high" | "medium" | "low";
  monthsApplicable: number[];
}

export interface SeasonalWarning {
  type: "slow_period" | "demand_drop" | "missed_peak" | "understaffed" | "overstaffed";
  title: string;
  description: string;
  urgency: "immediate" | "soon" | "planning";
  recommendation: string;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

// Categorize demand level based on multiplier
function getDemandLevel(multiplier: number): "peak" | "high" | "normal" | "low" | "off-peak" {
  if (multiplier >= 1.3) return "peak";
  if (multiplier >= 1.1) return "high";
  if (multiplier >= 0.9) return "normal";
  if (multiplier >= 0.7) return "low";
  return "off-peak";
}

// Analyze seasonal patterns from revenue data
export function analyzeSeasonalPatterns(
  revenueData: DailyRevenue[],
  industryProfile: IndustryProfile
): SeasonalAnalysis {
  const now = new Date();
  const currentMonth = now.getMonth() + 1; // 1-indexed

  // Group revenue by month
  const monthlyRevenue = new Map<number, { total: number; days: number }>();

  revenueData.forEach((day) => {
    const month = day.date.getMonth() + 1;
    const existing = monthlyRevenue.get(month) || { total: 0, days: 0 };
    monthlyRevenue.set(month, {
      total: existing.total + day.revenue,
      days: existing.days + 1,
    });
  });

  // Calculate average daily revenue across all data
  const totalRevenue = Array.from(monthlyRevenue.values()).reduce(
    (sum, m) => sum + m.total, 0
  );
  const totalDays = Array.from(monthlyRevenue.values()).reduce(
    (sum, m) => sum + m.days, 0
  );
  const avgDailyRevenue = totalDays > 0 ? totalRevenue / totalDays : 0;

  // Calculate actual multipliers by month
  const actualMultipliers = new Map<number, number>();
  monthlyRevenue.forEach((data, month) => {
    const avgForMonth = data.days > 0 ? data.total / data.days : 0;
    const multiplier = avgDailyRevenue > 0 ? avgForMonth / avgDailyRevenue : 1;
    actualMultipliers.set(month, multiplier);
  });

  // Get expected pattern for current month
  const currentPattern = industryProfile.seasonalPatterns.find(
    (p) => p.month === currentMonth
  );
  const expectedMultiplier = currentPattern?.demandMultiplier || 1;
  const actualMultiplier = actualMultipliers.get(currentMonth) || 1;

  // Determine performance vs expected
  const performanceRatio = actualMultiplier / expectedMultiplier;
  let performanceVsExpected: "outperforming" | "meeting" | "underperforming";
  if (performanceRatio >= 1.1) {
    performanceVsExpected = "outperforming";
  } else if (performanceRatio >= 0.9) {
    performanceVsExpected = "meeting";
  } else {
    performanceVsExpected = "underperforming";
  }

  // Build monthly breakdown
  const monthlyBreakdown: MonthlyPerformance[] = industryProfile.seasonalPatterns.map(
    (pattern) => {
      const actual = actualMultipliers.get(pattern.month) || 1;
      const monthData = monthlyRevenue.get(pattern.month);
      const vsExpected = ((actual - pattern.demandMultiplier) / pattern.demandMultiplier) * 100;

      return {
        month: pattern.month,
        monthName: MONTH_NAMES[pattern.month - 1],
        expectedMultiplier: pattern.demandMultiplier,
        actualMultiplier: Math.round(actual * 100) / 100,
        revenue: monthData?.total || 0,
        vsExpected: Math.round(vsExpected),
        notes: pattern.notes,
      };
    }
  );

  // Generate opportunities and warnings
  const opportunities = generateSeasonalOpportunities(
    currentMonth,
    industryProfile,
    actualMultipliers,
    performanceVsExpected
  );

  const warnings = generateSeasonalWarnings(
    currentMonth,
    industryProfile,
    actualMultipliers,
    avgDailyRevenue
  );

  // Find next peak and slow periods
  const upcomingPeriods = findUpcomingPeriods(currentMonth, industryProfile);

  return {
    currentMonth,
    currentDemandLevel: getDemandLevel(expectedMultiplier),
    expectedDemandMultiplier: expectedMultiplier,
    actualDemandMultiplier: Math.round(actualMultiplier * 100) / 100,
    performanceVsExpected,
    monthlyBreakdown,
    opportunities,
    warnings,
    upcomingPeriods,
  };
}

// Generate seasonal opportunities
function generateSeasonalOpportunities(
  currentMonth: number,
  profile: IndustryProfile,
  actualMultipliers: Map<number, number>,
  performance: "outperforming" | "meeting" | "underperforming"
): SeasonalOpportunity[] {
  const opportunities: SeasonalOpportunity[] = [];

  // Check upcoming months for slow periods
  const upcomingSlowMonths = profile.seasonalPatterns
    .filter((p) => {
      const monthsAway = (p.month - currentMonth + 12) % 12;
      return monthsAway > 0 && monthsAway <= 3 && p.demandMultiplier < 0.9;
    })
    .sort((a, b) => a.demandMultiplier - b.demandMultiplier);

  if (upcomingSlowMonths.length > 0) {
    const slowest = upcomingSlowMonths[0];
    const weeksAway = Math.round(((slowest.month - currentMonth + 12) % 12) * 4.3);

    opportunities.push({
      type: "promotion",
      title: "Pre-Slow Season Promotion",
      description: `${MONTH_NAMES[slowest.month - 1]} is typically a slower month (${Math.round((1 - slowest.demandMultiplier) * 100)}% below average). Running promotions could help maintain revenue.`,
      timing: `Plan now, launch in ${weeksAway - 2} weeks`,
      potentialImpact: "Could increase slow-period revenue by 15-25%",
      confidence: "high",
      monthsApplicable: [slowest.month],
    });
  }

  // Check for upcoming peak periods
  const upcomingPeakMonths = profile.seasonalPatterns
    .filter((p) => {
      const monthsAway = (p.month - currentMonth + 12) % 12;
      return monthsAway > 0 && monthsAway <= 2 && p.demandMultiplier >= 1.2;
    });

  if (upcomingPeakMonths.length > 0) {
    const peak = upcomingPeakMonths[0];

    opportunities.push({
      type: "staffing",
      title: "Peak Season Preparation",
      description: `${MONTH_NAMES[peak.month - 1]} typically sees ${Math.round((peak.demandMultiplier - 1) * 100)}% higher demand. Consider scheduling additional staff now.`,
      timing: "Begin staffing preparations immediately",
      potentialImpact: "Avoid missed appointments and customer dissatisfaction",
      confidence: "high",
      monthsApplicable: [peak.month],
    });

    opportunities.push({
      type: "pricing",
      title: "Peak Season Pricing",
      description: `During high-demand ${MONTH_NAMES[peak.month - 1]}, you could adjust pricing. Customers typically accept 5-10% increases during peak times.`,
      timing: `Implement ${Math.round(((peak.month - currentMonth + 12) % 12) * 4.3)} weeks before peak`,
      potentialImpact: "Could increase peak revenue by 5-10% with minimal impact on volume",
      confidence: "medium",
      monthsApplicable: [peak.month],
    });
  }

  // If underperforming, suggest immediate actions
  if (performance === "underperforming") {
    opportunities.push({
      type: "marketing",
      title: "Boost Current Performance",
      description: "You're currently below expected demand for this time of year. Targeted marketing could help close the gap.",
      timing: "Implement within 1-2 weeks",
      potentialImpact: "Could recover 10-15% of expected demand",
      confidence: "medium",
      monthsApplicable: [currentMonth],
    });
  }

  // Loyalty program opportunity during slow periods
  const currentPattern = profile.seasonalPatterns.find((p) => p.month === currentMonth);
  if (currentPattern && currentPattern.demandMultiplier < 0.85) {
    opportunities.push({
      type: "promotion",
      title: "Loyalty Program Push",
      description: "During this slower period, double loyalty points or offer referral bonuses to maintain engagement.",
      timing: "Launch immediately",
      potentialImpact: "Could increase visit frequency by 20% among existing customers",
      confidence: "high",
      monthsApplicable: [currentMonth],
    });
  }

  return opportunities;
}

// Generate seasonal warnings
function generateSeasonalWarnings(
  currentMonth: number,
  profile: IndustryProfile,
  actualMultipliers: Map<number, number>,
  _avgDailyRevenue: number
): SeasonalWarning[] {
  const warnings: SeasonalWarning[] = [];

  const currentPattern = profile.seasonalPatterns.find((p) => p.month === currentMonth);
  const actualCurrent = actualMultipliers.get(currentMonth) || 1;

  // Check if significantly underperforming
  if (currentPattern && actualCurrent < currentPattern.demandMultiplier * 0.75) {
    warnings.push({
      type: "demand_drop",
      title: "Revenue Below Expected",
      description: `Current revenue is ${Math.round((1 - actualCurrent / currentPattern.demandMultiplier) * 100)}% below typical for ${MONTH_NAMES[currentMonth - 1]}.`,
      urgency: "immediate",
      recommendation: "Review marketing spend, customer satisfaction, and local competition",
    });
  }

  // Check for upcoming slow period
  const nextMonth = (currentMonth % 12) + 1;
  const nextPattern = profile.seasonalPatterns.find((p) => p.month === nextMonth);

  if (nextPattern && nextPattern.demandMultiplier < 0.8 && currentPattern && currentPattern.demandMultiplier >= 1.0) {
    warnings.push({
      type: "slow_period",
      title: "Slow Period Approaching",
      description: `${MONTH_NAMES[nextMonth - 1]} is typically ${Math.round((1 - nextPattern.demandMultiplier) * 100)}% below average. Prepare for reduced revenue.`,
      urgency: "soon",
      recommendation: "Consider reducing inventory orders, scheduling staff vacations, or planning promotional campaigns",
    });
  }

  // Check if in peak season but not capitalizing
  if (currentPattern && currentPattern.demandMultiplier >= 1.2 && actualCurrent < 1.1) {
    warnings.push({
      type: "missed_peak",
      title: "Peak Season Underperformance",
      description: `This should be a peak period, but you're not seeing the expected increase.`,
      urgency: "immediate",
      recommendation: "Check capacity - are you fully booked? If yes, consider extending hours. If not, increase marketing.",
    });
  }

  return warnings;
}

// Find upcoming peak and slow periods
function findUpcomingPeriods(
  currentMonth: number,
  profile: IndustryProfile
): {
  nextPeak: { month: number; monthName: string; weeksAway: number };
  nextSlow: { month: number; monthName: string; weeksAway: number };
} {
  let nextPeak = { month: currentMonth, monthName: MONTH_NAMES[currentMonth - 1], weeksAway: 0 };
  let nextSlow = { month: currentMonth, monthName: MONTH_NAMES[currentMonth - 1], weeksAway: 0 };

  // Find next peak (multiplier >= 1.2)
  for (let i = 1; i <= 12; i++) {
    const checkMonth = ((currentMonth - 1 + i) % 12) + 1;
    const pattern = profile.seasonalPatterns.find((p) => p.month === checkMonth);
    if (pattern && pattern.demandMultiplier >= 1.2) {
      nextPeak = {
        month: checkMonth,
        monthName: MONTH_NAMES[checkMonth - 1],
        weeksAway: Math.round(i * 4.3),
      };
      break;
    }
  }

  // Find next slow (multiplier <= 0.85)
  for (let i = 1; i <= 12; i++) {
    const checkMonth = ((currentMonth - 1 + i) % 12) + 1;
    const pattern = profile.seasonalPatterns.find((p) => p.month === checkMonth);
    if (pattern && pattern.demandMultiplier <= 0.85) {
      nextSlow = {
        month: checkMonth,
        monthName: MONTH_NAMES[checkMonth - 1],
        weeksAway: Math.round(i * 4.3),
      };
      break;
    }
  }

  return { nextPeak, nextSlow };
}

// Project revenue based on seasonal patterns
export function projectSeasonalRevenue(
  currentMonthlyRevenue: number,
  currentMonth: number,
  profile: IndustryProfile,
  monthsToProject: number = 12
): { month: number; monthName: string; projectedRevenue: number; multiplier: number }[] {
  const projections: { month: number; monthName: string; projectedRevenue: number; multiplier: number }[] = [];

  // Normalize current revenue to base
  const currentPattern = profile.seasonalPatterns.find((p) => p.month === currentMonth);
  const currentMultiplier = currentPattern?.demandMultiplier || 1;
  const baseMonthlyRevenue = currentMonthlyRevenue / currentMultiplier;

  for (let i = 0; i < monthsToProject; i++) {
    const projMonth = ((currentMonth - 1 + i) % 12) + 1;
    const pattern = profile.seasonalPatterns.find((p) => p.month === projMonth);
    const multiplier = pattern?.demandMultiplier || 1;

    projections.push({
      month: projMonth,
      monthName: MONTH_NAMES[projMonth - 1],
      projectedRevenue: Math.round(baseMonthlyRevenue * multiplier),
      multiplier,
    });
  }

  return projections;
}

// Get seasonal insight summary for AI
export function getSeasonalInsightSummary(analysis: SeasonalAnalysis): string {
  const lines: string[] = [];

  // Current status
  lines.push(`Current seasonal status: ${analysis.currentDemandLevel} demand period`);
  lines.push(`Performance vs expected: ${analysis.performanceVsExpected} (actual ${analysis.actualDemandMultiplier}x vs expected ${analysis.expectedDemandMultiplier}x)`);

  // Top opportunities
  if (analysis.opportunities.length > 0) {
    lines.push("\nTop opportunities:");
    analysis.opportunities.slice(0, 3).forEach((opp) => {
      lines.push(`- ${opp.title}: ${opp.description}`);
    });
  }

  // Warnings
  if (analysis.warnings.length > 0) {
    lines.push("\nWarnings:");
    analysis.warnings.forEach((warn) => {
      lines.push(`- [${warn.urgency}] ${warn.title}: ${warn.recommendation}`);
    });
  }

  // Upcoming periods
  lines.push(`\nUpcoming: Next peak in ${analysis.upcomingPeriods.nextPeak.weeksAway} weeks (${analysis.upcomingPeriods.nextPeak.monthName})`);
  lines.push(`Next slow period in ${analysis.upcomingPeriods.nextSlow.weeksAway} weeks (${analysis.upcomingPeriods.nextSlow.monthName})`);

  return lines.join("\n");
}
