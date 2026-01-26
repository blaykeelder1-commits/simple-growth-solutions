// Legal Disclaimer System for Business Chauffeur Platform
// Protects against "advisor" liability with "could do" framing

export const DISCLAIMER_TEMPLATES = {
  insight: {
    short: "This insight shows what you could do, not what you should do.",
    medium:
      "Based on your data patterns, here's a possible approach. Results may vary based on your specific circumstances.",
    full: "This insight is generated based on your data patterns and is meant for educational purposes only. It shows what you could consider, not a prescription for action. Consult with a qualified professional before making financial or business decisions.",
  },
  recommendation: {
    short: "Educational insight based on your data.",
    medium:
      "This recommendation is one possible approach based on available data. Your situation may require different considerations.",
    full: "This recommendation is provided as an educational tool to help you understand possible approaches. It is not financial, legal, or professional advice. Always consult with qualified professionals before making significant business decisions.",
  },
  forecast: {
    short: "Projection based on current data - actual results may vary.",
    medium:
      "This forecast is based on historical patterns and current data. Future conditions may differ significantly from projections.",
    full: "Cash flow forecasts are projections based on historical data patterns and are not guarantees of future performance. Actual results may differ materially due to market conditions, client behavior changes, and other factors outside the scope of this analysis.",
  },
  roi: {
    short: "Estimated value based on typical outcomes.",
    medium:
      "ROI calculations are estimates based on industry averages and your specific data. Individual results vary.",
    full: "Return on investment calculations are estimates based on industry benchmarks and your historical data. These figures represent potential outcomes, not guaranteed results. Actual value delivered depends on implementation, market conditions, and other variables.",
  },
  hiring: {
    short: "Data-informed hiring perspective for consideration.",
    medium:
      "Based on your metrics, here's what businesses like yours could consider regarding staffing. This is not a recommendation to hire or not hire.",
    full: "Hiring insights are educational tools based on industry benchmarks and your business data. Employment decisions should be made with consideration of legal requirements, local market conditions, and consultation with HR and legal professionals.",
  },
  benchmark: {
    short: "Industry comparison for reference only.",
    medium:
      "This benchmark compares your metrics to industry averages. Your unique circumstances may justify different results.",
    full: "Industry benchmarks are aggregated from various sources and represent general patterns. Your business may have legitimate reasons for metrics that differ from industry averages. Use this data as one input among many in your decision-making process.",
  },
  general: {
    short: "For informational purposes only.",
    medium:
      "This information is provided for educational purposes. Professional consultation recommended for major decisions.",
    full: "Business Chauffeur provides data analysis and educational insights to help you understand your business patterns. This platform is not a substitute for professional financial, legal, tax, or business advice. Always consult qualified professionals before making significant business decisions.",
  },
} as const;

export type DisclaimerType = keyof typeof DISCLAIMER_TEMPLATES;
export type DisclaimerLength = "short" | "medium" | "full";

export function getDisclaimer(
  type: DisclaimerType,
  length: DisclaimerLength = "short"
): string {
  return DISCLAIMER_TEMPLATES[type][length];
}

// Confidence level indicators for AI-generated content
export const CONFIDENCE_LEVELS = {
  high: {
    label: "High confidence",
    description: "Based on substantial data with consistent patterns",
    threshold: 0.8,
    color: "green",
  },
  medium: {
    label: "Medium confidence",
    description: "Based on available data, some variability expected",
    threshold: 0.5,
    color: "yellow",
  },
  low: {
    label: "Low confidence",
    description: "Limited data available, use with caution",
    threshold: 0,
    color: "orange",
  },
} as const;

export type ConfidenceLevel = keyof typeof CONFIDENCE_LEVELS;

export function getConfidenceLevel(score: number): ConfidenceLevel {
  if (score >= CONFIDENCE_LEVELS.high.threshold) return "high";
  if (score >= CONFIDENCE_LEVELS.medium.threshold) return "medium";
  return "low";
}

