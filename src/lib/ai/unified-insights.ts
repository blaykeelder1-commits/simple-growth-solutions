// Unified AI Analysis
// Combines data from all integrations for holistic business insights
// "Ultimate sidekick" recommendations using "could" language

import { GoogleGenerativeAI } from "@google/generative-ai";
import { getDisclaimer, getConfidenceInfo } from "@/lib/legal/disclaimers";
import {
  type CrossSystemData,
  type CrossSystemInsight,
  generateCrossSystemInsights,
} from "@/lib/insights/cross-system";

export interface UnifiedBusinessProfile {
  // Core metrics
  monthlyRevenue: number;
  monthlyExpenses: number;
  employeeCount: number;
  industry: string;

  // Health indicators
  cashFlowHealth: number; // 0-100
  customerSatisfaction: number; // 0-5 stars
  operationalEfficiency: number; // 0-100

  // Growth indicators
  revenueGrowth: number; // percentage
  customerGrowth: number; // percentage

  // Risk indicators
  overdueReceivables: number;
  staffingStrain: number; // overtime ratio
}

export interface UnifiedInsight {
  id: string;
  category: "growth" | "efficiency" | "risk" | "opportunity" | "health";
  title: string;
  description: string;
  impact: "high" | "medium" | "low";
  actionItems: string[];
  dataSources: string[];
  confidence: number;
  timeframe: "immediate" | "short_term" | "long_term";
  disclaimer: string;
}

export interface BusinessHealthAssessment {
  overallScore: number;
  scoreBreakdown: {
    category: string;
    score: number;
    weight: number;
    insight: string;
  }[];
  summary: string;
  topPriorities: string[];
  disclaimer: string;
}

// Calculate unified business profile from cross-system data
export function calculateBusinessProfile(
  data: CrossSystemData
): UnifiedBusinessProfile {
  const monthlyRevenue = data.pos
    ? data.pos.dailySales * 30
    : data.cashFlow?.monthlyRevenue || 0;

  const monthlyExpenses = data.payroll?.totalPayroll || 0;

  return {
    monthlyRevenue,
    monthlyExpenses,
    employeeCount: data.payroll?.employeeCount || 0,
    industry: "general",

    cashFlowHealth: data.cashFlow?.healthScore || 70,
    customerSatisfaction: data.reviews?.avgRating || 4.0,
    operationalEfficiency: calculateOperationalEfficiency(data),

    revenueGrowth: data.pos?.growthRate || 0,
    customerGrowth: 0, // Would need historical data

    overdueReceivables: data.cashFlow?.overdueReceivables || 0,
    staffingStrain: data.payroll
      ? data.payroll.overtimeHours / (data.payroll.employeeCount * 10)
      : 0,
  };
}

// Calculate operational efficiency score
function calculateOperationalEfficiency(data: CrossSystemData): number {
  let score = 70; // Base score

  // Adjust for payroll efficiency
  if (data.pos && data.payroll) {
    const laborRatio = data.payroll.totalPayroll / (data.pos.dailySales * 30);
    if (laborRatio < 0.3) score += 10;
    else if (laborRatio > 0.45) score -= 10;
  }

  // Adjust for overtime
  if (data.payroll && data.payroll.employeeCount > 0) {
    const overtimeRatio =
      data.payroll.overtimeHours / (data.payroll.employeeCount * 20);
    if (overtimeRatio > 0.5) score -= 15;
    else if (overtimeRatio < 0.1) score += 5;
  }

  // Adjust for cash flow
  if (data.cashFlow) {
    if (data.cashFlow.healthScore >= 80) score += 10;
    else if (data.cashFlow.healthScore < 50) score -= 10;
  }

  return Math.max(0, Math.min(100, score));
}

