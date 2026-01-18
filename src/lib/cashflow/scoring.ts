// Payment behavior scoring system

export interface PaymentHistory {
  invoiceId: string;
  amount: number;
  dueDate: Date;
  paidDate: Date | null;
  daysLate: number;
}

export interface ClientPaymentProfile {
  clientId: string;
  totalInvoices: number;
  paidInvoices: number;
  avgDaysToPayment: number;
  latePaymentRate: number;
  totalOutstanding: number;
  paymentScore: number;
}

// Calculate payment score based on history (0-100)
export function calculatePaymentScore(history: PaymentHistory[]): number {
  if (history.length === 0) return 50; // Neutral score for new clients

  const weights = {
    onTimeRate: 40,      // Weight for on-time payments
    avgDaysLate: 30,     // Weight for average days late
    recentBehavior: 20,  // Weight for recent payment behavior
    consistency: 10,     // Weight for payment consistency
  };

  // Calculate on-time payment rate
  const paidInvoices = history.filter((h) => h.paidDate !== null);
  const onTimePayments = paidInvoices.filter((h) => h.daysLate <= 0);
  const onTimeRate = paidInvoices.length > 0
    ? (onTimePayments.length / paidInvoices.length) * 100
    : 0;

  // Calculate average days late (for late payments only)
  const latePayments = paidInvoices.filter((h) => h.daysLate > 0);
  const avgDaysLate = latePayments.length > 0
    ? latePayments.reduce((sum, h) => sum + h.daysLate, 0) / latePayments.length
    : 0;

  // Calculate recent behavior score (last 3 payments)
  const recentPayments = [...paidInvoices]
    .sort((a, b) => new Date(b.paidDate!).getTime() - new Date(a.paidDate!).getTime())
    .slice(0, 3);
  const recentOnTime = recentPayments.filter((h) => h.daysLate <= 0);
  const recentScore = recentPayments.length > 0
    ? (recentOnTime.length / recentPayments.length) * 100
    : 50;

  // Calculate consistency (standard deviation of days to payment)
  const daysToPayment = paidInvoices.map((h) => {
    const due = new Date(h.dueDate);
    const paid = new Date(h.paidDate!);
    return Math.floor((paid.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
  });
  const avgDays = daysToPayment.length > 0
    ? daysToPayment.reduce((a, b) => a + b, 0) / daysToPayment.length
    : 0;
  const variance = daysToPayment.length > 0
    ? daysToPayment.reduce((sum, d) => sum + Math.pow(d - avgDays, 2), 0) / daysToPayment.length
    : 0;
  const stdDev = Math.sqrt(variance);
  const consistencyScore = Math.max(0, 100 - stdDev * 5); // Lower std dev = higher score

  // Calculate weighted score
  const daysLateScore = Math.max(0, 100 - avgDaysLate * 2); // Penalize for being late

  const weightedScore =
    (onTimeRate * weights.onTimeRate +
      daysLateScore * weights.avgDaysLate +
      recentScore * weights.recentBehavior +
      consistencyScore * weights.consistency) /
    100;

  return Math.round(Math.max(0, Math.min(100, weightedScore)));
}

// Determine risk level based on score
export function getRiskLevel(score: number): "low" | "medium" | "high" | "critical" {
  if (score >= 80) return "low";
  if (score >= 60) return "medium";
  if (score >= 40) return "high";
  return "critical";
}

// Calculate recovery likelihood for an invoice
export function calculateRecoveryLikelihood(
  invoice: {
    amount: number;
    dueDate: Date;
    daysPastDue: number;
  },
  clientScore: number
): number {
  // Base likelihood from client score
  let likelihood = clientScore / 100;

  // Reduce likelihood based on days past due
  if (invoice.daysPastDue > 0) {
    // Decay factor: likelihood decreases as days past due increases
    const decayFactor = Math.exp(-0.02 * invoice.daysPastDue);
    likelihood *= decayFactor;
  }

  // Adjust for invoice amount (larger amounts may be harder to collect)
  if (invoice.amount > 10000 * 100) { // $10,000 in cents
    likelihood *= 0.9;
  }
  if (invoice.amount > 50000 * 100) { // $50,000 in cents
    likelihood *= 0.85;
  }

  return Math.max(0.05, Math.min(0.99, likelihood));
}

// Predict payment date
export function predictPaymentDate(
  dueDate: Date,
  avgDaysToPayment: number,
  clientScore: number
): Date {
  // Adjust prediction based on client score
  let predictedDays = avgDaysToPayment;

  if (clientScore >= 80) {
    predictedDays = Math.min(avgDaysToPayment, 5); // Good clients pay early
  } else if (clientScore >= 60) {
    predictedDays = avgDaysToPayment;
  } else if (clientScore >= 40) {
    predictedDays = avgDaysToPayment * 1.3; // Add buffer for risky clients
  } else {
    predictedDays = avgDaysToPayment * 1.5 + 14; // High risk - add more buffer
  }

  const predicted = new Date(dueDate);
  predicted.setDate(predicted.getDate() + Math.round(predictedDays));
  return predicted;
}