export function getConfidenceInfo(score: number) {
  const level = getConfidenceLevel(score);
  return {
    level,
    ...CONFIDENCE_LEVELS[level],
    score,
    percentage: Math.round(score * 100),
  };
}

// Language transformation utilities for "could do" framing
export const SUGGESTIVE_LANGUAGE = {
  // Transforms directive phrases to suggestive ones
  transforms: {
    "You should": "You could consider",
    "You need to": "You might want to",
    "You must": "You could",
    "Do this": "Consider doing this",
    "Take action": "Consider taking action",
    Implement: "Consider implementing",
    Require: "Consider requiring",
    Increase: "Consider increasing",
    Decrease: "Consider decreasing",
    "Send a": "Consider sending a",
    "Make a": "Consider making a",
    Review: "Consider reviewing",
    Offer: "Consider offering",
    "Set up": "Consider setting up",
    Add: "Consider adding",
  },
  // Prefix phrases for AI responses
  prefixes: [
    "Based on your data, you could",
    "One possible approach is to",
    "Businesses in similar situations often",
    "Your data suggests you might consider",
    "A potential strategy could be to",
  ],
  // Softening words to add before recommendations
  softeners: [
    "possibly",
    "potentially",
    "perhaps",
    "optionally",
    "as one option",
  ],
} as const;

// Terms of service and privacy policy links
export const LEGAL_LINKS = {
  termsOfService: "/legal/terms",
  privacyPolicy: "/legal/privacy",
  disclaimer: "/legal/disclaimer",
  dataUsage: "/legal/data-usage",
} as const;

// Badge labels for AI-generated content
export const AI_CONTENT_BADGES = {
  insight: {
    label: "AI Insight",
    tooltip: "This insight was generated using AI analysis of your data",
  },
  recommendation: {
    label: "Learning Tool",
    tooltip:
      "Educational suggestion based on data patterns - not professional advice",
  },
  forecast: {
    label: "AI Projection",
    tooltip: "Forecast based on historical patterns - actual results may vary",
  },
  benchmark: {
    label: "Industry Data",
    tooltip: "Comparison based on aggregated industry benchmarks",
  },
} as const;

export type AIContentBadgeType = keyof typeof AI_CONTENT_BADGES;

// Full disclaimer text for legal pages
export const FULL_LEGAL_DISCLAIMER = `
DISCLAIMER OF PROFESSIONAL ADVICE

Business Chauffeur is an educational and analytical tool designed to help business owners understand their financial data and explore potential business strategies. The platform and its features, including but not limited to cash flow analysis, forecasting, recommendations, benchmarks, and hiring insights, are provided for informational and educational purposes only.

NOT PROFESSIONAL ADVICE
The information, suggestions, and insights provided by Business Chauffeur do not constitute financial, legal, tax, accounting, or other professional advice. The platform uses phrases like "you could consider" and "one possible approach" to indicate that suggestions are possibilities to explore, not prescriptions for action.

NO GUARANTEE OF RESULTS
Past performance and historical data patterns do not guarantee future results. Forecasts, projections, and ROI estimates are based on available data and industry averages, and actual results may differ materially due to factors outside the scope of this analysis.

CONSULT QUALIFIED PROFESSIONALS
Before making significant business decisions, including but not limited to financial transactions, hiring decisions, changes to payment terms, collection actions, or business strategy changes, you should consult with qualified professionals including accountants, attorneys, financial advisors, and HR specialists as appropriate.

DATA ACCURACY
While we strive for accuracy, Business Chauffeur relies on data you provide and data from connected integrations. We are not responsible for decisions made based on inaccurate or incomplete data.

USE AT YOUR OWN RISK
By using Business Chauffeur, you acknowledge that you are responsible for your own business decisions and that the platform's insights are one of many inputs you should consider in your decision-making process.
`.trim();
