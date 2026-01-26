// Industry-Specific AI Insight Generator
// Generates actionable insights by combining all intelligence sources

import type { IndustryProfile, IndustrySubtype } from "./profiles";
import { getIndustryProfile } from "./profiles";
import type { AcquisitionAnalysis, CustomerAcquisition } from "./acquisition";
import { analyzeAcquisition, CHANNEL_DISPLAY_NAMES } from "./acquisition";
import type { SeasonalAnalysis, DailyRevenue } from "./seasonal";
import { analyzeSeasonalPatterns, getSeasonalInsightSummary } from "./seasonal";
import type { CompetitivePosition, LocalMarketData, RegionalBenchmark } from "./market-intelligence";
import {
  getLocalMarketData,
  analyzeCompetitivePosition,
  createRegionalBenchmarks,
  getMarketIntelligenceSummary,
} from "./market-intelligence";

export interface BusinessIntelligenceContext {
  // Business basics
  businessName: string;
  industrySubtype: IndustrySubtype;
  region: string;

  // Calculated intelligence
  industryProfile: IndustryProfile;
  acquisitionAnalysis?: AcquisitionAnalysis;
  seasonalAnalysis?: SeasonalAnalysis;
  competitivePosition?: CompetitivePosition;
  marketData?: LocalMarketData;
  regionalBenchmarks?: RegionalBenchmark[];
}

export interface GeneratedInsight {
  id: string;
  type: "opportunity" | "warning" | "achievement" | "recommendation" | "benchmark";
  priority: "high" | "medium" | "low";
  category: "revenue" | "customers" | "operations" | "marketing" | "pricing" | "seasonal" | "benchmark";

  title: string;
  summary: string; // One-liner
  details: string; // Full explanation
  dataPoints: string[]; // Supporting evidence

  action?: {
    title: string;
    description: string;
    potentialImpact: string;
    difficulty: "easy" | "medium" | "hard";
    timeframe: string;
  };

  relevantMonths?: number[]; // When this applies
  confidence: "high" | "medium" | "low";
}

export interface BusinessIntelligenceReport {
  generatedAt: Date;
  businessName: string;
  industry: string;
  region: string;

  // Executive summary
  healthScore: number; // 0-100
  healthFactors: { factor: string; score: number; impact: "positive" | "neutral" | "negative" }[];

  // Key metrics
  keyMetrics: {
    metric: string;
    value: string;
    vsIndustry: string;
    trend: "up" | "stable" | "down";
  }[];

  // All insights sorted by priority
  insights: GeneratedInsight[];

  // Top 3 actions
  topActions: GeneratedInsight["action"][];

  // Raw context for AI
  aiContext: string;
}

// Main function to generate full business intelligence
export function generateBusinessIntelligence(
  businessName: string,
  industrySubtype: IndustrySubtype,
  region: string,
  revenueData: DailyRevenue[],
  customerData: CustomerAcquisition[],
  businessMetrics: {
    averageTicket: number;
    monthlyRevenue: number;
    customerCount: number;
    repeatRate: number;
    averageRating?: number;
    reviewCount?: number;
  }
): BusinessIntelligenceReport {
  // Get industry profile
  const industryProfile = getIndustryProfile(industrySubtype);

  // Run all analyses
  const acquisitionAnalysis = analyzeAcquisition(customerData, industryProfile);
  const seasonalAnalysis = analyzeSeasonalPatterns(revenueData, industryProfile);
  const marketData = getLocalMarketData(region, industrySubtype);
  const competitivePosition = analyzeCompetitivePosition(businessMetrics, marketData, industryProfile);
  const regionalBenchmarks = createRegionalBenchmarks(businessMetrics, marketData, industryProfile);

  // Generate all insights
  const insights = generateAllInsights({
    businessName,
    industrySubtype,
    region,
    industryProfile,
    acquisitionAnalysis,
    seasonalAnalysis,
    competitivePosition,
    marketData,
    regionalBenchmarks,
  });

  // Calculate health score
  const { healthScore, healthFactors } = calculateHealthScore(
    acquisitionAnalysis,
    seasonalAnalysis,
    competitivePosition,
    businessMetrics,
    industryProfile
  );

  // Build key metrics
  const keyMetrics = buildKeyMetrics(
    businessMetrics,
    acquisitionAnalysis,
    competitivePosition,
    industryProfile
  );

  // Get top 3 actions from insights
  const topActions = insights
    .filter((i) => i.action)
    .sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    })
    .slice(0, 3)
    .map((i) => i.action!);

  // Build AI context
  const aiContext = buildAIContext({
    businessName,
    industrySubtype,
    region,
    industryProfile,
    acquisitionAnalysis,
    seasonalAnalysis,
    competitivePosition,
    marketData,
    regionalBenchmarks,
  });

  return {
    generatedAt: new Date(),
    businessName,
    industry: industryProfile.displayName,
    region,
    healthScore,
    healthFactors,
    keyMetrics,
    insights,
    topActions,
    aiContext,
  };
}

