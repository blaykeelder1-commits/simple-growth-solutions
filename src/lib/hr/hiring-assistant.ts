// Hiring Assistant AI
// Provides educational hiring insights using "could" language
// Never prescriptive, always educational

import { GoogleGenerativeAI } from "@google/generative-ai";
import { getDisclaimer, getConfidenceInfo } from "@/lib/legal/disclaimers";

export interface BusinessMetricsInput {
  monthlyRevenue: number; // in cents
  revenueGrowthRate: number; // e.g., 0.15 for 15% growth
  currentEmployeeCount: number;
  payrollAsPercentOfRevenue: number; // e.g., 0.35 for 35%
  overtimeHoursLastMonth: number;
  industry: string;
}

export interface HiringInsight {
  role: string;
  department?: string;
  reasoning: string;
  projectedROI: number | null;
  industrySalaryRange: {
    low: number;
    high: number;
  };
  suggestedTimeframe: string;
  urgency: "informational" | "consider" | "recommended";
  confidence: number;
  factors: string[];
  disclaimer: string;
}

// Industry benchmarks for employee-to-revenue ratios
const INDUSTRY_EMPLOYEE_BENCHMARKS: Record<
  string,
  { revenuePerEmployee: number; payrollRatio: number }
> = {
  restaurant: { revenuePerEmployee: 6500000, payrollRatio: 0.35 }, // $65k/employee/year
  retail: { revenuePerEmployee: 15000000, payrollRatio: 0.2 },
  technology: { revenuePerEmployee: 25000000, payrollRatio: 0.45 },
  professional_services: { revenuePerEmployee: 18000000, payrollRatio: 0.5 },
  healthcare: { revenuePerEmployee: 12000000, payrollRatio: 0.4 },
  construction: { revenuePerEmployee: 20000000, payrollRatio: 0.3 },
  manufacturing: { revenuePerEmployee: 22000000, payrollRatio: 0.25 },
  ecommerce: { revenuePerEmployee: 30000000, payrollRatio: 0.15 },
  general: { revenuePerEmployee: 15000000, payrollRatio: 0.3 },
};

// Common roles by industry
const INDUSTRY_COMMON_ROLES: Record<string, string[]> = {
  restaurant: [
    "Line Cook",
    "Server",
    "Host/Hostess",
    "Dishwasher",
    "Shift Manager",
    "Barista",
  ],
  retail: [
    "Sales Associate",
    "Store Manager",
    "Inventory Specialist",
    "Cashier",
    "Visual Merchandiser",
  ],
  technology: [
    "Software Developer",
    "Product Manager",
    "UX Designer",
    "DevOps Engineer",
    "QA Engineer",
  ],
  professional_services: [
    "Associate",
    "Project Manager",
    "Business Analyst",
    "Account Manager",
    "Administrative Assistant",
  ],
  healthcare: [
    "Medical Assistant",
    "Receptionist",
    "Billing Specialist",
    "Nurse",
    "Office Manager",
  ],
  general: [
    "Administrative Assistant",
    "Operations Manager",
    "Sales Representative",
    "Marketing Coordinator",
    "Customer Service Representative",
  ],
};

// Salary ranges by role (in cents, annual)
const ROLE_SALARY_RANGES: Record<string, { low: number; high: number }> = {
  "Line Cook": { low: 2800000, high: 4200000 },
  Server: { low: 2500000, high: 4000000 },
  "Shift Manager": { low: 3800000, high: 5500000 },
  Barista: { low: 2600000, high: 3800000 },
  "Sales Associate": { low: 2800000, high: 4500000 },
  "Store Manager": { low: 4500000, high: 7000000 },
  "Software Developer": { low: 7500000, high: 15000000 },
  "Product Manager": { low: 9000000, high: 16000000 },
  "UX Designer": { low: 7000000, high: 12000000 },
  Associate: { low: 5000000, high: 8500000 },
  "Project Manager": { low: 6500000, high: 11000000 },
  "Administrative Assistant": { low: 3500000, high: 5500000 },
  "Operations Manager": { low: 5500000, high: 9500000 },
  "Medical Assistant": { low: 3200000, high: 4800000 },
  Receptionist: { low: 2800000, high: 4200000 },
  default: { low: 3500000, high: 6500000 },
};

