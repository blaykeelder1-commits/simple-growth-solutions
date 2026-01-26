// Cross-System Insights Library
// Correlates data across multiple integrations for holistic insights
// Uses "could" language for legal compliance

import { getDisclaimer, getConfidenceInfo } from "@/lib/legal/disclaimers";

export interface CrossSystemData {
  // Cash Flow AI data
  cashFlow?: {
    monthlyRevenue: number;
    overdueReceivables: number;
    healthScore: number;
    avgDaysToPayment: number;
  };
  // POS data (Square, Clover, Toast)
  pos?: {
    dailySales: number;
    transactionCount: number;
    avgTicket: number;
    growthRate: number;
  };
  // Payroll data
  payroll?: {
    totalPayroll: number;
    employeeCount: number;
    overtimeHours: number;
    payrollGrowth: number;
  };
  // Review data (Google, Yelp)
  reviews?: {
    avgRating: number;
    reviewCount: number;
    recentTrend: "improving" | "stable" | "declining";
  };
  // Employee performance (if available)
  employees?: {
    id: string;
    name: string;
    performanceScore: number;
    department: string;
  }[];
}

export interface CrossSystemInsight {
  id: string;
  title: string;
  description: string;
  category: "revenue" | "operations" | "staffing" | "customer" | "cash_flow";
  dataSources: string[];
  priority: "low" | "medium" | "high";
  confidence: number;
  actionItems: string[];
  disclaimer: string;
}

