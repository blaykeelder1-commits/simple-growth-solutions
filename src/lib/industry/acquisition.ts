// Customer Acquisition Tracking System
// Tracks where customers come from and analyzes channel effectiveness

import type { AcquisitionChannel, IndustryProfile } from "./profiles";

export interface CustomerAcquisition {
  customerId: string;
  customerName: string;
  firstVisitDate: Date;
  acquisitionChannel: AcquisitionChannel;
  acquisitionSource?: string; // Specific detail (e.g., "Google Ads - Summer Promo")
  referredBy?: string; // Customer ID if referral
  firstOrderValue: number; // cents
  lifetimeValue: number; // cents
  totalVisits: number;
  isActive: boolean; // Visited in last 90 days
}

export interface ChannelPerformance {
  channel: AcquisitionChannel;
  displayName: string;

  // Volume metrics
  totalCustomers: number;
  newCustomersThisMonth: number;
  newCustomersLastMonth: number;
  growthRate: number; // month over month

  // Value metrics
  totalRevenue: number; // cents
  averageFirstOrder: number;
  averageLifetimeValue: number;

  // Quality metrics
  repeatRate: number; // 0-1, customers who returned
  averageVisitsPerCustomer: number;
  activeCustomerRate: number; // 0-1, still active

  // Cost metrics (if known)
  acquisitionCost?: number; // cost per customer
  roi?: number; // return on acquisition spend

  // Comparison to industry
  performanceVsIndustry?: "above" | "average" | "below";
}

export interface AcquisitionAnalysis {
  summary: {
    totalCustomers: number;
    totalNewThisMonth: number;
    topChannel: AcquisitionChannel;
    topChannelPercentage: number;
    averageLifetimeValue: number;
    overallRepeatRate: number;
  };

  byChannel: ChannelPerformance[];

  trends: {
    fastestGrowingChannel: AcquisitionChannel;
    decliningChannels: AcquisitionChannel[];
    emergingOpportunities: string[];
  };

  recommendations: {
    title: string;
    description: string;
    potentialImpact: string;
    difficulty: "easy" | "medium" | "hard";
    channel?: AcquisitionChannel;
  }[];
}

// Channel display names
export const CHANNEL_DISPLAY_NAMES: Record<AcquisitionChannel, string> = {
  walk_in: "Walk-In",
  online_booking: "Online Booking",
  phone_call: "Phone Call",
  referral: "Customer Referral",
  social_media: "Social Media",
  google_search: "Google Search",
  google_maps: "Google Maps",
  yelp: "Yelp",
  facebook: "Facebook",
  instagram: "Instagram",
  tiktok: "TikTok",
  email_marketing: "Email Marketing",
  direct_mail: "Direct Mail",
  local_event: "Local Event",
  partnership: "Partnership",
  repeat_customer: "Repeat Customer",
  gift_card: "Gift Card",
  groupon_deal: "Groupon/Deal Site",
  loyalty_program: "Loyalty Program",
  influencer_collab: "Influencer Collaboration",
  doordash_ubereats: "DoorDash/Uber Eats",
  nextdoor: "Nextdoor",
  online_ordering: "Online Ordering",
  text_marketing: "Text/SMS Marketing",
};