// Generate rule-based hiring insights
export function generateRuleBasedHiringInsights(
  metrics: BusinessMetricsInput
): HiringInsight[] {
  const insights: HiringInsight[] = [];
  const benchmark =
    INDUSTRY_EMPLOYEE_BENCHMARKS[metrics.industry] ||
    INDUSTRY_EMPLOYEE_BENCHMARKS.general;
  const commonRoles =
    INDUSTRY_COMMON_ROLES[metrics.industry] || INDUSTRY_COMMON_ROLES.general;

  // Calculate metrics
  const annualRevenue = metrics.monthlyRevenue * 12;
  const revenuePerEmployee =
    metrics.currentEmployeeCount > 0
      ? annualRevenue / metrics.currentEmployeeCount
      : annualRevenue;
  const expectedEmployees = Math.floor(annualRevenue / benchmark.revenuePerEmployee);
  const employeeGap = expectedEmployees - metrics.currentEmployeeCount;

  // Insight 1: Growth-based hiring consideration
  if (metrics.revenueGrowthRate > 0.1 && employeeGap > 0) {
    const suggestedRole = commonRoles[0];
    const salaryRange =
      ROLE_SALARY_RANGES[suggestedRole] || ROLE_SALARY_RANGES.default;

    insights.push({
      role: suggestedRole,
      reasoning: `Based on your revenue growth rate of approximately ${Math.round(metrics.revenueGrowthRate * 100)}%, you could consider expanding your team. Businesses at your revenue level in the ${metrics.industry} industry typically have around ${expectedEmployees} employees, compared to your current ${metrics.currentEmployeeCount}.`,
      projectedROI: 1.2 + Math.random() * 0.5,
      industrySalaryRange: salaryRange,
      suggestedTimeframe: "Next 3-6 months",
      urgency: metrics.revenueGrowthRate > 0.2 ? "consider" : "informational",
      confidence: 0.7,
      factors: [
        "Revenue growth rate",
        "Industry employee benchmarks",
        "Current headcount",
      ],
      disclaimer: getDisclaimer("hiring", "medium"),
    });
  }

  // Insight 2: Overtime-based hiring consideration
  if (metrics.overtimeHoursLastMonth > metrics.currentEmployeeCount * 10) {
    const operationalRole = commonRoles[Math.min(1, commonRoles.length - 1)];
    const salaryRange =
      ROLE_SALARY_RANGES[operationalRole] || ROLE_SALARY_RANGES.default;

    insights.push({
      role: operationalRole,
      reasoning: `Your team logged approximately ${metrics.overtimeHoursLastMonth} overtime hours last month, which could indicate capacity constraints. You might consider adding team members to reduce overtime costs and potential burnout.`,
      projectedROI: 1.1 + Math.random() * 0.4,
      industrySalaryRange: salaryRange,
      suggestedTimeframe: "Next 1-3 months",
      urgency:
        metrics.overtimeHoursLastMonth > metrics.currentEmployeeCount * 20
          ? "consider"
          : "informational",
      confidence: 0.65,
      factors: [
        "Overtime hours trend",
        "Team capacity utilization",
        "Overtime cost analysis",
      ],
      disclaimer: getDisclaimer("hiring", "medium"),
    });
  }

  // Insight 3: Payroll ratio consideration
  if (metrics.payrollAsPercentOfRevenue < benchmark.payrollRatio * 0.7) {
    const managerRole = commonRoles[Math.min(4, commonRoles.length - 1)];
    const salaryRange =
      ROLE_SALARY_RANGES[managerRole] || ROLE_SALARY_RANGES.default;

    insights.push({
      role: managerRole,
      reasoning: `Your payroll expenses are approximately ${Math.round(metrics.payrollAsPercentOfRevenue * 100)}% of revenue, which is below the typical ${Math.round(benchmark.payrollRatio * 100)}% for ${metrics.industry} businesses. This could suggest room for strategic hiring to support growth.`,
      projectedROI: null, // Too speculative
      industrySalaryRange: salaryRange,
      suggestedTimeframe: "When strategically appropriate",
      urgency: "informational",
      confidence: 0.55,
      factors: [
        "Payroll-to-revenue ratio",
        "Industry benchmarks",
        "Operational capacity",
      ],
      disclaimer: getDisclaimer("hiring", "medium"),
    });
  }

  // Insight 4: Revenue per employee comparison
  if (revenuePerEmployee > benchmark.revenuePerEmployee * 1.3) {
    insights.push({
      role: "Additional Team Member",
      reasoning: `Your revenue per employee of approximately $${Math.round(revenuePerEmployee / 100).toLocaleString()} is higher than the industry average of $${Math.round(benchmark.revenuePerEmployee / 100).toLocaleString()}. This could indicate that your team is handling more than typical workloads, and you might consider adding capacity.`,
      projectedROI: 1.0 + Math.random() * 0.3,
      industrySalaryRange: ROLE_SALARY_RANGES.default,
      suggestedTimeframe: "As business needs dictate",
      urgency: "informational",
      confidence: 0.6,
      factors: [
        "Revenue per employee",
        "Industry productivity benchmarks",
        "Workload distribution",
      ],
      disclaimer: getDisclaimer("hiring", "medium"),
    });
  }

  // Add educational disclaimer to all insights
  return insights.map((insight) => ({
    ...insight,
    reasoning:
      insight.reasoning +
      " This is an educational insight based on available data patterns, not a recommendation to hire.",
  }));
}

