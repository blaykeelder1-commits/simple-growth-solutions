/**
 * Shared types for the Cashflow AI scoring and forecasting engine
 */

// ============================================================================
// Core Entity Types
// ============================================================================

export interface Client {
  id: string;
  name: string;
  email: string;
  phone?: string;
  createdAt: Date;
  invoices: Invoice[];
  payments: Payment[];
  lastContactDate?: Date;
}

export interface Invoice {
  id: string;
  clientId: string;
  amount: number;
  dueDate: Date;
  issueDate: Date;
  status: InvoiceStatus;
  paidAmount: number;
  paidDate?: Date;
  paymentTermDays: number;
}

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'partial' | 'overdue' | 'cancelled';

export interface Payment {
  id: string;
  invoiceId: string;
  clientId: string;
  amount: number;
  paidDate: Date;
  daysFromDue: number; // negative = early, positive = late
}

export interface CashTransaction {
  id: string;
  date: Date;
  amount: number;
  type: 'inflow' | 'outflow';
  category: string;
  description?: string;
}

// ============================================================================
// Scoring Types
// ============================================================================

export type ClientTier = 'A' | 'B' | 'C' | 'D';

export interface PaymentBehaviorScore {
  clientId: string;
  score: number; // 0-100
  tier: ClientTier;
  factors: PaymentBehaviorFactors;
  calculatedAt: Date;
}

export interface PaymentBehaviorFactors {
  onTimeRate: number; // 0-100, weighted 40%
  avgDaysToPay: number; // actual days
  avgDaysVariance: number; // consistency measure
  relationshipLengthDays: number;
  totalInvoices: number;
  totalPayments: number;
}

export interface RecoveryLikelihood {
  invoiceId: string;
  clientId: string;
  score: number; // 0-100
  probability: number; // 0-1
  factors: RecoveryFactors;
  calculatedAt: Date;
}

export interface RecoveryFactors {
  baseScore: number;
  overdueDays: number;
  overduePenalty: number;
  hasPartialPayment: boolean;
  partialPaymentBonus: number;
  recentContact: boolean;
  contactBonus: number;
  clientTier: ClientTier;
}

// ============================================================================
// Forecast Types
// ============================================================================

export interface CashFlowForecast {
  generatedAt: Date;
  currentBalance: number;
  projections: DailyProjection[];
  summary: ForecastSummary;
}

export interface DailyProjection {
  date: Date;
  projectedInflows: number;
  projectedOutflows: number;
  netCashFlow: number;
  runningBalance: number;
  confidence: number; // 0-1
  invoicesExpected: ExpectedInvoicePayment[];
}

export interface ExpectedInvoicePayment {
  invoiceId: string;
  clientId: string;
  amount: number;
  probability: number;
  expectedDate: Date;
}

export interface ForecastSummary {
  period7Day: PeriodSummary;
  period14Day: PeriodSummary;
  period30Day: PeriodSummary;
}

export interface PeriodSummary {
  totalExpectedInflows: number;
  totalExpectedOutflows: number;
  netCashFlow: number;
  endingBalance: number;
  lowestBalance: number;
  lowestBalanceDate: Date;
  avgConfidence: number;
}

export interface CashGap {
  id: string;
  startDate: Date;
  endDate: Date;
  durationDays: number;
  lowestBalance: number;
  gapAmount: number; // how much below threshold
  severity: GapSeverity;
  recommendations: string[];
}

export type GapSeverity = 'low' | 'medium' | 'high' | 'critical';

// ============================================================================
// Follow-up Types
// ============================================================================

export type FollowUpTone = 'friendly' | 'professional' | 'firm' | 'urgent';
export type FollowUpAction = 'email' | 'call' | 'sms' | 'escalate' | 'legal';

export interface FollowUpRecommendation {
  invoiceId: string;
  clientId: string;
  priority: number; // 1-10, higher = more urgent
  recommendedDate: Date;
  tone: FollowUpTone;
  action: FollowUpAction;
  suggestedMessage: string;
  reasoning: string;
  factors: FollowUpFactors;
}

export interface FollowUpFactors {
  daysOverdue: number;
  clientTier: ClientTier;
  invoiceAmount: number;
  previousFollowUps: number;
  daysSinceLastContact: number;
  hasPartialPayment: boolean;
  recoveryLikelihood: number;
}

// ============================================================================
// AI Insight Types
// ============================================================================

export interface AIInsight {
  id: string;
  type: InsightType;
  title: string;
  summary: string;
  details: string;
  priority: 'low' | 'medium' | 'high';
  actionable: boolean;
  suggestedActions: string[];
  relatedEntityIds: string[];
  generatedAt: Date;
}

export type InsightType =
  | 'cash_flow_warning'
  | 'payment_pattern'
  | 'client_risk'
  | 'collection_opportunity'
  | 'forecast_update'
  | 'trend_analysis';

export interface ClientRecommendation {
  clientId: string;
  clientName: string;
  tier: ClientTier;
  paymentScore: number;
  overdueInvoices: OverdueInvoiceSummary[];
  totalOverdueAmount: number;
  recommendedActions: FollowUpRecommendation[];
  insights: AIInsight[];
  riskLevel: 'low' | 'medium' | 'high';
}

export interface OverdueInvoiceSummary {
  invoiceId: string;
  amount: number;
  daysOverdue: number;
  recoveryLikelihood: number;
}

// ============================================================================
// Dashboard Aggregate Types
// ============================================================================

export interface DashboardMetrics {
  totalOutstanding: number;
  totalOverdue: number;
  overdueCount: number;
  avgDaysOverdue: number;
  expectedCollections7Day: number;
  expectedCollections30Day: number;
  cashGapsDetected: number;
  highRiskClients: number;
  topPriorityFollowUps: FollowUpRecommendation[];
}
