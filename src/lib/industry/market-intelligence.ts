// Local Market Intelligence Framework
// Provides regional benchmarking and competitive insights

import type { IndustrySubtype, IndustryProfile } from "./profiles";

export interface LocalMarketData {
  region: string; // "Austin, TX" or "78704"
  industrySubtype: IndustrySubtype;

  // Pricing benchmarks from regional data
  pricingPercentile: number; // 0-100, where business falls
  averageLocalPrice: number; // cents
  priceRange: { low: number; median: number; high: number };

  // Business density
  competitorCount: number;
  marketSaturation: "low" | "moderate" | "high" | "saturated";

  // Local trends
  growthRate: number; // year over year for industry in region
  demandTrend: "growing" | "stable" | "declining";

  // Demographics that matter
  relevantPopulation: number;
  householdIncome: { median: number; percentile75: number };

  lastUpdated: Date;
}

export interface CompetitivePosition {
  pricePosition: "budget" | "value" | "mid-market" | "premium" | "luxury";
  pricePercentile: number; // 0-100
  priceVsMedian: number; // percentage difference from median

  reviewPosition?: {
    averageRating: number;
    reviewCount: number;
    ratingPercentile: number;
  };

  marketShareEstimate: "small" | "moderate" | "significant" | "leader";

  competitiveAdvantages: string[];
  competitiveWeaknesses: string[];

  recommendations: MarketRecommendation[];
}

export interface MarketRecommendation {
  type: "pricing" | "positioning" | "expansion" | "differentiation" | "marketing";
  title: string;
  description: string;
  rationale: string;
  potentialImpact: string;
  difficulty: "easy" | "medium" | "hard";
  timeframe: "immediate" | "short-term" | "long-term";
}

export interface RegionalBenchmark {
  metric: string;
  yourValue: number;
  regionalMedian: number;
  regionalAverage: number;
  percentile: number; // where you fall 0-100
  interpretation: string;
}

// Regional market data (simulated - in production would come from data providers)
// This provides a framework for how real data would be structured
const REGIONAL_BASELINES: Record<string, Partial<Record<IndustrySubtype, Partial<LocalMarketData>>>> = {
  // Example data for different regions
  "TX": {
    pet_grooming: {
      averageLocalPrice: 6500, // $65
      priceRange: { low: 3500, median: 6000, high: 12000 },
      competitorCount: 45,
      marketSaturation: "moderate",
      growthRate: 0.12,
      demandTrend: "growing",
    },
    hair_salon: {
      averageLocalPrice: 5500,
      priceRange: { low: 2500, median: 5000, high: 15000 },
      competitorCount: 120,
      marketSaturation: "high",
      growthRate: 0.05,
      demandTrend: "stable",
    },
    fast_casual: {
      averageLocalPrice: 1500,
      priceRange: { low: 800, median: 1400, high: 2500 },
      competitorCount: 200,
      marketSaturation: "saturated",
      growthRate: 0.08,
      demandTrend: "growing",
    },
    auto_repair: {
      averageLocalPrice: 8500,
      priceRange: { low: 5000, median: 8000, high: 15000 },
      competitorCount: 80,
      marketSaturation: "moderate",
      growthRate: 0.03,
      demandTrend: "stable",
    },
  },
  "CA": {
    pet_grooming: {
      averageLocalPrice: 8500,
      priceRange: { low: 5000, median: 8000, high: 15000 },
      competitorCount: 60,
      marketSaturation: "high",
      growthRate: 0.08,
      demandTrend: "stable",
    },
    hair_salon: {
      averageLocalPrice: 8000,
      priceRange: { low: 4000, median: 7500, high: 20000 },
      competitorCount: 150,
      marketSaturation: "saturated",
      growthRate: 0.03,
      demandTrend: "stable",
    },
    fast_casual: {
      averageLocalPrice: 1800,
      priceRange: { low: 1000, median: 1700, high: 3000 },
      competitorCount: 250,
      marketSaturation: "saturated",
      growthRate: 0.05,
      demandTrend: "stable",
    },
    auto_repair: {
      averageLocalPrice: 11000,
      priceRange: { low: 7000, median: 10000, high: 18000 },
      competitorCount: 100,
      marketSaturation: "high",
      growthRate: 0.02,
      demandTrend: "stable",
    },
  },
  // Default for unknown regions
  "DEFAULT": {
    pet_grooming: {
      averageLocalPrice: 5500,
      priceRange: { low: 3000, median: 5000, high: 10000 },
      competitorCount: 30,
      marketSaturation: "moderate",
      growthRate: 0.10,
      demandTrend: "growing",
    },
    hair_salon: {
      averageLocalPrice: 4500,
      priceRange: { low: 2000, median: 4000, high: 12000 },
      competitorCount: 80,
      marketSaturation: "moderate",
      growthRate: 0.04,
      demandTrend: "stable",
    },
    fast_casual: {
      averageLocalPrice: 1300,
      priceRange: { low: 700, median: 1200, high: 2200 },
      competitorCount: 150,
      marketSaturation: "high",
      growthRate: 0.06,
      demandTrend: "stable",
    },
    auto_repair: {
      averageLocalPrice: 7500,
      priceRange: { low: 4500, median: 7000, high: 12000 },
      competitorCount: 60,
      marketSaturation: "moderate",
      growthRate: 0.02,
      demandTrend: "stable",
    },
  },
};