// Analyze customer acquisition data
export function analyzeAcquisition(
  customers: CustomerAcquisition[],
  industryProfile?: IndustryProfile
): AcquisitionAnalysis {
  const now = new Date();
  const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  // Group by channel
  const byChannel = new Map<AcquisitionChannel, CustomerAcquisition[]>();

  customers.forEach((customer) => {
    const channel = customer.acquisitionChannel;
    if (!byChannel.has(channel)) {
      byChannel.set(channel, []);
    }
    byChannel.get(channel)!.push(customer);
  });

  // Calculate channel performance
  const channelPerformance: ChannelPerformance[] = [];

  byChannel.forEach((channelCustomers, channel) => {
    const newThisMonth = channelCustomers.filter(
      (c) => c.firstVisitDate >= thisMonth
    ).length;

    const newLastMonth = channelCustomers.filter(
      (c) => c.firstVisitDate >= lastMonth && c.firstVisitDate < thisMonth
    ).length;

    const growthRate = newLastMonth > 0
      ? (newThisMonth - newLastMonth) / newLastMonth
      : newThisMonth > 0 ? 1 : 0;

    const totalRevenue = channelCustomers.reduce(
      (sum, c) => sum + c.lifetimeValue, 0
    );

    const avgFirstOrder = channelCustomers.length > 0
      ? channelCustomers.reduce((sum, c) => sum + c.firstOrderValue, 0) / channelCustomers.length
      : 0;

    const avgLTV = channelCustomers.length > 0
      ? totalRevenue / channelCustomers.length
      : 0;

    const repeatCustomers = channelCustomers.filter((c) => c.totalVisits > 1).length;
    const repeatRate = channelCustomers.length > 0
      ? repeatCustomers / channelCustomers.length
      : 0;

    const avgVisits = channelCustomers.length > 0
      ? channelCustomers.reduce((sum, c) => sum + c.totalVisits, 0) / channelCustomers.length
      : 0;

    const activeCustomers = channelCustomers.filter((c) => c.isActive).length;
    const activeRate = channelCustomers.length > 0
      ? activeCustomers / channelCustomers.length
      : 0;

    // Compare to industry if profile provided
    let performanceVsIndustry: "above" | "average" | "below" | undefined;
    if (industryProfile) {
      const isPrimary = industryProfile.primaryChannels.includes(channel);
      const isSecondary = industryProfile.secondaryChannels.includes(channel);

      // If it's a primary channel with good repeat rate, it's performing
      if (isPrimary && repeatRate > industryProfile.repeatCustomerRate) {
        performanceVsIndustry = "above";
      } else if (isPrimary && repeatRate < industryProfile.repeatCustomerRate * 0.8) {
        performanceVsIndustry = "below";
      } else if (isSecondary && channelCustomers.length > customers.length * 0.1) {
        performanceVsIndustry = "above"; // Secondary channel doing well
      } else {
        performanceVsIndustry = "average";
      }
    }

    channelPerformance.push({
      channel,
      displayName: CHANNEL_DISPLAY_NAMES[channel],
      totalCustomers: channelCustomers.length,
      newCustomersThisMonth: newThisMonth,
      newCustomersLastMonth: newLastMonth,
      growthRate,
      totalRevenue,
      averageFirstOrder: Math.round(avgFirstOrder),
      averageLifetimeValue: Math.round(avgLTV),
      repeatRate,
      averageVisitsPerCustomer: Math.round(avgVisits * 10) / 10,
      activeCustomerRate: activeRate,
      performanceVsIndustry,
    });
  });

  // Sort by total customers
  channelPerformance.sort((a, b) => b.totalCustomers - a.totalCustomers);

  // Calculate summary
  const totalCustomers = customers.length;
  const totalNewThisMonth = customers.filter(
    (c) => c.firstVisitDate >= thisMonth
  ).length;

  const topChannelData = channelPerformance[0];
  const topChannel = topChannelData?.channel || "walk_in";
  const topChannelPercentage = topChannelData && totalCustomers > 0
    ? topChannelData.totalCustomers / totalCustomers
    : 0;

  const avgLTV = totalCustomers > 0
    ? customers.reduce((sum, c) => sum + c.lifetimeValue, 0) / totalCustomers
    : 0;

  const repeatCustomers = customers.filter((c) => c.totalVisits > 1).length;
  const overallRepeatRate = totalCustomers > 0
    ? repeatCustomers / totalCustomers
    : 0;

  // Identify trends
  const growingChannels = channelPerformance
    .filter((c) => c.growthRate > 0.1)
    .sort((a, b) => b.growthRate - a.growthRate);

  const decliningChannels = channelPerformance
    .filter((c) => c.growthRate < -0.1 && c.totalCustomers >= 5)
    .map((c) => c.channel);

  // Generate recommendations
  const recommendations = generateAcquisitionRecommendations(
    channelPerformance,
    industryProfile
  );

  // Identify emerging opportunities
  const emergingOpportunities: string[] = [];

  if (industryProfile) {
    // Check if using emerging channels from industry profile
    industryProfile.emergingChannels.forEach((channel) => {
      const perf = channelPerformance.find((p) => p.channel === channel);
      if (!perf || perf.totalCustomers < 5) {
        emergingOpportunities.push(
          `Consider ${CHANNEL_DISPLAY_NAMES[channel]} - trending for your industry`
        );
      }
    });
  }

  return {
    summary: {
      totalCustomers,
      totalNewThisMonth,
      topChannel,
      topChannelPercentage,
      averageLifetimeValue: Math.round(avgLTV),
      overallRepeatRate,
    },
    byChannel: channelPerformance,
    trends: {
      fastestGrowingChannel: growingChannels[0]?.channel || topChannel,
      decliningChannels,
      emergingOpportunities,
    },
    recommendations,
  };
}

