// Subscription Tier Types

export type SubscriptionTier = 'free' | 'cashflow_ai' | 'business_chauffeur' | 'enterprise';

export interface TierFeatures {
  // CashFlow AI Features
  cashFlowHealthScore: boolean;
  invoiceTracking: boolean;
  overdueAlerts: boolean;
  basicAIChat: boolean;
  arAutomation: boolean; // The "work my invoices" feature
  accountingIntegrations: number; // Number of integrations allowed (1 for free, unlimited for paid)

  // Business Chauffeur Features (Premium)
  posIntegrations: boolean; // Square, Clover, Toast
  reviewMonitoring: boolean; // Google Business, Yelp
  payrollAnalytics: boolean; // Gusto, ADP
  industryBenchmarks: boolean;
  unlimitedAIChat: boolean;
  unifiedDashboard: boolean;
  prioritySupport: boolean;
  advancedForecasting: boolean;
  competitorAnalysis: boolean;
}

export const TIER_FEATURES: Record<SubscriptionTier, TierFeatures> = {
  free: {
    cashFlowHealthScore: true,
    invoiceTracking: true,
    overdueAlerts: true,
    basicAIChat: true,
    arAutomation: true, // Core feature available to all
    accountingIntegrations: 1,
    posIntegrations: false,
    reviewMonitoring: false,
    payrollAnalytics: false,
    industryBenchmarks: false,
    unlimitedAIChat: false,
    unifiedDashboard: false,
    prioritySupport: false,
    advancedForecasting: false,
    competitorAnalysis: false,
  },
  cashflow_ai: {
    cashFlowHealthScore: true,
    invoiceTracking: true,
    overdueAlerts: true,
    basicAIChat: true,
    arAutomation: true,
    accountingIntegrations: 2, // QuickBooks + Xero
    posIntegrations: false,
    reviewMonitoring: false,
    payrollAnalytics: false,
    industryBenchmarks: true,
    unlimitedAIChat: false,
    unifiedDashboard: false,
    prioritySupport: false,
    advancedForecasting: true,
    competitorAnalysis: false,
  },
  business_chauffeur: {
    cashFlowHealthScore: true,
    invoiceTracking: true,
    overdueAlerts: true,
    basicAIChat: true,
    arAutomation: true,
    accountingIntegrations: 999, // Unlimited
    posIntegrations: true,
    reviewMonitoring: true,
    payrollAnalytics: true,
    industryBenchmarks: true,
    unlimitedAIChat: true,
    unifiedDashboard: true,
    prioritySupport: true,
    advancedForecasting: true,
    competitorAnalysis: true,
  },
  enterprise: {
    cashFlowHealthScore: true,
    invoiceTracking: true,
    overdueAlerts: true,
    basicAIChat: true,
    arAutomation: true,
    accountingIntegrations: 999,
    posIntegrations: true,
    reviewMonitoring: true,
    payrollAnalytics: true,
    industryBenchmarks: true,
    unlimitedAIChat: true,
    unifiedDashboard: true,
    prioritySupport: true,
    advancedForecasting: true,
    competitorAnalysis: true,
  },
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
    name: 'Free',
    description: 'Get started with basic AR automation',
  },
  cashflow_ai: {
    monthly: 4900, // $49/mo
    yearly: 47000, // $470/yr (save ~20%)
    name: 'CashFlow AI Pro',
    description: 'Advanced AR automation with forecasting',
  },
  business_chauffeur: {
    monthly: 14900, // $149/mo
    yearly: 143000, // $1,430/yr (save ~20%)
    name: 'Business Chauffeur',
    description: 'Complete business intelligence suite',
    highlighted: true,
  },
  enterprise: {
    monthly: 0, // Custom pricing
    yearly: 0,
    name: 'Enterprise',
    description: 'Custom solution for larger businesses',
  },
};

// Feature display names for UI
export const FEATURE_LABELS: Record<keyof TierFeatures, string> = {
  cashFlowHealthScore: 'Cash Flow Health Score',
  invoiceTracking: 'Invoice Tracking & Management',
  overdueAlerts: 'Overdue Invoice Alerts',
  basicAIChat: 'AI Business Chat',
  arAutomation: 'Automated Collections',
  accountingIntegrations: 'Accounting Integrations',
  posIntegrations: 'POS Integrations (Square, Clover, Toast)',
  reviewMonitoring: 'Review Monitoring (Google, Yelp)',
  payrollAnalytics: 'Payroll Analytics (Gusto, ADP)',
  industryBenchmarks: 'Industry Benchmarks',
  unlimitedAIChat: 'Unlimited AI Chat',
  unifiedDashboard: 'Unified Dashboard',
  prioritySupport: 'Priority Support',
  advancedForecasting: 'Advanced Forecasting',
  competitorAnalysis: 'Competitor Analysis',
};
