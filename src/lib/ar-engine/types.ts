// AR Engine Type Definitions
// Smart Accounts Receivable Automation System

export type InvoiceRisk = 'low' | 'medium' | 'high' | 'critical';
export type ActionType = 'email' | 'sms' | 'call' | 'payment_link' | 'discount_offer' | 'payment_plan';
export type ActionStatus = 'pending' | 'approved' | 'in_progress' | 'completed' | 'skipped';
export type OutreachTone = 'friendly' | 'reminder' | 'urgent' | 'final';

// Invoice analysis result
export interface InvoiceAnalysis {
  invoiceId: string;
  clientId: string;
  clientName: string;
  clientEmail: string | null;
  clientPhone: string | null;
  amount: number; // in cents
  amountPaid: number;
  amountDue: number;
  dueDate: Date;
  daysOverdue: number;
  daysToDue: number; // negative if overdue
  riskLevel: InvoiceRisk;
  recoveryLikelihood: number; // 0-1
  predictedPaymentDate: Date | null;

  // Client behavior insights
  clientPaymentScore: number; // 0-100
  clientAvgDaysToPayment: number;
  clientPreferredPaymentMethod: string | null;
  clientBestContactDay: string | null;
  clientBestContactHour: number | null;

  // Recommended strategy
  recommendedActions: RecommendedAction[];
  urgencyScore: number; // 0-100
}

// Action recommendation
export interface RecommendedAction {
  type: ActionType;
  priority: number; // 1-10, higher = more important
  scheduledFor: Date;
  message: string;
  incentive?: IncentiveOffer;
  reasoning: string;
  expectedResponseRate: number; // 0-1
}

// Incentive offer (discount, payment plan)
export interface IncentiveOffer {
  type: 'early_pay_discount' | 'payment_plan' | 'deposit_request';
  discountPercent?: number;
  discountAmount?: number; // in cents
  paymentPlanMonths?: number;
  paymentPlanAmount?: number; // monthly amount in cents
  depositPercent?: number;
  expiresAt: Date;
  reason: string;
}

// Cash squeeze detection
export interface CashSqueezeAlert {
  type: 'invoice_clustering' | 'revenue_gap' | 'expense_spike' | 'low_runway';
  severity: 'warning' | 'critical';
  date: Date;
  description: string;
  projectedShortfall: number; // in cents

  // Recommended fixes
  recommendations: CashSqueezeRecommendation[];
}

export interface CashSqueezeRecommendation {
  action: string;
  potentialImpact: number; // in cents
  targetInvoices?: string[]; // invoice IDs to incentivize
  incentiveType?: 'early_pay_discount' | 'deposit_request';
  discountPercent?: number;
  reasoning: string;
}

// Full action plan for an organization
export interface ActionPlan {
  id: string;
  organizationId: string;
  createdAt: Date;
  status: 'draft' | 'pending_approval' | 'approved' | 'in_progress' | 'completed';

  // Summary
  totalInvoicesAnalyzed: number;
  totalAmountAtRisk: number; // in cents
  projectedRecovery: number; // in cents
  projectedSuccessFee: number; // 8% of recovered

  // Invoices to work
  invoiceActions: InvoiceActionPlan[];

  // Cash squeeze alerts
  cashSqueezeAlerts: CashSqueezeAlert[];

  // Proactive measures
  proactiveMeasures: ProactiveMeasure[];
}

export interface InvoiceActionPlan {
  invoiceId: string;
  analysis: InvoiceAnalysis;
  actions: ScheduledAction[];
  status: ActionStatus;
  approvedAt?: Date;
  completedAt?: Date;
  recoveredAmount?: number;
}

export interface ScheduledAction {
  id: string;
  type: ActionType;
  scheduledFor: Date;
  status: 'scheduled' | 'sent' | 'delivered' | 'opened' | 'clicked' | 'responded' | 'failed';
  content: OutreachContent;
  incentive?: IncentiveOffer;
  result?: ActionResult;
}

export interface OutreachContent {
  subject?: string; // for email
  body: string;
  paymentLink?: string;
  tone: OutreachTone;
}

export interface ActionResult {
  sentAt: Date;
  deliveredAt?: Date;
  openedAt?: Date;
  clickedAt?: Date;
  respondedAt?: Date;
  response?: string;
  paymentReceived?: boolean;
  paymentAmount?: number;
}

// Proactive measure to avoid cash squeeze
export interface ProactiveMeasure {
  type: 'incentivize_early_payment' | 'request_deposit' | 'accelerate_billing';
  targetInvoices: string[];
  description: string;
  incentive?: IncentiveOffer;
  projectedImpact: number; // in cents
  status: ActionStatus;
}

// Spending pattern for cash flow awareness
export interface SpendingPattern {
  category: string;
  avgMonthlyAmount: number; // in cents
  typicalDayOfMonth: number[];
  isRecurring: boolean;
  priority: 'essential' | 'important' | 'discretionary';
}

// Success fee tracking
export interface SuccessFee {
  invoiceId: string;
  recoveredAmount: number; // in cents
  feePercentage: number; // 0.08 = 8%
  feeAmount: number; // in cents
  attributedTo: 'email' | 'sms' | 'call' | 'payment_link' | 'discount' | 'payment_plan' | 'organic';
  recoveredAt: Date;
  status: 'pending' | 'invoiced' | 'collected';
}

// Configuration
export interface AREngineConfig {
  // Outreach settings
  maxEmailsPerDay: number;
  maxSMSPerDay: number;
  minDaysBetweenContacts: number;

  // Incentive limits
  maxDiscountPercent: number;
  maxPaymentPlanMonths: number;

  // Thresholds
  overdueAlertDays: number;
  cashSqueezeWindowDays: number;
  minimumRunwayDays: number;

  // Success fee
  successFeePercent: number;
}

export const DEFAULT_AR_CONFIG: AREngineConfig = {
  maxEmailsPerDay: 50,
  maxSMSPerDay: 20,
  minDaysBetweenContacts: 3,
  maxDiscountPercent: 10,
  maxPaymentPlanMonths: 6,
  overdueAlertDays: 7,
  cashSqueezeWindowDays: 30,
  minimumRunwayDays: 14,
  successFeePercent: 0.08, // 8%
};
