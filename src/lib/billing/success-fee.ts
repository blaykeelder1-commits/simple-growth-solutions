import { prisma } from "@/lib/prisma";

const SUCCESS_FEE_RATE = 0.08; // 8%
const OVERDUE_THRESHOLD_DAYS = 14; // Only charge on invoices past 14 days

/**
 * Calculate the success fee owed for a recovered invoice.
 * Only applies to invoices that were past the threshold (14 days) when collected.
 * All amounts in cents.
 */
export function calculateSuccessFee(
  invoiceAmountCents: number,
  daysOverdue: number
): { feeApplies: boolean; feeAmountCents: number; feeRate: number } {
  if (daysOverdue < OVERDUE_THRESHOLD_DAYS) {
    return { feeApplies: false, feeAmountCents: 0, feeRate: 0 };
  }

  const feeAmountCents = Math.round(invoiceAmountCents * SUCCESS_FEE_RATE);

  return {
    feeApplies: true,
    feeAmountCents,
    feeRate: SUCCESS_FEE_RATE,
  };
}

/**
 * Record a success fee when an overdue invoice is collected.
 * Creates a SuccessFeeBilling record linked to the subscription.
 * Amounts in cents.
 */
export async function recordSuccessFee(params: {
  subscriptionId: string;
  invoiceId: string;
  recoveredAmountCents: number;
  daysOverdue: number;
}) {
  const { subscriptionId, invoiceId, recoveredAmountCents, daysOverdue } = params;

  const { feeApplies, feeAmountCents } = calculateSuccessFee(
    recoveredAmountCents,
    daysOverdue
  );

  if (!feeApplies) return null;

  const record = await prisma.successFeeBilling.create({
    data: {
      subscriptionId,
      invoiceId,
      recoveredAmount: recoveredAmountCents,
      feePercentage: SUCCESS_FEE_RATE,
      feeAmount: feeAmountCents,
      status: "pending",
    },
  });

  return record;
}

/**
 * Get total pending success fees for a subscription (for billing summary).
 */
export async function getPendingSuccessFees(subscriptionId: string) {
  const pending = await prisma.successFeeBilling.findMany({
    where: {
      subscriptionId,
      status: "pending",
    },
  });

  const totalFeeCents = pending.reduce((sum, fee) => sum + fee.feeAmount, 0);

  return {
    count: pending.length,
    totalFeeCents,
    totalFeeDollars: totalFeeCents / 100,
    records: pending,
  };
}

/**
 * Get success fee summary for an organization across all subscriptions.
 */
export async function getOrgSuccessFeeSummary(organizationId: string) {
  const subscriptions = await prisma.subscription.findMany({
    where: { organizationId },
    select: { id: true },
  });

  const subIds = subscriptions.map((s) => s.id);

  const [pending, paid] = await Promise.all([
    prisma.successFeeBilling.aggregate({
      where: { subscriptionId: { in: subIds }, status: "pending" },
      _sum: { feeAmount: true },
      _count: true,
    }),
    prisma.successFeeBilling.aggregate({
      where: { subscriptionId: { in: subIds }, status: "paid" },
      _sum: { feeAmount: true, recoveredAmount: true },
      _count: true,
    }),
  ]);

  return {
    pendingFeeCents: pending._sum.feeAmount ?? 0,
    pendingCount: pending._count,
    paidFeeCents: paid._sum.feeAmount ?? 0,
    totalRecoveredCents: paid._sum.recoveredAmount ?? 0,
    paidCount: paid._count,
  };
}
