// Cash flow forecasting functions

export interface Invoice {
  id: string;
  amount: number;
  amountPaid: number;
  dueDate: Date;
  status: string;
  recoveryLikelihood: number | null;
}

export interface ForecastResult {
  period: "30d" | "60d" | "90d";
  projectedInflow: number;
  projectedOutflow: number;
  netCashFlow: number;
  confidence: number;
  breakdown: {
    highConfidence: number;
    mediumConfidence: number;
    lowConfidence: number;
  };
}

// Calculate projected cash inflow from unpaid invoices
export function forecastInflow(
  invoices: Invoice[],
  daysAhead: number
): {
  total: number;
  highConfidence: number;
  mediumConfidence: number;
  lowConfidence: number;
} {
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + daysAhead);

  let highConfidence = 0;
  let mediumConfidence = 0;
  let lowConfidence = 0;

  const unpaidInvoices = invoices.filter(
    (inv) => inv.status !== "paid" && inv.status !== "written_off"
  );

  for (const invoice of unpaidInvoices) {
    const outstanding = invoice.amount - invoice.amountPaid;
    const dueDate = new Date(invoice.dueDate);
    const likelihood = invoice.recoveryLikelihood || 0.5;

    // Only include if due within the forecast period
    if (dueDate <= endDate) {
      const expectedAmount = outstanding * likelihood;

      if (likelihood >= 0.8) {
        highConfidence += expectedAmount;
      } else if (likelihood >= 0.5) {
        mediumConfidence += expectedAmount;
      } else {
        lowConfidence += expectedAmount;
      }
    }
  }

  return {
    total: highConfidence + mediumConfidence + lowConfidence,
    highConfidence,
    mediumConfidence,
    lowConfidence,
  };
}

// Generate full forecast
export function generateForecast(
  invoices: Invoice[],
  period: "30d" | "60d" | "90d" = "30d"
): ForecastResult {
  const daysMap = { "30d": 30, "60d": 60, "90d": 90 };
  const days = daysMap[period];

  const inflow = forecastInflow(invoices, days);

  // For now, we don't have outflow data - this would come from AP integration
  const projectedOutflow = 0;

  // Calculate overall confidence
  const totalInflow = inflow.total;
  const confidenceWeighted =
    totalInflow > 0
      ? (inflow.highConfidence * 0.9 +
          inflow.mediumConfidence * 0.6 +
          inflow.lowConfidence * 0.3) /
        totalInflow
      : 0;

  return {
    period,
    projectedInflow: Math.round(inflow.total),
    projectedOutflow,
    netCashFlow: Math.round(inflow.total - projectedOutflow),
    confidence: Math.round(confidenceWeighted * 100) / 100,
    breakdown: {
      highConfidence: Math.round(inflow.highConfidence),
      mediumConfidence: Math.round(inflow.mediumConfidence),
      lowConfidence: Math.round(inflow.lowConfidence),
    },
  };
}

// Calculate cash flow health score
export function calculateHealthScore(
  totalReceivables: number,
  overdueReceivables: number,
  avgDaysOutstanding: number,
  netCashFlow30d: number
): number {
  // Component scores (0-100 each)
  const scores = {
    overdueRatio: 0,
    daysOutstanding: 0,
    cashFlowTrend: 0,
  };

  // Overdue ratio score (lower is better)
  const overdueRatio = totalReceivables > 0 ? overdueReceivables / totalReceivables : 0;
  scores.overdueRatio = Math.max(0, 100 - overdueRatio * 200);

  // Days outstanding score (lower is better)
  if (avgDaysOutstanding <= 30) {
    scores.daysOutstanding = 100;
  } else if (avgDaysOutstanding <= 45) {
    scores.daysOutstanding = 80;
  } else if (avgDaysOutstanding <= 60) {
    scores.daysOutstanding = 60;
  } else if (avgDaysOutstanding <= 90) {
    scores.daysOutstanding = 40;
  } else {
    scores.daysOutstanding = 20;
  }

  // Cash flow trend score
  if (netCashFlow30d > 0) {
    scores.cashFlowTrend = Math.min(100, 60 + netCashFlow30d / 100000);
  } else {
    scores.cashFlowTrend = Math.max(0, 60 + netCashFlow30d / 50000);
  }

  // Weighted average
  const healthScore =
    scores.overdueRatio * 0.4 +
    scores.daysOutstanding * 0.3 +
    scores.cashFlowTrend * 0.3;

  return Math.round(Math.max(0, Math.min(100, healthScore)));
}

// Calculate runway in days
export function calculateRunway(
  cashOnHand: number,
  avgMonthlyBurn: number
): number | null {
  if (avgMonthlyBurn <= 0) return null; // Not burning cash
  if (cashOnHand <= 0) return 0;

  const dailyBurn = avgMonthlyBurn / 30;
  return Math.round(cashOnHand / dailyBurn);
}