// Generate acquisition recommendations based on data
function generateAcquisitionRecommendations(
  performance: ChannelPerformance[],
  industryProfile?: IndustryProfile
): AcquisitionAnalysis["recommendations"] {
  const recommendations: AcquisitionAnalysis["recommendations"] = [];

  // Check for over-reliance on single channel
  const topChannel = performance[0];
  if (topChannel && performance.length > 1) {
    const topPercent = topChannel.totalCustomers /
      performance.reduce((sum, p) => sum + p.totalCustomers, 0);

    if (topPercent > 0.5) {
      recommendations.push({
        title: "Diversify Customer Acquisition",
        description: `${Math.round(topPercent * 100)}% of customers come from ${topChannel.displayName}. Diversifying could reduce risk and unlock growth.`,
        potentialImpact: "Could reduce dependency and potentially increase customer base by 15-25%",
        difficulty: "medium",
      });
    }
  }

  // Check for high-value but underutilized channels
  performance.forEach((channel) => {
    if (
      channel.averageLifetimeValue > topChannel?.averageLifetimeValue * 1.2 &&
      channel.totalCustomers < topChannel?.totalCustomers * 0.2
    ) {
      recommendations.push({
        title: `Invest More in ${channel.displayName}`,
        description: `${channel.displayName} customers have ${Math.round((channel.averageLifetimeValue / topChannel.averageLifetimeValue - 1) * 100)}% higher lifetime value. Increasing focus here could boost revenue.`,
        potentialImpact: "Could increase average customer value significantly",
        difficulty: "medium",
        channel: channel.channel,
      });
    }
  });

  // Check for declining channels
  const decliningHighValue = performance.filter(
    (p) => p.growthRate < -0.15 && p.averageLifetimeValue > 5000
  );

  decliningHighValue.forEach((channel) => {
    recommendations.push({
      title: `Address ${channel.displayName} Decline`,
      description: `${channel.displayName} is declining but brings valuable customers ($${(channel.averageLifetimeValue / 100).toFixed(0)} avg LTV). Worth investigating why.`,
      potentialImpact: "Could recover 10-20% of customer acquisition",
      difficulty: "medium",
      channel: channel.channel,
    });
  });

  // Referral program opportunity
  const referralChannel = performance.find((p) => p.channel === "referral");
  if (!referralChannel || referralChannel.totalCustomers < 10) {
    recommendations.push({
      title: "Launch Referral Program",
      description: "Referrals typically have 25% higher retention. A structured program could significantly boost this channel.",
      potentialImpact: "Could increase new customers by 20-30% with minimal cost",
      difficulty: "easy",
      channel: "referral",
    });
  } else if (referralChannel.repeatRate > 0.7) {
    recommendations.push({
      title: "Double Down on Referrals",
      description: `Your referral customers have ${Math.round(referralChannel.repeatRate * 100)}% repeat rate. Incentivizing more referrals could accelerate growth.`,
      potentialImpact: "Could increase high-quality customer acquisition by 25-40%",
      difficulty: "easy",
      channel: "referral",
    });
  }

  // Online booking opportunity
  const onlineBooking = performance.find((p) => p.channel === "online_booking");
  const phoneCall = performance.find((p) => p.channel === "phone_call");

  if (phoneCall && (!onlineBooking || onlineBooking.totalCustomers < phoneCall.totalCustomers * 0.5)) {
    recommendations.push({
      title: "Enable/Promote Online Booking",
      description: "Many phone customers could self-book online, freeing up staff time and reducing missed calls.",
      potentialImpact: "Could convert 30-50% of phone bookings and reduce no-shows",
      difficulty: "easy",
      channel: "online_booking",
    });
  }

  // Industry-specific recommendations
  if (industryProfile) {
    industryProfile.primaryChannels.forEach((channel) => {
      const channelPerf = performance.find((p) => p.channel === channel);
      if (!channelPerf || channelPerf.totalCustomers < 5) {
        recommendations.push({
          title: `Develop ${CHANNEL_DISPLAY_NAMES[channel]} Strategy`,
          description: `${CHANNEL_DISPLAY_NAMES[channel]} is typically a top channel for ${industryProfile.displayName} businesses.`,
          potentialImpact: "Could unlock significant customer growth",
          difficulty: "medium",
          channel,
        });
      }
    });
  }

  return recommendations.slice(0, 5); // Top 5 recommendations
}