// Generate comprehensive business health assessment
export function generateHealthAssessment(
  data: CrossSystemData
): BusinessHealthAssessment {
  const scoreBreakdown: BusinessHealthAssessment["scoreBreakdown"] = [];

  // Cash Flow Health (30% weight)
  const cashFlowScore = data.cashFlow?.healthScore || 70;
  scoreBreakdown.push({
    category: "Cash Flow",
    score: cashFlowScore,
    weight: 0.3,
    insight:
      cashFlowScore >= 70
        ? "Cash flow appears healthy"
        : "Cash flow could use attention",
  });

  // Customer Satisfaction (25% weight)
  const customerScore = data.reviews
    ? (data.reviews.avgRating / 5) * 100
    : 80;
  scoreBreakdown.push({
    category: "Customer Satisfaction",
    score: customerScore,
    weight: 0.25,
    insight:
      customerScore >= 80
        ? "Customer feedback appears positive"
        : "Customer experience could be an area for improvement",
  });

  // Operational Efficiency (25% weight)
  const efficiencyScore = calculateOperationalEfficiency(data);
  scoreBreakdown.push({
    category: "Operations",
    score: efficiencyScore,
    weight: 0.25,
    insight:
      efficiencyScore >= 70
        ? "Operations appear to be running efficiently"
        : "There could be opportunities to improve operational efficiency",
  });

  // Growth Momentum (20% weight)
  const growthScore = data.pos
    ? Math.min(100, 50 + data.pos.growthRate * 200)
    : 60;
  scoreBreakdown.push({
    category: "Growth",
    score: growthScore,
    weight: 0.2,
    insight:
      growthScore >= 60
        ? "Business appears to be growing"
        : "Growth could benefit from strategic focus",
  });

  // Calculate overall score
  const overallScore = Math.round(
    scoreBreakdown.reduce((sum, item) => sum + item.score * item.weight, 0)
  );

  // Generate summary
  let summary: string;
  if (overallScore >= 80) {
    summary =
      "Your business appears to be performing well across key metrics. You could consider maintaining current practices while exploring strategic growth opportunities.";
  } else if (overallScore >= 60) {
    summary =
      "Your business shows solid fundamentals with some areas that could benefit from attention. The insights below highlight potential opportunities.";
  } else {
    summary =
      "There could be some areas requiring attention in your business. The insights below suggest areas you might want to explore with qualified professionals.";
  }

  // Generate top priorities
  const topPriorities: string[] = [];
  const sortedCategories = [...scoreBreakdown].sort((a, b) => a.score - b.score);

  sortedCategories.slice(0, 2).forEach((cat) => {
    if (cat.score < 70) {
      topPriorities.push(
        `Consider reviewing ${cat.category.toLowerCase()} - ${cat.insight}`
      );
    }
  });

  if (topPriorities.length === 0) {
    topPriorities.push(
      "Continue monitoring key metrics and maintaining current practices"
    );
    topPriorities.push(
      "Consider exploring growth opportunities when strategically appropriate"
    );
  }

  return {
    overallScore,
    scoreBreakdown,
    summary,
    topPriorities,
    disclaimer: getDisclaimer("general", "full"),
  };
}

// Generate unified AI insights using Gemini
export async function generateUnifiedAIInsights(
  data: CrossSystemData
): Promise<UnifiedInsight[]> {
  const apiKey = process.env.GOOGLE_AI_API_KEY;

  // First generate rule-based insights
  const ruleBasedInsights = generateCrossSystemInsights(data);

  if (!apiKey) {
    // Convert cross-system insights to unified format
    return ruleBasedInsights.map((insight) => ({
      id: insight.id,
      category: mapToUnifiedCategory(insight.category),
      title: insight.title,
      description: insight.description,
      impact: insight.priority,
      actionItems: insight.actionItems,
      dataSources: insight.dataSources,
      confidence: insight.confidence,
      timeframe: "short_term" as const,
      disclaimer: insight.disclaimer,
    }));
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const profile = calculateBusinessProfile(data);

    const prompt = `You are an educational business analysis assistant serving as an "ultimate business sidekick." Your role is to provide holistic insights by correlating data across multiple business systems.

CRITICAL LANGUAGE REQUIREMENTS:
- ALWAYS use "could", "might", "consider", "potential" instead of "should", "must", "need to", "have to"
- Frame all suggestions as possibilities: "You could consider..." not "You should..."
- Use hedging language: "Based on the data, one approach could be..."
- Never give directive business, financial, or legal advice
- Always remind users to consult appropriate professionals

Business Profile:
- Industry: ${profile.industry}
- Monthly Revenue: $${(profile.monthlyRevenue / 100).toLocaleString()}
- Monthly Payroll: $${(profile.monthlyExpenses / 100).toLocaleString()}
- Employees: ${profile.employeeCount}
- Revenue Growth: ${(profile.revenueGrowth * 100).toFixed(1)}%

Health Indicators:
- Cash Flow Health: ${profile.cashFlowHealth}/100
- Customer Satisfaction: ${profile.customerSatisfaction.toFixed(1)}/5 stars
- Operational Efficiency: ${profile.operationalEfficiency}/100

Risk Indicators:
- Overdue Receivables: $${(profile.overdueReceivables / 100).toLocaleString()}
- Staffing Strain: ${(profile.staffingStrain * 100).toFixed(1)}% overtime ratio

Based on this holistic view, provide 3-4 "ultimate sidekick" insights that connect patterns across different aspects of the business. Format as JSON:
{
  "insights": [
    {
      "category": "growth" | "efficiency" | "risk" | "opportunity" | "health",
      "title": "Brief, actionable title using 'could' or 'potential' framing",
      "description": "Description using suggestive language. Connect multiple data points.",
      "impact": "high" | "medium" | "low",
      "actionItems": ["Consider action 1", "You could action 2", "Optionally action 3"],
      "dataSources": ["Source 1", "Source 2"],
      "timeframe": "immediate" | "short_term" | "long_term"
    }
  ]
}

Remember: Be the ultimate business sidekick by connecting dots across all data, but always frame insights as possibilities to explore, not directives to follow. Return ONLY valid JSON, no other text.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Clean the response - remove markdown code blocks if present
    let jsonText = text.trim();
    if (jsonText.startsWith("```json")) {
      jsonText = jsonText.slice(7);
    } else if (jsonText.startsWith("```")) {
      jsonText = jsonText.slice(3);
    }
    if (jsonText.endsWith("```")) {
      jsonText = jsonText.slice(0, -3);
    }
    jsonText = jsonText.trim();

    const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return convertToUnifiedInsights(ruleBasedInsights);
    }

    const parsed = JSON.parse(jsonMatch[0] || jsonText);

    if (!parsed.insights || !Array.isArray(parsed.insights)) {
      return convertToUnifiedInsights(ruleBasedInsights);
    }

    let aiInsightId = 0;
    const aiInsights: UnifiedInsight[] = parsed.insights.map(
      (insight: {
        category?: string;
        title: string;
        description: string;
        impact?: string;
        actionItems?: string[];
        dataSources?: string[];
        timeframe?: string;
      }) => {
        const confidence = 0.65 + Math.random() * 0.2;
        return {
          id: `unified-ai-${aiInsightId++}`,
          category: validateCategory(insight.category),
          title: insight.title,
          description: insight.description,
          impact: validateImpact(insight.impact),
          actionItems: insight.actionItems || [
            "Consider reviewing this insight with your team",
          ],
          dataSources: insight.dataSources || ["Multiple Systems"],
          confidence,
          timeframe: validateTimeframe(insight.timeframe),
          disclaimer: getDisclaimer("insight", "short"),
        };
      }
    );

    return aiInsights;
  } catch (error) {
    console.error("[Unified AI] Error generating insights:", error);
    return convertToUnifiedInsights(ruleBasedInsights);
  }
}

