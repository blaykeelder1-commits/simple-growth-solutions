// AI-powered recommendation engine for Cash Flow AI

import Anthropic from "@anthropic-ai/sdk";

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
}

// Rule-based recommendations (fallback)
export function generateRuleBasedRecommendations(
  input: RecommendationInput
): Recommendation[] {
  const recommendations: Recommendation[] = [];

  // Overdue invoice recommendations
  if (input.daysPastDue > 0) {
    if (input.daysPastDue <= 7) {
      recommendations.push({
        type: "collection_strategy",
        title: "Send friendly payment reminder",
        description: `Invoice for ${input.clientName} is ${input.daysPastDue} days past due. A friendly reminder typically resolves early-stage overdue invoices.`,
        priority: "medium",
        actions: [
          "Send automated email reminder",
          "Offer online payment link",
          "Confirm invoice receipt",
        ],
        reasoning: "Early reminders have highest conversion rates",
        confidence: 0.85,
      });
    } else if (input.daysPastDue <= 30) {
      recommendations.push({
        type: "collection_strategy",
        title: "Escalate collection efforts",
        description: `Invoice for ${input.clientName} is ${input.daysPastDue} days overdue. Consider phone follow-up.`,
        priority: "high",
        actions: [
          "Make phone call to accounts payable",
          "Send formal collection notice",
          "Offer payment plan if needed",
        ],
        reasoning: "Phone calls increase collection rates by 50% for 2-4 week overdue invoices",
        confidence: 0.8,
      });
    } else {
      recommendations.push({
        type: "collection_strategy",
        title: "Final notice and escalation review",
        description: `Invoice for ${input.clientName} is significantly overdue (${input.daysPastDue} days). Review for escalation.`,
        priority: "critical",
        actions: [
          "Send final notice letter",
          "Review for collection agency referral",
          "Consider legal options",
          "Document all communication attempts",
        ],
        reasoning: "Long-overdue invoices require formal escalation procedures",
        confidence: 0.75,
      });
    }
  }

  // Client risk recommendations
  if (input.clientScore < 40) {
    recommendations.push({
      type: "client_risk",
      title: "Review payment terms for high-risk client",
      description: `${input.clientName} has a low payment score (${input.clientScore}). Consider requiring upfront payment or shorter terms.`,
      priority: "high",
      actions: [
        "Require deposit for new work",
        "Shorten payment terms to Net 15",
        "Consider credit limit",
        "Document risk assessment",
      ],
      reasoning: `Client has ${Math.round(input.paymentHistory.latePaymentRate * 100)}% late payment rate`,
      confidence: 0.82,
    });
  }

  // Payment terms recommendations
  if (input.paymentHistory.avgDaysToPayment > 45) {
    recommendations.push({
      type: "payment_terms",
      title: "Offer early payment discount",
      description: `${input.clientName} typically pays after ${Math.round(input.paymentHistory.avgDaysToPayment)} days. An early payment incentive could improve cash flow.`,
      priority: "medium",
      actions: [
        "Offer 2% discount for payment within 10 days",
        "Add early payment terms to next invoice",
        "Communicate discount opportunity",
      ],
      reasoning: "Early payment discounts can reduce DSO by 15-20 days",
      confidence: 0.7,
    });
  }

  // Cash flow recommendations for large outstanding amounts
  if (input.totalOutstanding > 50000 * 100) { // $50,000 in cents
    recommendations.push({
      type: "cash_flow",
      title: "Address concentration risk",
      description: `${input.clientName} has significant outstanding balance ($${(input.totalOutstanding / 100).toLocaleString()}). Monitor closely.`,
      priority: "high",
      actions: [
        "Set up payment milestone plan",
        "Increase collection frequency",
        "Review client credit limit",
        "Consider invoice factoring",
      ],
      reasoning: "Large outstanding balances create cash flow risk",
      confidence: 0.78,
    });
  }

  return recommendations;
}

// AI-enhanced recommendations using Claude
export async function generateAIRecommendations(
  input: RecommendationInput
): Promise<Recommendation[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return generateRuleBasedRecommendations(input);
  }

  try {
    const anthropic = new Anthropic({ apiKey });

    const prompt = `You are a cash flow management AI assistant. Analyze this client situation and provide actionable recommendations.

Client: ${input.clientName}
Payment Score: ${input.clientScore}/100
Current Invoice: $${(input.invoiceAmount / 100).toFixed(2)} (${input.daysPastDue} days past due)
Total Outstanding: $${(input.totalOutstanding / 100).toFixed(2)}
Average Days to Payment: ${Math.round(input.paymentHistory.avgDaysToPayment)}
Late Payment Rate: ${Math.round(input.paymentHistory.latePaymentRate * 100)}%
Total Paid Historically: $${(input.paymentHistory.totalPaid / 100).toFixed(2)}

Based on this data, provide 2-3 specific, actionable recommendations in JSON format:
{
  "recommendations": [
    {
      "type": "collection_strategy" | "payment_terms" | "client_risk" | "cash_flow",
      "title": "Brief title",
      "description": "Detailed description",
      "priority": "low" | "medium" | "high" | "critical",
      "actions": ["Action 1", "Action 2", "Action 3"],
      "reasoning": "Why this recommendation",
      "confidence": 0.0-1.0
    }
  ]
}

Focus on practical, business-appropriate advice. Be specific about timing and amounts where relevant.`;

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });

    const content = response.content[0];
    if (content.type !== "text") {
      return generateRuleBasedRecommendations(input);
    }

    // Extract JSON from response
    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.warn("[CashFlow AI] Failed to extract JSON from AI response");
      return generateRuleBasedRecommendations(input);
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Validate the parsed response structure
    if (!parsed.recommendations || !Array.isArray(parsed.recommendations)) {
      console.warn("[CashFlow AI] Invalid AI response structure - missing recommendations array");
      return generateRuleBasedRecommendations(input);
    }

    // Validate and sanitize each recommendation
    const validTypes = ["collection_strategy", "payment_terms", "client_risk", "cash_flow"];
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
      .map((rec: Record<string, unknown>) => ({
        type: validTypes.includes(rec.type as string)
          ? (rec.type as Recommendation["type"])
          : "collection_strategy",
        title: String(rec.title).slice(0, 200), // Limit title length
        description: String(rec.description).slice(0, 1000), // Limit description length
        priority: validPriorities.includes(rec.priority as string)
          ? (rec.priority as Recommendation["priority"])
          : "medium",
        actions: (rec.actions as unknown[])
          .filter((a): a is string => typeof a === "string")
          .slice(0, 10) // Limit actions count
          .map((a) => a.slice(0, 200)), // Limit action length
        reasoning: String(rec.reasoning).slice(0, 500),
        confidence: Math.min(Math.max(Number(rec.confidence), 0), 1),
      }));

    if (validatedRecommendations.length === 0) {
      console.warn("[CashFlow AI] No valid recommendations after validation");
      return generateRuleBasedRecommendations(input);
    }

    return validatedRecommendations;
  } catch (error) {
    console.error("[CashFlow AI] Error generating AI recommendations:", error);
    return generateRuleBasedRecommendations(input);
  }
}
