// Subscription Tier Types — aligned with business analysis

export type SubscriptionTier =
  | 'free'
  | 'website_managed'
  | 'website_pro'
  | 'website_premium'
  | 'ar_proactive'
  | 'geo_starter'
  | 'geo_pro'
  | 'geo_enterprise'
  | 'starter_bundle'
  | 'growth_bundle'
  | 'full_suite'
  | 'enterprise_suite';

export interface TierFeatures {
  // Website features
  managedHosting: boolean;
  contentEdits: boolean;
  aiChatbot: boolean;
  seoReports: boolean;
  googleBusinessIntegration: boolean;
  industryFeatures: boolean;

  // AR / Cash Flow features
  cashFlowHealthScore: boolean;
  invoiceTracking: boolean;
  overdueAlerts: boolean;
  arAutomation: boolean;
  proactiveReminders: boolean;
  accountingIntegrations: number;
  advancedForecasting: boolean;

  // GEO (Geoffrey) features
  basicAIChat: boolean;
  unlimitedAIChat: boolean;
  weeklyInsights: boolean;
  dailyInsights: boolean;
  kpiTracking: boolean;
  actionPlans: boolean;
  arCashflowIntegration: boolean;

  // Premium features
  multiLocation: boolean;
  teamAccess: boolean;
  nanoClawAutomation: boolean;
  prioritySupport: boolean;
  competitorAnalysis: boolean;
  industryBenchmarks: boolean;
  unifiedDashboard: boolean;
}

// Helper to define tiers. Unlisted keys default to false/0.
function tier(overrides: Partial<TierFeatures>): TierFeatures {
  return {
    managedHosting: false,
    contentEdits: false,
    aiChatbot: false,
    seoReports: false,
    googleBusinessIntegration: false,
    industryFeatures: false,
    cashFlowHealthScore: false,
    invoiceTracking: false,
    overdueAlerts: false,
    arAutomation: false,
    proactiveReminders: false,
    accountingIntegrations: 0,
    advancedForecasting: false,
    basicAIChat: false,
    unlimitedAIChat: false,
    weeklyInsights: false,
    dailyInsights: false,
    kpiTracking: false,
    actionPlans: false,
    arCashflowIntegration: false,
    multiLocation: false,
    teamAccess: false,
    nanoClawAutomation: false,
    prioritySupport: false,
    competitorAnalysis: false,
    industryBenchmarks: false,
    unifiedDashboard: false,
    ...overrides,
  };
}