// Get regional market data
export function getLocalMarketData(
  region: string, // Can be state abbreviation, zip, or city
  industrySubtype: IndustrySubtype
): LocalMarketData {
  // Extract state from region (simplified - would use geocoding in production)
  const stateMatch = region.match(/,\s*([A-Z]{2})/i) || region.match(/^([A-Z]{2})$/i);
  const state = stateMatch ? stateMatch[1].toUpperCase() : "DEFAULT";

  const baseline = REGIONAL_BASELINES[state]?.[industrySubtype]
    || REGIONAL_BASELINES["DEFAULT"]?.[industrySubtype]
    || REGIONAL_BASELINES["DEFAULT"]?.["pet_grooming"];

  return {
    region,
    industrySubtype,
    pricingPercentile: 50, // Will be calculated based on actual business data
    averageLocalPrice: baseline?.averageLocalPrice || 5000,
    priceRange: baseline?.priceRange || { low: 3000, median: 5000, high: 10000 },
    competitorCount: baseline?.competitorCount || 50,
    marketSaturation: baseline?.marketSaturation || "moderate",
    growthRate: baseline?.growthRate || 0.05,
    demandTrend: baseline?.demandTrend || "stable",
    relevantPopulation: 50000, // Would come from census data
    householdIncome: { median: 65000, percentile75: 95000 },
    lastUpdated: new Date(),
  };
}

// Calculate where a price falls in the regional distribution
export function calculatePricePercentile(
  price: number, // cents
  marketData: LocalMarketData
): number {
  const { low, median, high } = marketData.priceRange;

  if (price <= low) return 10;
  if (price >= high) return 95;

  // Simple interpolation
  if (price <= median) {
    // Between low and median (percentile 10-50)
    return 10 + ((price - low) / (median - low)) * 40;
  } else {
    // Between median and high (percentile 50-95)
    return 50 + ((price - median) / (high - median)) * 45;
  }
}