// Helper functions
function mapToUnifiedCategory(
  category: string
): UnifiedInsight["category"] {
  const mapping: Record<string, UnifiedInsight["category"]> = {
    revenue: "growth",
    operations: "efficiency",
    staffing: "opportunity",
    customer: "health",
    cash_flow: "risk",
  };
  return mapping[category] || "opportunity";
}

function validateCategory(category?: string): UnifiedInsight["category"] {
  const valid = ["growth", "efficiency", "risk", "opportunity", "health"];
  return valid.includes(category || "") ? (category as UnifiedInsight["category"]) : "opportunity";
}

function validateImpact(impact?: string): UnifiedInsight["impact"] {
  const valid = ["high", "medium", "low"];
  return valid.includes(impact || "") ? (impact as UnifiedInsight["impact"]) : "medium";
}

function validateTimeframe(timeframe?: string): UnifiedInsight["timeframe"] {
  const valid = ["immediate", "short_term", "long_term"];
  return valid.includes(timeframe || "") ? (timeframe as UnifiedInsight["timeframe"]) : "short_term";
}

function convertToUnifiedInsights(
  crossSystemInsights: CrossSystemInsight[]
): UnifiedInsight[] {
  return crossSystemInsights.map((insight) => ({
    id: insight.id,
    category: mapToUnifiedCategory(insight.category),
    title: insight.title,
    description: insight.description,
    impact: insight.priority,
    actionItems: insight.actionItems,
    dataSources: insight.dataSources,
    confidence: insight.confidence,
    timeframe: "short_term" as const,
    disclaimer: insight.disclaimer,
  }));
}

// Get integrated status for sidebar
export function getIntegrationStatus(connectedSystems: string[]): {
  connected: number;
  total: number;
  percentage: number;
  label: string;
} {
  const allSystems = [
    "quickbooks",
    "xero",
    "square",
    "clover",
    "toast",
    "google_business",
    "yelp",
    "gusto",
  ];
  const total = allSystems.length;
  const connected = connectedSystems.length;
  const percentage = Math.round((connected / total) * 100);

  let label: string;
  if (percentage >= 75) {
    label = "Fully integrated";
  } else if (percentage >= 50) {
    label = "Well connected";
  } else if (percentage >= 25) {
    label = "Partially connected";
  } else {
    label = "Connect more systems";
  }

  return { connected, total, percentage, label };
}

export { getConfidenceInfo };