// Generate insights from all sources
function generateAllInsights(context: BusinessIntelligenceContext): GeneratedInsight[] {
  const insights: GeneratedInsight[] = [];
  let insightId = 1;

  // === ACQUISITION INSIGHTS ===
  if (context.acquisitionAnalysis) {
    const acq = context.acquisitionAnalysis;

    // Top channel insight
    if (acq.summary.topChannelPercentage > 0.3) {
      const topChannelName = CHANNEL_DISPLAY_NAMES[acq.summary.topChannel];
      insights.push({
        id: `insight-${insightId++}`,
        type: "achievement",
        priority: "medium",
        category: "customers",
        title: `${topChannelName} is Your Top Channel`,
        summary: `${Math.round(acq.summary.topChannelPercentage * 100)}% of customers come from ${topChannelName}`,
        details: `I see you get a lot of customers through ${topChannelName}. This channel brought in ${acq.byChannel[0]?.totalCustomers || 0} customers with an average lifetime value of $${((acq.byChannel[0]?.averageLifetimeValue || 0) / 100).toFixed(0)}.`,
        dataPoints: [
          `${Math.round(acq.summary.topChannelPercentage * 100)}% of all customers`,
          `${acq.byChannel[0]?.newCustomersThisMonth || 0} new customers this month`,
          `$${((acq.byChannel[0]?.averageLifetimeValue || 0) / 100).toFixed(0)} average lifetime value`,
        ],
        action: {
          title: `Double Down on ${topChannelName}`,
          description: `Increase investment in ${topChannelName} marketing and consider promoting referrals from these customers`,
          potentialImpact: "Could increase customer acquisition by 15-25%",
          difficulty: "easy",
          timeframe: "1-2 months",
        },
        confidence: "high",
      });
    }

    // Fastest growing channel
    if (acq.trends.fastestGrowingChannel !== acq.summary.topChannel) {
      const growingChannel = acq.byChannel.find(
        (c) => c.channel === acq.trends.fastestGrowingChannel
      );
      if (growingChannel && growingChannel.growthRate > 0.15) {
        insights.push({
          id: `insight-${insightId++}`,
          type: "opportunity",
          priority: "high",
          category: "marketing",
          title: `${growingChannel.displayName} is Growing Fast`,
          summary: `${Math.round(growingChannel.growthRate * 100)}% growth in ${growingChannel.displayName} customers`,
          details: `${growingChannel.displayName} is your fastest growing channel with ${Math.round(growingChannel.growthRate * 100)}% month-over-month growth. This could become a major source of new customers.`,
          dataPoints: [
            `${growingChannel.newCustomersThisMonth} new customers this month vs ${growingChannel.newCustomersLastMonth} last month`,
            `${Math.round(growingChannel.repeatRate * 100)}% repeat rate`,
          ],
          action: {
            title: `Invest More in ${growingChannel.displayName}`,
            description: `Allocate additional marketing budget to ${growingChannel.displayName} while it's trending`,
            potentialImpact: `Could capture ${Math.round(growingChannel.growthRate * 50)}% more customers`,
            difficulty: "medium",
            timeframe: "Immediate",
          },
          confidence: "high",
        });
      }
    }

    // Declining channels warning
    if (acq.trends.decliningChannels.length > 0) {
      const decliningNames = acq.trends.decliningChannels
        .slice(0, 2)
        .map((c) => CHANNEL_DISPLAY_NAMES[c])
        .join(" and ");

      insights.push({
        id: `insight-${insightId++}`,
        type: "warning",
        priority: "medium",
        category: "marketing",
        title: "Some Channels Are Declining",
        summary: `${decliningNames} showing reduced customer acquisition`,
        details: `${decliningNames} ${acq.trends.decliningChannels.length > 1 ? "are" : "is"} bringing fewer customers compared to last month. This could indicate changing customer preferences or increased competition.`,
        dataPoints: acq.trends.decliningChannels.slice(0, 2).map((c) => {
          const perf = acq.byChannel.find((p) => p.channel === c);
          return `${CHANNEL_DISPLAY_NAMES[c]}: ${Math.round((perf?.growthRate || 0) * 100)}% change`;
        }),
        action: {
          title: "Investigate Channel Decline",
          description: "Review marketing effectiveness and customer feedback for these channels",
          potentialImpact: "Could recover 10-20% of lost acquisition",
          difficulty: "medium",
          timeframe: "1-2 weeks",
        },
        confidence: "medium",
      });
    }

    // Referral opportunity
    acq.recommendations
      .filter((r) => r.channel === "referral")
      .forEach((r) => {
        insights.push({
          id: `insight-${insightId++}`,
          type: "recommendation",
          priority: "medium",
          category: "customers",
          title: r.title,
          summary: r.description,
          details: `${r.description} Referral customers typically have 25% higher retention and cost significantly less to acquire.`,
          dataPoints: [r.potentialImpact],
          action: {
            title: "Launch Referral Incentive",
            description: "Offer existing customers a discount or credit for successful referrals",
            potentialImpact: r.potentialImpact,
            difficulty: r.difficulty,
            timeframe: "2-4 weeks to implement",
          },
          confidence: "high",
        });
      });
  }

  // === SEASONAL INSIGHTS ===
  if (context.seasonalAnalysis) {
    const seasonal = context.seasonalAnalysis;

    // Current performance vs expected
    if (seasonal.performanceVsExpected === "underperforming") {
      insights.push({
        id: `insight-${insightId++}`,
        type: "warning",
        priority: "high",
        category: "revenue",
        title: "Below Expected for This Season",
        summary: `Currently at ${Math.round(seasonal.actualDemandMultiplier * 100)}% vs expected ${Math.round(seasonal.expectedDemandMultiplier * 100)}%`,
        details: `Your revenue is below typical levels for this time of year. Industry data suggests you could be doing ${Math.round((seasonal.expectedDemandMultiplier - seasonal.actualDemandMultiplier) * 100)}% better.`,
        dataPoints: [
          `Current demand level: ${seasonal.currentDemandLevel}`,
          `Expected: ${Math.round(seasonal.expectedDemandMultiplier * 100)}% of baseline`,
          `Actual: ${Math.round(seasonal.actualDemandMultiplier * 100)}% of baseline`,
        ],
        action: {
          title: "Boost Current Period Performance",
          description: "Run targeted promotions or increase marketing to capture expected demand",
          potentialImpact: `Could recover ${Math.round((seasonal.expectedDemandMultiplier - seasonal.actualDemandMultiplier) * 50)}% of missed revenue`,
          difficulty: "medium",
          timeframe: "Immediate",
        },
        confidence: "high",
      });
    } else if (seasonal.performanceVsExpected === "outperforming") {
      insights.push({
        id: `insight-${insightId++}`,
        type: "achievement",
        priority: "low",
        category: "revenue",
        title: "Outperforming Seasonal Expectations",
        summary: `${Math.round((seasonal.actualDemandMultiplier / seasonal.expectedDemandMultiplier - 1) * 100)}% above expected for this period`,
        details: `Great work! You're beating typical seasonal performance. Your strategies are working better than industry average.`,
        dataPoints: [
          `Actual: ${Math.round(seasonal.actualDemandMultiplier * 100)}% vs Expected: ${Math.round(seasonal.expectedDemandMultiplier * 100)}%`,
        ],
        confidence: "high",
      });
    }

    // Upcoming slow period warning with promotion suggestion
    seasonal.opportunities
      .filter((o) => o.type === "promotion" && o.confidence === "high")
      .forEach((opp) => {
        insights.push({
          id: `insight-${insightId++}`,
          type: "opportunity",
          priority: "high",
          category: "seasonal",
          title: opp.title,
          summary: opp.description,
          details: `${opp.description} Running specials during the slow season could increase your revenue by 15-25% compared to doing nothing.`,
          dataPoints: [opp.potentialImpact, `Timing: ${opp.timing}`],
          action: {
            title: "Plan Slow-Season Promotion",
            description: "Create a special offer or package deal to drive traffic during the slower months",
            potentialImpact: "Could increase slow-period revenue by 15-25%",
            difficulty: "easy",
            timeframe: opp.timing,
          },
          relevantMonths: opp.monthsApplicable,
          confidence: "high",
        });
      });

    // Peak season preparation
    seasonal.opportunities
      .filter((o) => o.type === "staffing")
      .forEach((opp) => {
        insights.push({
          id: `insight-${insightId++}`,
          type: "recommendation",
          priority: "medium",
          category: "operations",
          title: opp.title,
          summary: opp.description,
          details: opp.description,
          dataPoints: [opp.potentialImpact],
          action: {
            title: "Prepare for Peak Season",
            description: "Schedule additional staff, stock up on supplies, and ensure capacity is ready",
            potentialImpact: opp.potentialImpact,
            difficulty: "medium",
            timeframe: opp.timing,
          },
          relevantMonths: opp.monthsApplicable,
          confidence: "high",
        });
      });
  }

  // === MARKET/COMPETITIVE INSIGHTS ===
  if (context.competitivePosition && context.marketData) {
    const position = context.competitivePosition;
    const market = context.marketData;

    // Pricing position insight
    insights.push({
      id: `insight-${insightId++}`,
      type: "benchmark",
      priority: "medium",
      category: "pricing",
      title: `Top ${100 - position.pricePercentile}% for Pricing`,
      summary: `Your pricing ranks in the top ${100 - position.pricePercentile}% for your area`,
      details: `You're positioned as ${position.pricePosition} in the ${market.region} market. Your prices are ${position.priceVsMedian > 0 ? position.priceVsMedian + "% above" : Math.abs(position.priceVsMedian) + "% below"} the regional median.`,
      dataPoints: [
        `Your position: ${position.pricePosition}`,
        `Regional median: $${(market.priceRange.median / 100).toFixed(0)}`,
        `${position.priceVsMedian > 0 ? "+" : ""}${position.priceVsMedian}% vs median`,
      ],
      confidence: "high",
    });

    // Market recommendations
    position.recommendations.forEach((rec) => {
      insights.push({
        id: `insight-${insightId++}`,
        type: "recommendation",
        priority: rec.timeframe === "immediate" ? "high" : "medium",
        category: rec.type === "pricing" ? "pricing" : "marketing",
        title: rec.title,
        summary: rec.description,
        details: `${rec.description}\n\nRationale: ${rec.rationale}`,
        dataPoints: [rec.potentialImpact],
        action: {
          title: rec.title,
          description: rec.description,
          potentialImpact: rec.potentialImpact,
          difficulty: rec.difficulty,
          timeframe: rec.timeframe === "immediate" ? "This week" : rec.timeframe === "short-term" ? "1-3 months" : "3-6 months",
        },
        confidence: "medium",
      });
    });
  }

  // === REGIONAL BENCHMARKS ===
  if (context.regionalBenchmarks) {
    context.regionalBenchmarks.forEach((benchmark) => {
      if (benchmark.percentile >= 70) {
        insights.push({
          id: `insight-${insightId++}`,
          type: "achievement",
          priority: "low",
          category: "benchmark",
          title: `Strong ${benchmark.metric}`,
          summary: benchmark.interpretation,
          details: `Your ${benchmark.metric.toLowerCase()} puts you ahead of ${benchmark.percentile}% of similar businesses in your region.`,
          dataPoints: [
            `Your value: ${typeof benchmark.yourValue === "number" && benchmark.yourValue > 100 ? "$" + (benchmark.yourValue / 100).toFixed(0) : benchmark.yourValue}`,
            `Regional median: ${typeof benchmark.regionalMedian === "number" && benchmark.regionalMedian > 100 ? "$" + (benchmark.regionalMedian / 100).toFixed(0) : benchmark.regionalMedian}`,
          ],
          confidence: "high",
        });
      } else if (benchmark.percentile <= 30) {
        insights.push({
          id: `insight-${insightId++}`,
          type: "opportunity",
          priority: "medium",
          category: "benchmark",
          title: `Improve ${benchmark.metric}`,
          summary: benchmark.interpretation,
          details: `Your ${benchmark.metric.toLowerCase()} has room for improvement compared to regional peers.`,
          dataPoints: [
            `Your value: ${typeof benchmark.yourValue === "number" && benchmark.yourValue > 100 ? "$" + (benchmark.yourValue / 100).toFixed(0) : benchmark.yourValue}`,
            `Regional median: ${typeof benchmark.regionalMedian === "number" && benchmark.regionalMedian > 100 ? "$" + (benchmark.regionalMedian / 100).toFixed(0) : benchmark.regionalMedian}`,
          ],
          action: {
            title: `Improve ${benchmark.metric}`,
            description: `Focus on strategies to improve this metric toward industry standards`,
            potentialImpact: "Could move into top 50% of regional peers",
            difficulty: "medium",
            timeframe: "3-6 months",
          },
          confidence: "medium",
        });
      }
    });
  }

  // Sort by priority
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  insights.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  return insights;
}