// Analyze competitive position
export function analyzeCompetitivePosition(
  businessMetrics: {
    averageTicket: number; // cents
    monthlyRevenue: number; // cents
    customerCount: number;
    averageRating?: number;
    reviewCount?: number;
  },
  marketData: LocalMarketData,
  _industryProfile: IndustryProfile
): CompetitivePosition {
  // Calculate price percentile
  const pricePercentile = calculatePricePercentile(
    businessMetrics.averageTicket,
    marketData
  );

  // Determine price position
  let pricePosition: CompetitivePosition["pricePosition"];
  if (pricePercentile <= 20) pricePosition = "budget";
  else if (pricePercentile <= 40) pricePosition = "value";
  else if (pricePercentile <= 60) pricePosition = "mid-market";
  else if (pricePercentile <= 85) pricePosition = "premium";
  else pricePosition = "luxury";

  // Price vs median
  const priceVsMedian = Math.round(
    ((businessMetrics.averageTicket - marketData.priceRange.median) / marketData.priceRange.median) * 100
  );

  // Review position if available
  let reviewPosition: CompetitivePosition["reviewPosition"];
  if (businessMetrics.averageRating !== undefined) {
    // Percentile based on rating (4.5+ is top 20%, 4.0-4.5 is top 40%, etc.)
    let ratingPercentile: number;
    if (businessMetrics.averageRating >= 4.7) ratingPercentile = 90;
    else if (businessMetrics.averageRating >= 4.5) ratingPercentile = 80;
    else if (businessMetrics.averageRating >= 4.2) ratingPercentile = 60;
    else if (businessMetrics.averageRating >= 4.0) ratingPercentile = 40;
    else if (businessMetrics.averageRating >= 3.5) ratingPercentile = 20;
    else ratingPercentile = 10;

    reviewPosition = {
      averageRating: businessMetrics.averageRating,
      reviewCount: businessMetrics.reviewCount || 0,
      ratingPercentile,
    };
  }

  // Estimate market share
  const avgRevenuePerBusiness = marketData.averageLocalPrice * 200; // rough monthly estimate
  const totalMarketSize = avgRevenuePerBusiness * marketData.competitorCount;
  const sharePercent = (businessMetrics.monthlyRevenue / totalMarketSize) * 100;

  let marketShareEstimate: CompetitivePosition["marketShareEstimate"];
  if (sharePercent >= 10) marketShareEstimate = "leader";
  else if (sharePercent >= 5) marketShareEstimate = "significant";
  else if (sharePercent >= 2) marketShareEstimate = "moderate";
  else marketShareEstimate = "small";

  // Identify advantages and weaknesses
  const advantages: string[] = [];
  const weaknesses: string[] = [];

  if (pricePercentile <= 30) {
    advantages.push("Competitive pricing attracts price-conscious customers");
  } else if (pricePercentile >= 70) {
    advantages.push("Premium positioning allows higher margins");
  }

  if (reviewPosition && reviewPosition.ratingPercentile >= 70) {
    advantages.push(`Strong reputation (${reviewPosition.averageRating} stars)`);
  }

  if (marketData.marketSaturation === "saturated" && marketShareEstimate === "small") {
    weaknesses.push("Small presence in competitive market");
  }

  if (pricePercentile >= 80 && reviewPosition && reviewPosition.ratingPercentile < 50) {
    weaknesses.push("High prices without matching reputation");
  }

  // Generate recommendations
  const recommendations = generateMarketRecommendations(
    pricePosition,
    pricePercentile,
    marketData,
    businessMetrics,
    reviewPosition
  );

  return {
    pricePosition,
    pricePercentile: Math.round(pricePercentile),
    priceVsMedian,
    reviewPosition,
    marketShareEstimate,
    competitiveAdvantages: advantages,
    competitiveWeaknesses: weaknesses,
    recommendations,
  };
}

// Generate market-based recommendations
function generateMarketRecommendations(
  pricePosition: CompetitivePosition["pricePosition"],
  pricePercentile: number,
  marketData: LocalMarketData,
  businessMetrics: { averageTicket: number; monthlyRevenue: number },
  reviewPosition?: CompetitivePosition["reviewPosition"]
): MarketRecommendation[] {
  const recommendations: MarketRecommendation[] = [];

  // Pricing recommendations
  if (pricePercentile < 30 && marketData.demandTrend === "growing") {
    recommendations.push({
      type: "pricing",
      title: "Consider Price Increase",
      description: `Your pricing is in the bottom 30% for your area, while demand is growing. A modest price increase could boost revenue.`,
      rationale: `Market demand is ${marketData.growthRate > 0 ? "up " + Math.round(marketData.growthRate * 100) + "%" : "stable"}, allowing room for price adjustment`,
      potentialImpact: "5-10% revenue increase with minimal volume impact",
      difficulty: "easy",
      timeframe: "immediate",
    });
  }

  if (pricePercentile > 75 && (!reviewPosition || reviewPosition.ratingPercentile < 60)) {
    recommendations.push({
      type: "differentiation",
      title: "Justify Premium Position",
      description: "Your pricing is premium but reviews don't yet reflect premium quality. Focus on service improvements.",
      rationale: "Premium pricing requires matching customer perception",
      potentialImpact: "Improved retention and word-of-mouth",
      difficulty: "medium",
      timeframe: "short-term",
    });
  }

  // Market saturation recommendations
  if (marketData.marketSaturation === "saturated") {
    recommendations.push({
      type: "differentiation",
      title: "Find Your Niche",
      description: "The market is saturated. Consider specializing in a specific customer segment or service type.",
      rationale: `${marketData.competitorCount} competitors means differentiation is crucial`,
      potentialImpact: "Could increase customer loyalty by 25-40%",
      difficulty: "medium",
      timeframe: "short-term",
    });
  }

  // Growth market recommendations
  if (marketData.demandTrend === "growing" && marketData.marketSaturation !== "saturated") {
    recommendations.push({
      type: "expansion",
      title: "Capture Growing Demand",
      description: "Market demand is growing with moderate competition. Consider expanding capacity.",
      rationale: `${Math.round(marketData.growthRate * 100)}% market growth with room for new entrants`,
      potentialImpact: "Could capture 15-25% of new market demand",
      difficulty: "medium",
      timeframe: "long-term",
    });
  }

  // Review-based recommendations
  if (reviewPosition && reviewPosition.reviewCount < 50) {
    recommendations.push({
      type: "marketing",
      title: "Build Review Volume",
      description: "More reviews build trust with new customers. Implement a review collection system.",
      rationale: "Businesses with 50+ reviews see significantly higher conversion rates",
      potentialImpact: "Could increase new customer acquisition by 15-20%",
      difficulty: "easy",
      timeframe: "short-term",
    });
  }

  return recommendations;
}