// Calculate customer acquisition cost by channel
export function calculateCAC(
  channelSpend: Map<AcquisitionChannel, number>, // Marketing spend by channel
  customers: CustomerAcquisition[],
  startDate: Date,
  endDate: Date
): Map<AcquisitionChannel, { cac: number; customers: number; ltv: number; ltvToCac: number }> {
  const results = new Map();

  channelSpend.forEach((spend, channel) => {
    const channelCustomers = customers.filter(
      (c) =>
        c.acquisitionChannel === channel &&
        c.firstVisitDate >= startDate &&
        c.firstVisitDate <= endDate
    );

    const customerCount = channelCustomers.length;
    const cac = customerCount > 0 ? Math.round(spend / customerCount) : 0;
    const avgLtv = customerCount > 0
      ? Math.round(
          channelCustomers.reduce((sum, c) => sum + c.lifetimeValue, 0) / customerCount
        )
      : 0;
    const ltvToCac = cac > 0 ? Math.round((avgLtv / cac) * 10) / 10 : 0;

    results.set(channel, {
      cac,
      customers: customerCount,
      ltv: avgLtv,
      ltvToCac,
    });
  });

  return results;
}

// Project revenue impact of improving a channel
export function projectChannelImprovement(
  currentPerformance: ChannelPerformance,
  improvementPercent: number, // e.g., 0.2 for 20% more customers
  months: number = 12
): {
  additionalCustomers: number;
  additionalRevenue: number;
  projectedImpact: string;
} {
  const currentMonthlyNew = currentPerformance.newCustomersThisMonth || 1;
  const additionalMonthly = Math.round(currentMonthlyNew * improvementPercent);
  const additionalCustomers = additionalMonthly * months;
  const additionalRevenue = additionalCustomers * currentPerformance.averageLifetimeValue;

  const projectedImpact = additionalRevenue > 100000
    ? `could add approximately $${Math.round(additionalRevenue / 100).toLocaleString()} over ${months} months`
    : `could bring ${additionalCustomers} additional customers over ${months} months`;

  return {
    additionalCustomers,
    additionalRevenue,
    projectedImpact,
  };
}