// Calculate overall health score
function calculateHealthScore(
  acquisition: AcquisitionAnalysis | undefined,
  seasonal: SeasonalAnalysis | undefined,
  position: CompetitivePosition | undefined,
  metrics: { repeatRate: number },
  profile: IndustryProfile
): { healthScore: number; healthFactors: { factor: string; score: number; impact: "positive" | "neutral" | "negative" }[] } {
  const factors: { factor: string; score: number; impact: "positive" | "neutral" | "negative" }[] = [];

  // Repeat rate factor (25 points max)
  const repeatScore = Math.min(25, (metrics.repeatRate / profile.repeatCustomerRate) * 25);
  factors.push({
    factor: "Customer Retention",
    score: Math.round(repeatScore),
    impact: repeatScore >= 20 ? "positive" : repeatScore >= 12 ? "neutral" : "negative",
  });

  // Acquisition diversity factor (25 points max)
  let acquisitionScore = 15; // default
  if (acquisition) {
    const channelCount = acquisition.byChannel.filter((c) => c.totalCustomers >= 5).length;
    acquisitionScore = Math.min(25, channelCount * 5);
  }
  factors.push({
    factor: "Acquisition Channels",
    score: Math.round(acquisitionScore),
    impact: acquisitionScore >= 20 ? "positive" : acquisitionScore >= 12 ? "neutral" : "negative",
  });

  // Seasonal performance factor (25 points max)
  let seasonalScore = 15; // default
  if (seasonal) {
    if (seasonal.performanceVsExpected === "outperforming") seasonalScore = 25;
    else if (seasonal.performanceVsExpected === "meeting") seasonalScore = 18;
    else seasonalScore = 8;
  }
  factors.push({
    factor: "Seasonal Performance",
    score: Math.round(seasonalScore),
    impact: seasonalScore >= 20 ? "positive" : seasonalScore >= 12 ? "neutral" : "negative",
  });

  // Market position factor (25 points max)
  let marketScore = 15; // default
  if (position) {
    if (position.pricePercentile >= 60 && position.competitiveAdvantages.length > position.competitiveWeaknesses.length) {
      marketScore = 22;
    } else if (position.competitiveWeaknesses.length > position.competitiveAdvantages.length) {
      marketScore = 10;
    }
  }
  factors.push({
    factor: "Market Position",
    score: Math.round(marketScore),
    impact: marketScore >= 20 ? "positive" : marketScore >= 12 ? "neutral" : "negative",
  });

  const healthScore = factors.reduce((sum, f) => sum + f.score, 0);

  return { healthScore, healthFactors: factors };
}

