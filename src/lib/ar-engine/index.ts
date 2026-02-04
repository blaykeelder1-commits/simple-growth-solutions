// AR Engine - Smart Accounts Receivable Automation
// "Press a button and let the system work your invoices"

export * from './types';
export * from './analyzer';
export * from './action-plan';
export * from './outreach';
export * from './monitor';

// Main entry point - Generate and optionally save an action plan
import { generateActionPlan, saveActionPlan, approveActionPlan, getPendingActionPlan } from './action-plan';
import { processScheduledActions } from './outreach';
import { recordPayment, checkPlaidTransactionsForPayments, getSuccessFeeSummary } from './monitor';
import { ActionPlan, AREngineConfig, DEFAULT_AR_CONFIG } from './types';

export class AREngine {
  private organizationId: string;
  private config: AREngineConfig;

  constructor(organizationId: string, config: Partial<AREngineConfig> = {}) {
    this.organizationId = organizationId;
    this.config = { ...DEFAULT_AR_CONFIG, ...config };
  }

  // Generate a new action plan (user reviews before approval)
  async generatePlan(): Promise<ActionPlan> {
    return generateActionPlan(this.organizationId, this.config);
  }

  // Save the plan to database for review
  async savePlan(plan: ActionPlan): Promise<void> {
    return saveActionPlan(plan);
  }

  // Get any pending plan awaiting approval
  async getPendingPlan(): Promise<ActionPlan | null> {
    return getPendingActionPlan(this.organizationId);
  }

  // Approve and activate the plan (starts automation)
  async approvePlan(planId: string, selectedInvoiceIds?: string[]): Promise<void> {
    return approveActionPlan(planId, this.organizationId, selectedInvoiceIds);
  }

  // Process all scheduled outreach (called by cron job)
  async runScheduledOutreach(): Promise<{ processed: number; successful: number; failed: number }> {
    return processScheduledActions();
  }

  // Check for new payments and record them
  async syncPayments(): Promise<number> {
    return checkPlaidTransactionsForPayments(this.organizationId);
  }

  // Get success fee summary
  async getSuccessFees(): Promise<ReturnType<typeof getSuccessFeeSummary>> {
    return getSuccessFeeSummary(this.organizationId);
  }

  // Record a manual payment
  async recordManualPayment(invoiceId: string, amount: number, paymentDate: Date = new Date()) {
    return recordPayment({
      invoiceId,
      amount,
      paymentDate,
      source: 'manual',
    });
  }
}

// Convenience function for quick plan generation
export async function quickAnalyze(organizationId: string): Promise<{
  summary: {
    totalInvoices: number;
    totalAtRisk: number;
    projectedRecovery: number;
    projectedFee: number;
    cashSqueezeAlerts: number;
  };
  plan: ActionPlan;
}> {
  const engine = new AREngine(organizationId);
  const plan = await engine.generatePlan();

  return {
    summary: {
      totalInvoices: plan.totalInvoicesAnalyzed,
      totalAtRisk: plan.totalAmountAtRisk,
      projectedRecovery: plan.projectedRecovery,
      projectedFee: plan.projectedSuccessFee,
      cashSqueezeAlerts: plan.cashSqueezeAlerts.length,
    },
    plan,
  };
}