export const TIER_FEATURES: Record<SubscriptionTier, TierFeatures> = {
  // Free website — self-managed
  free: tier({
    cashFlowHealthScore: true,
    invoiceTracking: true,
    overdueAlerts: true,
    arAutomation: true,
    basicAIChat: true,
    accountingIntegrations: 1,
  }),

  // ── Website tiers ─────────────────────────────────────────────────────
  website_managed: tier({
    managedHosting: true,
    contentEdits: true,
    cashFlowHealthScore: true,
    invoiceTracking: true,
    overdueAlerts: true,
    arAutomation: true,
    basicAIChat: true,
    accountingIntegrations: 1,
  }),
  website_pro: tier({
    managedHosting: true,
    contentEdits: true,
    aiChatbot: true,
    prioritySupport: true,
    cashFlowHealthScore: true,
    invoiceTracking: true,
    overdueAlerts: true,
    arAutomation: true,
    basicAIChat: true,
    accountingIntegrations: 1,
  }),
  website_premium: tier({
    managedHosting: true,
    contentEdits: true,
    aiChatbot: true,
    seoReports: true,
    googleBusinessIntegration: true,
    industryFeatures: true,
    prioritySupport: true,
    cashFlowHealthScore: true,
    invoiceTracking: true,
    overdueAlerts: true,
    arAutomation: true,
    basicAIChat: true,
    accountingIntegrations: 1,
  }),

  // ── AR / Cash Flow ────────────────────────────────────────────────────
  ar_proactive: tier({
    cashFlowHealthScore: true,
    invoiceTracking: true,
    overdueAlerts: true,
    arAutomation: true,
    proactiveReminders: true,
    advancedForecasting: true,
    basicAIChat: true,
    accountingIntegrations: 2,
  }),

  // ── GEO (Geoffrey) tiers ─────────────────────────────────────────────
  geo_starter: tier({
    basicAIChat: true,
    weeklyInsights: true,
    industryBenchmarks: true,
    cashFlowHealthScore: true,
    invoiceTracking: true,
    overdueAlerts: true,
    arAutomation: true,
    accountingIntegrations: 1,
  }),
  geo_pro: tier({
    basicAIChat: true,
    unlimitedAIChat: true,
    weeklyInsights: true,
    dailyInsights: true,
    kpiTracking: true,
    actionPlans: true,
    arCashflowIntegration: true,
    industryBenchmarks: true,
    advancedForecasting: true,
    competitorAnalysis: true,
    cashFlowHealthScore: true,
    invoiceTracking: true,
    overdueAlerts: true,
    arAutomation: true,
    accountingIntegrations: 2,
  }),
  geo_enterprise: tier({
    basicAIChat: true,
    unlimitedAIChat: true,
    weeklyInsights: true,
    dailyInsights: true,
    kpiTracking: true,
    actionPlans: true,
    arCashflowIntegration: true,
    multiLocation: true,
    teamAccess: true,
    nanoClawAutomation: true,
    prioritySupport: true,
    industryBenchmarks: true,
    advancedForecasting: true,
    competitorAnalysis: true,
    unifiedDashboard: true,
    cashFlowHealthScore: true,
    invoiceTracking: true,
    overdueAlerts: true,
    arAutomation: true,
    accountingIntegrations: 999,
  }),

  // ── Bundles ───────────────────────────────────────────────────────────
  starter_bundle: tier({
    // Managed Website + GEO Starter
    managedHosting: true,
    contentEdits: true,
    basicAIChat: true,
    weeklyInsights: true,
    industryBenchmarks: true,
    cashFlowHealthScore: true,
    invoiceTracking: true,
    overdueAlerts: true,
    arAutomation: true,
    accountingIntegrations: 1,
  }),
  growth_bundle: tier({
    // Managed Pro + AR (8%) + GEO Pro
    managedHosting: true,
    contentEdits: true,
    aiChatbot: true,
    prioritySupport: true,
    basicAIChat: true,
    unlimitedAIChat: true,
    weeklyInsights: true,
    dailyInsights: true,
    kpiTracking: true,
    actionPlans: true,
    arCashflowIntegration: true,
    advancedForecasting: true,
    competitorAnalysis: true,
    industryBenchmarks: true,
    cashFlowHealthScore: true,
    invoiceTracking: true,
    overdueAlerts: true,
    arAutomation: true,
    accountingIntegrations: 2,
  }),
  full_suite: tier({
    // Managed Premium + AR (8%) + GEO Pro
    managedHosting: true,
    contentEdits: true,
    aiChatbot: true,
    seoReports: true,
    googleBusinessIntegration: true,
    industryFeatures: true,
    prioritySupport: true,
    basicAIChat: true,
    unlimitedAIChat: true,
    weeklyInsights: true,
    dailyInsights: true,
    kpiTracking: true,
    actionPlans: true,
    arCashflowIntegration: true,
    advancedForecasting: true,
    competitorAnalysis: true,
    industryBenchmarks: true,
    cashFlowHealthScore: true,
    invoiceTracking: true,
    overdueAlerts: true,
    arAutomation: true,
    accountingIntegrations: 2,
  }),
  enterprise_suite: tier({
    // Managed Premium + AR + GEO Enterprise — everything on
    managedHosting: true,
    contentEdits: true,
    aiChatbot: true,
    seoReports: true,
    googleBusinessIntegration: true,
    industryFeatures: true,
    prioritySupport: true,
    basicAIChat: true,
    unlimitedAIChat: true,
    weeklyInsights: true,
    dailyInsights: true,
    kpiTracking: true,
    actionPlans: true,
    arCashflowIntegration: true,
    multiLocation: true,
    teamAccess: true,
    nanoClawAutomation: true,
    advancedForecasting: true,
    competitorAnalysis: true,
    industryBenchmarks: true,
    unifiedDashboard: true,
    cashFlowHealthScore: true,
    invoiceTracking: true,
    overdueAlerts: true,
    arAutomation: true,
    accountingIntegrations: 999,
  }),
};