// Build key metrics display
function buildKeyMetrics(
  metrics: { averageTicket: number; monthlyRevenue: number; customerCount: number; repeatRate: number },
  acquisition: AcquisitionAnalysis | undefined,
  position: CompetitivePosition | undefined,
  profile: IndustryProfile
): { metric: string; value: string; vsIndustry: string; trend: "up" | "stable" | "down" }[] {
  const keyMetrics: { metric: string; value: string; vsIndustry: string; trend: "up" | "stable" | "down" }[] = [];

  // Monthly revenue
  keyMetrics.push({
    metric: "Monthly Revenue",
    value: `$${(metrics.monthlyRevenue / 100).toLocaleString()}`,
    vsIndustry: "—",
    trend: "stable",
  });

  // Average ticket
  keyMetrics.push({
    metric: "Average Ticket",
    value: `$${(metrics.averageTicket / 100).toFixed(0)}`,
    vsIndustry: position ? `Top ${100 - position.pricePercentile}%` : "—",
    trend: "stable",
  });

  // Customer count
  keyMetrics.push({
    metric: "Active Customers",
    value: metrics.customerCount.toString(),
    vsIndustry: acquisition ? `${acquisition.summary.totalNewThisMonth} new this month` : "—",
    trend: acquisition && acquisition.summary.totalNewThisMonth > 10 ? "up" : "stable",
  });

  // Repeat rate
  const repeatVsIndustry = Math.round((metrics.repeatRate / profile.repeatCustomerRate - 1) * 100);
  keyMetrics.push({
    metric: "Repeat Rate",
    value: `${Math.round(metrics.repeatRate * 100)}%`,
    vsIndustry: `${repeatVsIndustry >= 0 ? "+" : ""}${repeatVsIndustry}% vs industry`,
    trend: repeatVsIndustry >= 5 ? "up" : repeatVsIndustry <= -5 ? "down" : "stable",
  });

  return keyMetrics;
}