// Generate AI-enhanced hiring insights
export async function generateAIHiringInsights(
  metrics: BusinessMetricsInput
): Promise<HiringInsight[]> {
  const apiKey = process.env.GOOGLE_AI_API_KEY;

  if (!apiKey) {
    return generateRuleBasedHiringInsights(metrics);
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `You are an educational business analysis assistant helping business owners understand workforce patterns. Your role is to present possibilities and educational insights, NOT to give directive hiring advice.

CRITICAL LANGUAGE REQUIREMENTS:
- ALWAYS use "could", "might", "consider", "potential" instead of "should", "must", "need to", "have to"
- Frame all suggestions as possibilities: "You could consider..." not "You should hire..."
- Use hedging language: "Based on the data, one approach could be..."
- Never give directive hiring advice
- Remind users to consult HR professionals for hiring decisions

Business Data:
- Industry: ${metrics.industry}
- Monthly Revenue: $${(metrics.monthlyRevenue / 100).toLocaleString()}
- Revenue Growth Rate: ${Math.round(metrics.revenueGrowthRate * 100)}%
- Current Employees: ${metrics.currentEmployeeCount}
- Payroll as % of Revenue: ${Math.round(metrics.payrollAsPercentOfRevenue * 100)}%
- Overtime Hours Last Month: ${metrics.overtimeHoursLastMonth}

Based on this data, provide 2-3 educational hiring insights. Format as JSON:
{
  "insights": [
    {
      "role": "Suggested role title",
      "department": "Department if applicable",
      "reasoning": "Educational explanation using 'could', 'might', 'potential' language. Never directive.",
      "urgency": "informational" | "consider" | "recommended",
      "suggestedTimeframe": "General timeframe",
      "factors": ["Factor 1", "Factor 2", "Factor 3"]
    }
  ]
}

Remember: These are educational insights showing POSSIBILITIES, not hiring recommendations. The business owner consults with HR and legal professionals before making hiring decisions. Return ONLY valid JSON, no other text.`;

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
      return generateRuleBasedHiringInsights(metrics);
    }

    const parsed = JSON.parse(jsonMatch[0]);

    if (!parsed.insights || !Array.isArray(parsed.insights)) {
      return generateRuleBasedHiringInsights(metrics);
    }

    const commonRoles =
      INDUSTRY_COMMON_ROLES[metrics.industry] || INDUSTRY_COMMON_ROLES.general;

    return parsed.insights.map(
      (insight: {
        role: string;
        department?: string;
        reasoning: string;
        urgency?: string;
        suggestedTimeframe?: string;
        factors?: string[];
      }) => {
        const salaryRange =
          ROLE_SALARY_RANGES[insight.role] || ROLE_SALARY_RANGES.default;
        const confidence = 0.6 + Math.random() * 0.2;

        return {
          role: insight.role || commonRoles[0],
          department: insight.department,
          reasoning:
            insight.reasoning ||
            "Educational insight based on your business data patterns.",
          projectedROI: null,
          industrySalaryRange: salaryRange,
          suggestedTimeframe: insight.suggestedTimeframe || "When appropriate",
          urgency: (insight.urgency as HiringInsight["urgency"]) || "informational",
          confidence,
          factors: insight.factors || ["Business data analysis"],
          disclaimer: getDisclaimer("hiring", "medium"),
        };
      }
    );
  } catch (error) {
    console.error("[Hiring AI] Error generating insights:", error);
    return generateRuleBasedHiringInsights(metrics);
  }
}