// Create regional benchmarks
export function createRegionalBenchmarks(
  businessMetrics: {
    averageTicket: number;
    monthlyRevenue: number;
    customerCount: number;
    repeatRate: number;
  },
  marketData: LocalMarketData,
  industryProfile: IndustryProfile
): RegionalBenchmark[] {
  const benchmarks: RegionalBenchmark[] = [];

  // Pricing benchmark
  const pricePercentile = calculatePricePercentile(businessMetrics.averageTicket, marketData);
  benchmarks.push({
    metric: "Average Service Price",
    yourValue: businessMetrics.averageTicket,
    regionalMedian: marketData.priceRange.median,
    regionalAverage: marketData.averageLocalPrice,
    percentile: Math.round(pricePercentile),
    interpretation: pricePercentile >= 50
      ? `Your pricing is in the top ${100 - Math.round(pricePercentile)}% for your area`
      : `Your pricing is more affordable than ${Math.round(pricePercentile)}% of competitors`,
  });

  // Customer volume benchmark
  // Estimate typical customer count based on market size
  const estimatedAvgCustomers = Math.round(
    (marketData.relevantPopulation * 0.02) / marketData.competitorCount // 2% of population are customers, distributed
  );
  const customerPercentile = Math.min(95, Math.max(5,
    50 + (businessMetrics.customerCount - estimatedAvgCustomers) / estimatedAvgCustomers * 50
  ));

  benchmarks.push({
    metric: "Customer Base Size",
    yourValue: businessMetrics.customerCount,
    regionalMedian: estimatedAvgCustomers,
    regionalAverage: estimatedAvgCustomers,
    percentile: Math.round(customerPercentile),
    interpretation: customerPercentile >= 50
      ? `You serve more customers than ${Math.round(customerPercentile)}% of similar businesses`
      : `Growing your customer base could unlock significant revenue`,
  });

  // Repeat rate benchmark
  const repeatPercentile = Math.min(95,
    (businessMetrics.repeatRate / industryProfile.repeatCustomerRate) * 50
  );

  benchmarks.push({
    metric: "Customer Retention",
    yourValue: Math.round(businessMetrics.repeatRate * 100),
    regionalMedian: Math.round(industryProfile.repeatCustomerRate * 100),
    regionalAverage: Math.round(industryProfile.repeatCustomerRate * 100),
    percentile: Math.round(repeatPercentile),
    interpretation: repeatPercentile >= 50
      ? `Your retention is stronger than ${Math.round(repeatPercentile)}% of industry peers`
      : `Improving retention could significantly boost lifetime value`,
  });

  return benchmarks;
}

// Get market intelligence summary for AI
export function getMarketIntelligenceSummary(
  position: CompetitivePosition,
  marketData: LocalMarketData,
  benchmarks: RegionalBenchmark[]
): string {
  const lines: string[] = [];

  lines.push(`## Local Market Intelligence for ${marketData.region}`);
  lines.push("");

  // Position summary
  lines.push(`**Competitive Position:** ${position.pricePosition} (top ${100 - position.pricePercentile}% on pricing)`);
  lines.push(`**Market:** ${marketData.competitorCount} competitors, ${marketData.marketSaturation} saturation`);
  lines.push(`**Trend:** Demand is ${marketData.demandTrend} (${marketData.growthRate > 0 ? "+" : ""}${Math.round(marketData.growthRate * 100)}% YoY)`);
  lines.push("");

  // Benchmarks
  lines.push("**Regional Benchmarks:**");
  benchmarks.forEach((b) => {
    lines.push(`- ${b.metric}: ${b.interpretation}`);
  });
  lines.push("");

  // Advantages
  if (position.competitiveAdvantages.length > 0) {
    lines.push("**Strengths:**");
    position.competitiveAdvantages.forEach((a) => lines.push(`- ${a}`));
  }

  // Weaknesses
  if (position.competitiveWeaknesses.length > 0) {
    lines.push("**Areas to Watch:**");
    position.competitiveWeaknesses.forEach((w) => lines.push(`- ${w}`));
  }

  return lines.join("\n");
}