// Build comprehensive AI context string
function buildAIContext(context: BusinessIntelligenceContext): string {
  const lines: string[] = [];

  lines.push(`# Business Intelligence Context for ${context.businessName}`);
  lines.push(`Industry: ${context.industryProfile.displayName}`);
  lines.push(`Region: ${context.region}`);
  lines.push("");

  // Industry profile summary
  lines.push("## Industry Profile");
  lines.push(`- Typical customer visits ${context.industryProfile.averageVisitsPerYear}x/year`);
  lines.push(`- Industry repeat rate: ${Math.round(context.industryProfile.repeatCustomerRate * 100)}%`);
  lines.push(`- Typical margins: ${Math.round(context.industryProfile.typicalMargins.gross * 100)}% gross, ${Math.round(context.industryProfile.typicalMargins.net * 100)}% net`);
  lines.push(`- Top challenges: ${context.industryProfile.topChallenges.slice(0, 3).join(", ")}`);
  lines.push("");

  // Acquisition summary
  if (context.acquisitionAnalysis) {
    const acq = context.acquisitionAnalysis;
    lines.push("## Customer Acquisition");
    lines.push(`- Total customers: ${acq.summary.totalCustomers}`);
    lines.push(`- New this month: ${acq.summary.totalNewThisMonth}`);
    lines.push(`- Top channel: ${CHANNEL_DISPLAY_NAMES[acq.summary.topChannel]} (${Math.round(acq.summary.topChannelPercentage * 100)}%)`);
    lines.push(`- Average LTV: $${(acq.summary.averageLifetimeValue / 100).toFixed(0)}`);
    lines.push(`- Repeat rate: ${Math.round(acq.summary.overallRepeatRate * 100)}%`);
    if (acq.trends.emergingOpportunities.length > 0) {
      lines.push(`- Emerging opportunities: ${acq.trends.emergingOpportunities.join("; ")}`);
    }
    lines.push("");
  }

  // Seasonal summary
  if (context.seasonalAnalysis) {
    lines.push("## Seasonal Analysis");
    lines.push(getSeasonalInsightSummary(context.seasonalAnalysis));
    lines.push("");
  }

  // Market summary
  if (context.competitivePosition && context.marketData && context.regionalBenchmarks) {
    lines.push(getMarketIntelligenceSummary(
      context.competitivePosition,
      context.marketData,
      context.regionalBenchmarks
    ));
  }

  return lines.join("\n");
}