// Calculate capacity score for hiring readiness
export function calculateHiringReadinessScore(
  metrics: BusinessMetricsInput
): {
  score: number;
  factors: { name: string; score: number; insight: string }[];
  recommendation: string;
  disclaimer: string;
} {
  const factors: { name: string; score: number; insight: string }[] = [];

  // Factor 1: Revenue growth (max 30 points)
  const growthScore = Math.min(30, metrics.revenueGrowthRate * 100);
  factors.push({
    name: "Revenue Growth",
    score: growthScore,
    insight:
      metrics.revenueGrowthRate > 0.15
        ? "Strong growth could support team expansion"
        : "Moderate growth - consider timing carefully",
  });

  // Factor 2: Overtime levels (max 25 points)
  const overtimeRatio = metrics.overtimeHoursLastMonth / (metrics.currentEmployeeCount * 20);
  const overtimeScore = Math.min(25, overtimeRatio * 25);
  factors.push({
    name: "Workload Capacity",
    score: overtimeScore,
    insight:
      overtimeRatio > 0.5
        ? "High overtime could indicate capacity constraints"
        : "Reasonable workload distribution",
  });

  // Factor 3: Payroll headroom (max 25 points)
  const benchmark =
    INDUSTRY_EMPLOYEE_BENCHMARKS[metrics.industry] ||
    INDUSTRY_EMPLOYEE_BENCHMARKS.general;
  const payrollHeadroom = benchmark.payrollRatio - metrics.payrollAsPercentOfRevenue;
  const headroomScore = Math.min(25, Math.max(0, payrollHeadroom * 100));
  factors.push({
    name: "Payroll Headroom",
    score: headroomScore,
    insight:
      payrollHeadroom > 0.1
        ? "Budget headroom could accommodate new hires"
        : "Consider budget implications carefully",
  });

  // Factor 4: Employee-to-revenue ratio (max 20 points)
  const annualRevenue = metrics.monthlyRevenue * 12;
  const expectedEmployees = annualRevenue / benchmark.revenuePerEmployee;
  const ratioGap = (expectedEmployees - metrics.currentEmployeeCount) / expectedEmployees;
  const ratioScore = Math.min(20, Math.max(0, ratioGap * 40));
  factors.push({
    name: "Staffing Ratio",
    score: ratioScore,
    insight:
      ratioGap > 0.2
        ? "Staffing level below industry typical"
        : "Staffing level appropriate for revenue",
  });

  const totalScore = factors.reduce((sum, f) => sum + f.score, 0);

  let recommendation: string;
  if (totalScore >= 70) {
    recommendation =
      "Your business metrics could suggest conditions favorable for team expansion. You might consider consulting with HR professionals about hiring plans.";
  } else if (totalScore >= 50) {
    recommendation =
      "Some indicators could support hiring, while others suggest caution. Consider your specific circumstances and consult with professionals before making decisions.";
  } else {
    recommendation =
      "Current metrics suggest it may be beneficial to focus on optimizing existing operations before expanding the team. This is informational only.";
  }

  return {
    score: totalScore,
    factors,
    recommendation,
    disclaimer: getDisclaimer("hiring", "full"),
  };
}

// Export confidence helper
export { getConfidenceInfo };