// Generate insights by correlating data across systems
export function generateCrossSystemInsights(
  data: CrossSystemData
): CrossSystemInsight[] {
  const insights: CrossSystemInsight[] = [];
  let insightId = 0;

  // Insight: Sales up but payroll flat - profit opportunity
  if (data.pos && data.payroll) {
    const salesGrowth = data.pos.growthRate;
    const payrollGrowth = data.payroll.payrollGrowth;

    if (salesGrowth > 0.15 && payrollGrowth < 0.05) {
      insights.push({
        id: `cross-${insightId++}`,
        title: "Sales Growth Outpacing Payroll",
        description: `Your sales appear to have grown approximately ${Math.round(salesGrowth * 100)}% while payroll has remained relatively flat. This could indicate an opportunity to explore profit-sharing or reinvestment options.`,
        category: "revenue",
        dataSources: ["POS", "Payroll"],
        priority: "medium",
        confidence: 0.72,
        actionItems: [
          "You could consider reviewing profit margins",
          "Optionally explore employee incentive programs",
          "Consider consulting with a financial advisor about reinvestment",
        ],
        disclaimer: getDisclaimer("insight", "short"),
      });
    }
  }

  // Insight: Cash flow dips align with payroll cycle
  if (data.cashFlow && data.payroll) {
    // Simplified correlation check
    if (data.cashFlow.healthScore < 70 && data.payroll.totalPayroll > 0) {
      insights.push({
        id: `cross-${insightId++}`,
        title: "Cash Flow Pattern Observation",
        description: `Your cash flow health score of ${data.cashFlow.healthScore} could be affected by payroll timing. You might consider reviewing the relationship between payment collections and payroll dates.`,
        category: "cash_flow",
        dataSources: ["Cash Flow AI", "Payroll"],
        priority: "medium",
        confidence: 0.65,
        actionItems: [
          "Consider reviewing payment collection timing",
          "You could explore adjusting invoice due dates",
          "Optionally discuss cash flow timing with a financial advisor",
        ],
        disclaimer: getDisclaimer("insight", "short"),
      });
    }
  }

  // Insight: High overtime correlating with revenue
  if (data.pos && data.payroll && data.payroll.overtimeHours > 40) {
    // Revenue per OT hour could be used for more detailed analysis
    // const revenuePerOTHour = (data.pos.dailySales * 30) / data.payroll.overtimeHours;

    insights.push({
      id: `cross-${insightId++}`,
      title: "Overtime Capacity Analysis",
      description: `Your team logged approximately ${data.payroll.overtimeHours} overtime hours. You might want to analyze whether this overtime is generating proportional revenue or if additional hiring could be more cost-effective.`,
      category: "staffing",
      dataSources: ["POS", "Payroll"],
      priority: data.payroll.overtimeHours > 80 ? "high" : "medium",
      confidence: 0.68,
      actionItems: [
        "Consider tracking which shifts generate the most overtime",
        "You could analyze revenue per labor hour",
        "Optionally consult with HR about staffing options",
      ],
      disclaimer: getDisclaimer("insight", "short"),
    });
  }

  // Insight: Review trends and sales correlation
  if (data.reviews && data.pos) {
    if (data.reviews.recentTrend === "improving" && data.pos.growthRate > 0.1) {
      insights.push({
        id: `cross-${insightId++}`,
        title: "Positive Momentum Observed",
        description: `Your reviews appear to be trending upward while sales have grown approximately ${Math.round(data.pos.growthRate * 100)}%. This positive correlation could indicate customer satisfaction driving business growth.`,
        category: "customer",
        dataSources: ["Reviews", "POS"],
        priority: "low",
        confidence: 0.7,
        actionItems: [
          "Consider maintaining current service quality practices",
          "You could encourage satisfied customers to leave reviews",
          "Optionally document what's working well for your team",
        ],
        disclaimer: getDisclaimer("insight", "short"),
      });
    } else if (
      data.reviews.recentTrend === "declining" &&
      data.pos.growthRate < 0
    ) {
      insights.push({
        id: `cross-${insightId++}`,
        title: "Customer Experience Attention Area",
        description: `Your review trend appears to be declining alongside sales. You might want to investigate potential service or product quality issues.`,
        category: "customer",
        dataSources: ["Reviews", "POS"],
        priority: "high",
        confidence: 0.75,
        actionItems: [
          "Consider reviewing recent negative feedback",
          "You could survey regular customers for feedback",
          "Optionally audit service delivery processes",
        ],
        disclaimer: getDisclaimer("insight", "short"),
      });
    }
  }

  // Insight: Employee performance and review correlation
  if (data.reviews && data.employees && data.employees.length > 0) {
    const highPerformers = data.employees.filter(
      (e) => e.performanceScore >= 80
    );

    if (highPerformers.length > 0 && data.reviews.avgRating >= 4.5) {
      insights.push({
        id: `cross-${insightId++}`,
        title: "High-Performer Impact Analysis",
        description: `Your ${highPerformers.length} high-performing team members could be contributing to your strong ${data.reviews.avgRating.toFixed(1)}-star average rating. You might consider documenting their practices for training purposes.`,
        category: "staffing",
        dataSources: ["Reviews", "Payroll", "Performance"],
        priority: "low",
        confidence: 0.6,
        actionItems: [
          "Consider identifying what makes top performers effective",
          "You could create training materials based on best practices",
          "Optionally recognize and reward top performers",
        ],
        disclaimer: getDisclaimer("insight", "short"),
      });
    }
  }

  // Insight: Receivables and revenue comparison
  if (data.cashFlow && data.pos) {
    const receivablesRatio =
      data.cashFlow.overdueReceivables / (data.pos.dailySales * 30);

    if (receivablesRatio > 0.3) {
      insights.push({
        id: `cross-${insightId++}`,
        title: "Receivables to Revenue Ratio",
        description: `Your overdue receivables represent approximately ${Math.round(receivablesRatio * 100)}% of monthly sales. This could affect cash flow. You might want to review collection processes.`,
        category: "cash_flow",
        dataSources: ["Cash Flow AI", "POS"],
        priority: receivablesRatio > 0.5 ? "high" : "medium",
        confidence: 0.78,
        actionItems: [
          "Consider reviewing overdue invoice follow-up processes",
          "You could adjust payment terms for new clients",
          "Optionally consult with a collections specialist",
        ],
        disclaimer: getDisclaimer("insight", "short"),
      });
    }
  }

  // Insight: Payroll as percentage of revenue
  if (data.pos && data.payroll) {
    const payrollRatio = data.payroll.totalPayroll / (data.pos.dailySales * 30);

    if (payrollRatio > 0.4) {
      insights.push({
        id: `cross-${insightId++}`,
        title: "Labor Cost Observation",
        description: `Your payroll appears to be approximately ${Math.round(payrollRatio * 100)}% of revenue. You might want to compare this to industry benchmarks for your sector.`,
        category: "operations",
        dataSources: ["POS", "Payroll"],
        priority: payrollRatio > 0.5 ? "high" : "medium",
        confidence: 0.7,
        actionItems: [
          "Consider reviewing scheduling efficiency",
          "You could analyze revenue per labor hour by shift",
          "Optionally consult industry benchmarks for your region",
        ],
        disclaimer: getDisclaimer("insight", "short"),
      });
    } else if (payrollRatio < 0.2) {
      insights.push({
        id: `cross-${insightId++}`,
        title: "Staffing Capacity Observation",
        description: `Your payroll is approximately ${Math.round(payrollRatio * 100)}% of revenue, which could be below typical for many businesses. This might indicate capacity for strategic hiring.`,
        category: "staffing",
        dataSources: ["POS", "Payroll"],
        priority: "low",
        confidence: 0.65,
        actionItems: [
          "Consider whether current staff can maintain quality",
          "You could assess if hiring would support growth",
          "Optionally review customer wait times and service quality",
        ],
        disclaimer: getDisclaimer("insight", "short"),
      });
    }
  }

  return insights;
}

// Group insights by category
export function groupInsightsByCategory(
  insights: CrossSystemInsight[]
): Record<string, CrossSystemInsight[]> {
  return insights.reduce(
    (acc, insight) => {
      if (!acc[insight.category]) {
        acc[insight.category] = [];
      }
      acc[insight.category].push(insight);
      return acc;
    },
    {} as Record<string, CrossSystemInsight[]>
  );
}

// Get insight priority breakdown
export function getInsightPrioritySummary(
  insights: CrossSystemInsight[]
): { high: number; medium: number; low: number } {
  return insights.reduce(
    (acc, insight) => {
      acc[insight.priority]++;
      return acc;
    },
    { high: 0, medium: 0, low: 0 }
  );
}

// Sort insights by priority and confidence
export function sortInsightsByPriority(
  insights: CrossSystemInsight[]
): CrossSystemInsight[] {
  const priorityOrder = { high: 3, medium: 2, low: 1 };

  return [...insights].sort((a, b) => {
    const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
    if (priorityDiff !== 0) return priorityDiff;
    return b.confidence - a.confidence;
  });
}

export { getConfidenceInfo };