// Export a simple function for quick insights
export function getQuickInsights(
  industrySubtype: IndustrySubtype,
  region: string,
  metrics: {
    averageTicket: number;
    monthlyRevenue: number;
    topAcquisitionChannel?: string;
    repeatRate?: number;
  }
): string[] {
  const profile = getIndustryProfile(industrySubtype);
  const market = getLocalMarketData(region, industrySubtype);

  const insights: string[] = [];

  // Pricing insight
  const pricePercentile = Math.min(95, Math.max(5,
    50 + ((metrics.averageTicket - market.priceRange.median) / market.priceRange.median) * 50
  ));

  if (pricePercentile >= 70) {
    insights.push(`Your pricing is in the top ${100 - Math.round(pricePercentile)}% for ${region}`);
  } else if (pricePercentile <= 30) {
    insights.push(`You could potentially raise prices - you're in the bottom ${Math.round(pricePercentile)}% for your area`);
  }

  // Acquisition insight
  if (metrics.topAcquisitionChannel) {
    insights.push(`I see you get a lot of customers through ${metrics.topAcquisitionChannel}`);
  }

  // Seasonal insight
  const currentMonth = new Date().getMonth() + 1;
  const currentPattern = profile.seasonalPatterns.find((p) => p.month === currentMonth);
  if (currentPattern && currentPattern.demandMultiplier < 0.9) {
    insights.push(`This is typically a slower period - running specials could increase revenue by 15-20%`);
  } else if (currentPattern && currentPattern.demandMultiplier > 1.1) {
    insights.push(`This is peak season - make sure you have capacity to meet demand`);
  }

  // Repeat rate insight
  if (metrics.repeatRate !== undefined) {
    const vsIndustry = metrics.repeatRate / profile.repeatCustomerRate;
    if (vsIndustry < 0.8) {
      insights.push(`Your repeat rate is below industry average - focusing on retention could boost revenue significantly`);
    } else if (vsIndustry > 1.2) {
      insights.push(`Great retention! Your repeat rate is ${Math.round((vsIndustry - 1) * 100)}% above industry average`);
    }
  }

  return insights;
}