export interface TierPricing {
  monthly: number; // in cents
  yearly: number; // in cents (annual price)
  name: string;
  description: string;
  highlighted?: boolean;
}

export const TIER_PRICING: Record<SubscriptionTier, TierPricing> = {
  free: {
    monthly: 0,
    yearly: 0,
    name: 'Free Website',
    description: 'Professional website built at no cost',
  },
  website_managed: {
    monthly: 4900,
    yearly: 47000,
    name: 'Managed Website',
    description: 'Hosting, edits, and maintenance',
  },
  website_pro: {
    monthly: 7900,
    yearly: 76000,
    name: 'Managed Pro',
    description: 'AI chatbot + fast turnaround',
  },
  website_premium: {
    monthly: 12900,
    yearly: 124000,
    name: 'Managed Premium',
    description: 'Full-service with SEO and industry features',
  },
  ar_proactive: {
    monthly: 4900,
    yearly: 47000,
    name: 'Proactive AR',
    description: 'Automated reminders and tracking before overdue',
  },
  geo_starter: {
    monthly: 7900,
    yearly: 76000,
    name: 'GEO Starter',
    description: 'AI business mentor with basic integrations',
  },
  geo_pro: {
    monthly: 14900,
    yearly: 143000,
    name: 'GEO Pro',
    description: 'Full data integration with daily insights',
    highlighted: true,
  },
  geo_enterprise: {
    monthly: 24900,
    yearly: 239000,
    name: 'GEO Enterprise',
    description: 'Automation, multi-location, team access',
  },
  starter_bundle: {
    monthly: 9900,
    yearly: 95000,
    name: 'Starter Bundle',
    description: 'Managed Website + GEO Starter (save 23%)',
  },
  growth_bundle: {
    monthly: 17900,
    yearly: 172000,
    name: 'Growth Bundle',
    description: 'Managed Pro + AR + GEO Pro (save 21%)',
    highlighted: true,
  },
  full_suite: {
    monthly: 22900,
    yearly: 220000,
    name: 'Full Suite',
    description: 'Managed Premium + AR + GEO Pro (save 18%)',
  },
  enterprise_suite: {
    monthly: 29900,
    yearly: 287000,
    name: 'Enterprise Suite',
    description: 'Everything — Premium + AR + GEO Enterprise (save 21%)',
  },
};

// Feature display names for UI
export const FEATURE_LABELS: Record<keyof TierFeatures, string> = {
  managedHosting: 'Managed Hosting & SSL',
  contentEdits: 'Content Edits & Updates',
  aiChatbot: 'AI Chatbot Integration',
  seoReports: 'Monthly SEO Reports',
  googleBusinessIntegration: 'Google Business Integration',
  industryFeatures: 'Industry-Specific Features',
  cashFlowHealthScore: 'Cash Flow Health Score',
  invoiceTracking: 'Invoice Tracking & Management',
  overdueAlerts: 'Overdue Invoice Alerts',
  arAutomation: 'Automated Collections (8%)',
  proactiveReminders: 'Proactive Payment Reminders',
  accountingIntegrations: 'Accounting Integrations',
  advancedForecasting: 'Advanced Cash Flow Forecasting',
  basicAIChat: 'AI Business Chat',
  unlimitedAIChat: 'Unlimited AI Chat',
  weeklyInsights: 'Weekly Insight Reports',
  dailyInsights: 'Daily AI Insights',
  kpiTracking: 'Custom KPI Tracking',
  actionPlans: 'Personalized Action Plans',
  arCashflowIntegration: 'AR & Cash Flow in GEO',
  multiLocation: 'Multi-Location Support',
  teamAccess: 'Team Member Access',
  nanoClawAutomation: 'NanoClaw Automation',
  prioritySupport: 'Priority Support',
  competitorAnalysis: 'Competitor Analysis',
  industryBenchmarks: 'Industry Benchmarks',
  unifiedDashboard: 'Unified Dashboard',
};
