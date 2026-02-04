// AI-powered recommendation engine for Cash Flow AI
// Uses "could do" framing to avoid advisory liability

import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  getDisclaimer,
  getConfidenceInfo,
  SUGGESTIVE_LANGUAGE,
} from "@/lib/legal/disclaimers";
import { cashflowLogger as logger } from "@/lib/logger";

export interface RecommendationInput {
  clientName: string;
  clientScore: number;
  invoiceAmount: number;
  daysPastDue: number;
  totalOutstanding: number;
  paymentHistory: {
    avgDaysToPayment: number;
    latePaymentRate: number;
    totalPaid: number;
  };
  communicationHistory?: {
    lastContact: Date | null;
    totalContacts: number;
    lastResponse: Date | null;
  };
}

export interface Recommendation {
  type: "collection_strategy" | "payment_terms" | "client_risk" | "cash_flow";
  title: string;
  description: string;
  priority: "low" | "medium" | "high" | "critical";
  actions: string[];
  reasoning: string;
  confidence: number;
  // Legal compliance fields
  disclaimer: string;
  confidenceLevel: "high" | "medium" | "low";
  isEducational: boolean;
}

// Helper to create recommendation with legal compliance fields
function createRecommendation(
  base: Omit<Recommendation, "disclaimer" | "confidenceLevel" | "isEducational">
): Recommendation {
  const confidenceInfo = getConfidenceInfo(base.confidence);
  return {
    ...base,
    disclaimer: getDisclaimer("recommendation", "short"),
    confidenceLevel: confidenceInfo.level,
    isEducational: true,
  };
}

// Rule-based recommendations (fallback)
// Uses "could" language to frame suggestions as educational, not prescriptive
export function generateRuleBasedRecommendations(
  input: RecommendationInput
): Recommendation[] {
  const recommendations: Recommendation[] = [];

  // Overdue invoice recommendations
  if (input.daysPastDue > 0) {
    if (input.daysPastDue <= 7) {
      recommendations.push(
        createRecommendation({
          type: "collection_strategy",
          title: "Consider sending a friendly payment reminder",
          description: `Invoice for ${input.clientName} is ${input.daysPastDue} days past due. You could consider a friendly reminder, which typically resolves early-stage overdue invoices.`,
          priority: "medium",
          actions: [
            "Consider sending an automated email reminder",
            "You could offer an online payment link",
            "Optionally confirm invoice receipt",
          ],
          reasoning:
            "Based on industry patterns, early reminders tend to have higher conversion rates",
          confidence: 0.85,
        })
      );
    } else if (input.daysPastDue <= 30) {
      recommendations.push(
        createRecommendation({
          type: "collection_strategy",
          title: "Consider escalating collection efforts",
          description: `Invoice for ${input.clientName} is ${input.daysPastDue} days overdue. You might want to consider phone follow-up.`,
          priority: "high",
          actions: [
            "Consider making a phone call to accounts payable",
            "You could send a formal collection notice",
            "Optionally offer a payment plan if appropriate",
          ],
          reasoning:
            "Data suggests phone calls could increase collection rates for 2-4 week overdue invoices",
          confidence: 0.8,
        })
      );
    } else {
      recommendations.push(
        createRecommendation({
          type: "collection_strategy",
          title: "Consider final notice and escalation review",
          description: `Invoice for ${input.clientName} is significantly overdue (${input.daysPastDue} days). You could review escalation options.`,
          priority: "critical",
          actions: [
            "Consider sending a final notice letter",
            "You could review collection agency options",
            "Consult with a professional about potential legal options",
            "Consider documenting all communication attempts",
          ],
          reasoning:
            "Long-overdue invoices often benefit from formal escalation procedures",
          confidence: 0.75,
        })
      );
    }
  }

  // Client risk recommendations
  if (input.clientScore < 40) {
    recommendations.push(
      createRecommendation({
        type: "client_risk",
        title: "Consider reviewing payment terms for this client",
        description: `${input.clientName} has a lower payment score (${input.clientScore}). You could consider requiring upfront payment or shorter terms for future work.`,
        priority: "high",
        actions: [
          "Consider requiring a deposit for new work",
          "You could consider shortening payment terms",
          "Optionally review credit limits",
          "Consider documenting your risk assessment",
        ],
        reasoning: `Client's historical late payment rate is approximately ${Math.round(input.paymentHistory.latePaymentRate * 100)}%`,
        confidence: 0.82,
      })
    );
  }

  // Payment terms recommendations
  if (input.paymentHistory.avgDaysToPayment > 45) {
    recommendations.push(
      createRecommendation({
        type: "payment_terms",
        title: "Consider offering early payment incentives",
        description: `${input.clientName} typically pays after ${Math.round(input.paymentHistory.avgDaysToPayment)} days. An early payment incentive could potentially improve cash flow.`,
        priority: "medium",
        actions: [
          "Consider offering a small discount for early payment",
          "You could add early payment terms to future invoices",
          "Optionally communicate available payment incentives",
        ],
        reasoning:
          "Early payment discounts have been shown to potentially reduce payment times",
        confidence: 0.7,
      })
    );
  }

  // Cash flow recommendations for large outstanding amounts
  if (input.totalOutstanding > 50000 * 100) {
    // $50,000 in cents
    recommendations.push(
      createRecommendation({
        type: "cash_flow",
        title: "Consider addressing concentration risk",
        description: `${input.clientName} has a significant outstanding balance ($${(input.totalOutstanding / 100).toLocaleString()}). You could consider monitoring this closely.`,
        priority: "high",
        actions: [
          "Consider setting up a payment milestone plan",
          "You could increase collection touchpoint frequency",
          "Optionally review client credit limits",
          "Consider consulting a financial advisor about invoice factoring",
        ],
        reasoning:
          "Large outstanding balances from single clients can create cash flow concentration risk",
        confidence: 0.78,
      })
    );
  }

  return recommendations;
}

