// Cash Flow AI tier definitions and feature gating
// Free → AR Agent (8%) → Pro ($79/mo + 8%)

export type CashFlowTier = "free" | "ar_agent" | "pro";

export const CASHFLOW_TIER_FEATURES: Record<CashFlowTier, string[]> = {
  free: [
    "basic_dashboard",
    "invoice_tracking",
    "health_score",
    "simple_alerts",
  ],
  ar_agent: [
    "basic_dashboard",
    "invoice_tracking",
    "health_score",
    "simple_alerts",
    "ar_followups",
    "payment_reminders",
    "client_scoring",
    "recovery_scoring",
    "escalation_workflows",
  ],
  pro: [
    "basic_dashboard",
    "invoice_tracking",
    "health_score",
    "simple_alerts",
    "ar_followups",
    "payment_reminders",
    "client_scoring",
    "recovery_scoring",
    "escalation_workflows",
    "forecasting_30_60_90",
    "cash_gap_detection",
    "seasonal_analysis",
    "industry_benchmarks",
    "ai_recommendations",
    "economic_indicators",
    "communication_effectiveness",
    "unlimited_invoices",
  ],
};

export function hasFeature(tier: CashFlowTier, feature: string): boolean {
  return CASHFLOW_TIER_FEATURES[tier].includes(feature);
}

export function determineCashFlowTier(subscriptions: Array<{ plan: string; status: string }>): CashFlowTier {
  const active = subscriptions.filter(
    (s) => s.status === "active" || s.status === "trialing"
  );

  if (active.some((s) => s.plan === "cashflow_pro" || s.plan === "full_suite" || s.plan === "enterprise_suite")) {
    return "pro";
  }

  if (active.some((s) => s.plan === "cashflow_ar" || s.plan === "growth_bundle")) {
    return "ar_agent";
  }

  // Any active subscription gives at least free tier Cash Flow access
  if (active.length > 0) {
    return "free";
  }

  return "free";
}

// Invoice limit per tier
export function getInvoiceLimit(tier: CashFlowTier): number | null {
  switch (tier) {
    case "free":
      return 50;
    case "ar_agent":
      return 500;
    case "pro":
      return null; // unlimited
  }
}