// AI-enhanced recommendations using Gemini
// Uses "could do" framing for legal compliance - suggestions are educational, not advisory
export async function generateAIRecommendations(
  input: RecommendationInput
): Promise<Recommendation[]> {
  const apiKey = process.env.GOOGLE_AI_API_KEY;

  if (!apiKey) {
    return generateRuleBasedRecommendations(input);
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `You are an educational cash flow analysis assistant helping business owners understand their data patterns. Your role is to present possibilities and educational insights, NOT to give directive advice.

CRITICAL LANGUAGE REQUIREMENTS:
- ALWAYS use "could", "might", "consider", "potential" instead of "should", "must", "need to", "have to"
- Frame all suggestions as possibilities: "You could consider..." not "You should..."
- Use hedging language: "Based on the data, one approach could be..."
- Include confidence indicators for each recommendation
- Never give directive financial or legal advice
- Remind users to consult professionals for major decisions

Client Data:
- Client: ${input.clientName}
- Payment Score: ${input.clientScore}/100
- Current Invoice: $${(input.invoiceAmount / 100).toFixed(2)} (${input.daysPastDue} days past due)
- Total Outstanding: $${(input.totalOutstanding / 100).toFixed(2)}
- Average Days to Payment: ${Math.round(input.paymentHistory.avgDaysToPayment)}
- Late Payment Rate: ${Math.round(input.paymentHistory.latePaymentRate * 100)}%
- Total Paid Historically: $${(input.paymentHistory.totalPaid / 100).toFixed(2)}

Based on this data, provide 2-3 educational insights as possibilities to consider. Format as JSON:
{
  "recommendations": [
    {
      "type": "collection_strategy" | "payment_terms" | "client_risk" | "cash_flow",
      "title": "Brief title using 'Consider...' or 'Potential...' framing",
      "description": "Description using 'could', 'might', 'potential' language. Never directive.",
      "priority": "low" | "medium" | "high" | "critical",
      "actions": ["Consider action 1", "You could action 2", "Optionally action 3"],
      "reasoning": "Data-based reasoning for why this could be relevant",
      "confidence": 0.0-1.0
    }
  ]
}

Remember: These are educational insights showing POSSIBILITIES, not advice. The business owner makes their own decisions. Return ONLY valid JSON, no other text.`;

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

    // Extract JSON from response
    const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      logger.warn("[CashFlow AI] Failed to extract JSON from AI response");
      return generateRuleBasedRecommendations(input);
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Validate the parsed response structure
    if (!parsed.recommendations || !Array.isArray(parsed.recommendations)) {
      console.warn(
        "[CashFlow AI] Invalid AI response structure - missing recommendations array"
      );
      return generateRuleBasedRecommendations(input);
    }

    // Validate and sanitize each recommendation
    const validTypes = [
      "collection_strategy",
      "payment_terms",
      "client_risk",
      "cash_flow",
    ];
    const validPriorities = ["low", "medium", "high", "critical"];

    const validatedRecommendations: Recommendation[] = parsed.recommendations
      .filter((rec: unknown): rec is Record<string, unknown> => {
        if (typeof rec !== "object" || rec === null) return false;
        const r = rec as Record<string, unknown>;
        return (
          typeof r.type === "string" &&
          typeof r.title === "string" &&
          typeof r.description === "string" &&
          typeof r.priority === "string" &&
          Array.isArray(r.actions) &&
          typeof r.reasoning === "string" &&
          typeof r.confidence === "number"
        );
      })
      .map((rec: Record<string, unknown>) => {
        const confidence = Math.min(Math.max(Number(rec.confidence), 0), 1);
        const confidenceInfo = getConfidenceInfo(confidence);

        return {
          type: validTypes.includes(rec.type as string)
            ? (rec.type as Recommendation["type"])
            : "collection_strategy",
          title: String(rec.title).slice(0, 200),
          description: String(rec.description).slice(0, 1000),
          priority: validPriorities.includes(rec.priority as string)
            ? (rec.priority as Recommendation["priority"])
            : "medium",
          actions: (rec.actions as unknown[])
            .filter((a): a is string => typeof a === "string")
            .slice(0, 10)
            .map((a) => a.slice(0, 200)),
          reasoning: String(rec.reasoning).slice(0, 500),
          confidence,
          // Add legal compliance fields
          disclaimer: getDisclaimer("recommendation", "short"),
          confidenceLevel: confidenceInfo.level,
          isEducational: true,
        };
      });

    if (validatedRecommendations.length === 0) {
      logger.warn("[CashFlow AI] No valid recommendations after validation");
      return generateRuleBasedRecommendations(input);
    }

    return validatedRecommendations;
  } catch (error) {
    logger.error("[CashFlow AI] Error generating AI recommendations:", error);
    return generateRuleBasedRecommendations(input);
  }
}

// Export for use in legal compliance checks
export { SUGGESTIVE_LANGUAGE };
