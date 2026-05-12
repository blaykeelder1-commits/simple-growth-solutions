/**
 * Batch Scoring Operations
 *
 * Functions for bulk recalculation and updating of payment behavior scores.
 * Used for scheduled jobs and organization-wide score updates.
 */

import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import type { Client, Invoice, Payment, PaymentBehaviorScore } from './types';
import { calculatePaymentBehaviorScore } from './payment-behavior';
import {
  batchUpdateScores,
  getClientsWithStaleScores,
} from './behavior-persistence';

/**
 * Result of a batch scoring operation
 */
export interface BatchScoringResult {
  organizationId: string;
  totalClients: number;
  clientsProcessed: number;
  clientsUpdated: number;
  clientsFailed: number;
  averageScore: number;
  duration: number; // milliseconds
  errors: string[];
  completedAt: Date;
}

/**
 * Recalculate all payment behavior scores for an organization
 */
export async function recalculateAllScores(
  organizationId: string
): Promise<BatchScoringResult> {
  const startTime = Date.now();
  const errors: string[] = [];

  // Fetch all clients with their invoices and payments
  const dbClients = await prisma.client.findMany({
    where: { organizationId },
    include: {
      invoices: {
        include: {
          payments: true,
        },
      },
    },
  });

  const scores = new Map<string, PaymentBehaviorScore>();
  let totalScore = 0;

  // Calculate scores for each client
  for (const dbClient of dbClients) {
    try {
      const client = convertToScoringClient(dbClient);
      const score = calculatePaymentBehaviorScore(client);
      scores.set(dbClient.id, score);
      totalScore += score.score;
    } catch (error) {
      errors.push(`Failed to score client ${dbClient.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Batch update all scores
  const { updated, failed } = await batchUpdateScores(organizationId, scores);

  return {
    organizationId,
    totalClients: dbClients.length,
    clientsProcessed: scores.size,
    clientsUpdated: updated,
    clientsFailed: failed,
    averageScore: scores.size > 0 ? totalScore / scores.size : 0,
    duration: Date.now() - startTime,
    errors,
    completedAt: new Date(),
  };
}

/**
 * Recalculate scores only for clients with stale data
 */
export async function recalculateStaleScores(
  organizationId: string,
  maxAgeDays: number = 7
): Promise<BatchScoringResult> {
  const startTime = Date.now();
  const errors: string[] = [];

  // Get clients needing updates
  const staleClientIds = await getClientsWithStaleScores(organizationId, maxAgeDays);

  if (staleClientIds.length === 0) {
    return {
      organizationId,
      totalClients: 0,
      clientsProcessed: 0,
      clientsUpdated: 0,
      clientsFailed: 0,
      averageScore: 0,
      duration: Date.now() - startTime,
      errors: [],
      completedAt: new Date(),
    };
  }

  // Fetch stale clients with their data
  const dbClients = await prisma.client.findMany({
    where: {
      id: { in: staleClientIds },
      organizationId,
    },
    include: {
      invoices: {
        include: {
          payments: true,
        },
      },
    },
  });

  const scores = new Map<string, PaymentBehaviorScore>();
  let totalScore = 0;

  // Calculate scores for each client
  for (const dbClient of dbClients) {
    try {
      const client = convertToScoringClient(dbClient);
      const score = calculatePaymentBehaviorScore(client);
      scores.set(dbClient.id, score);
      totalScore += score.score;
    } catch (error) {
      errors.push(`Failed to score client ${dbClient.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Batch update scores
  const { updated, failed } = await batchUpdateScores(organizationId, scores);

  return {
    organizationId,
    totalClients: staleClientIds.length,
    clientsProcessed: scores.size,
    clientsUpdated: updated,
    clientsFailed: failed,
    averageScore: scores.size > 0 ? totalScore / scores.size : 0,
    duration: Date.now() - startTime,
    errors,
    completedAt: new Date(),
  };
}

/**
 * Recalculate score for a single client
 */
export async function recalculateSingleClientScore(
  clientId: string,
  organizationId: string
): Promise<PaymentBehaviorScore | null> {
  const dbClient = await prisma.client.findFirst({
    where: { id: clientId, organizationId },
    include: {
      invoices: {
        include: {
          payments: true,
        },
      },
    },
  });

  if (!dbClient) {
    return null;
  }

  const client = convertToScoringClient(dbClient);
  const score = calculatePaymentBehaviorScore(client);

  // Update in database
  await prisma.client.update({
    where: { id: clientId },
    data: {
      paymentScore: Math.round(score.score),
      paymentBehaviorTier: score.tier,
      avgDaysToPayment: score.factors.avgDaysToPay,
    },
  });

  return score;
}

/**
 * Update client totals from their invoices
 */
export async function updateClientTotals(clientId: string, organizationId: string): Promise<void> {
  const invoices = await prisma.invoice.findMany({
    where: { clientId, organizationId },
    select: {
      amount: true,
      amountPaid: true,
    },
  });

  const totalInvoiced = invoices.reduce((sum, inv) => sum + Number(inv.amount), 0);
  const totalPaid = invoices.reduce((sum, inv) => sum + Number(inv.amountPaid), 0);
  const totalOutstanding = totalInvoiced - totalPaid;

  await prisma.client.update({
    where: { id: clientId },
    data: {
      totalInvoiced,
      totalPaid,
      totalOutstanding,
    },
  });
}

/**
 * Update all client totals in an organization
 */
export async function updateAllClientTotals(
  organizationId: string
): Promise<{ updated: number }> {
  const clients = await prisma.client.findMany({
    where: { organizationId },
    select: { id: true },
  });

  for (const client of clients) {
    await updateClientTotals(client.id, organizationId);
  }

  return { updated: clients.length };
}

const MS_PER_DAY = 1000 * 60 * 60 * 24;

/**
 * Convert database client to scoring Client type
 *
 * The DB Payment row has `paidAt` and no precomputed `daysFromDue`; we derive
 * `daysFromDue` from `paidAt - invoice.dueDate` so the scoring algorithm
 * (which weights timeliness) gets a real signal.
 */
function convertToScoringClient(dbClient: {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  createdAt: Date;
  invoices: Array<{
    id: string;
    clientId: string | null;
    amount: Prisma.Decimal | number;
    dueDate: Date;
    issueDate: Date;
    status: string;
    amountPaid: Prisma.Decimal | number;
    paidDate: Date | null;
    payments: Array<{
      id: string;
      invoiceId: string;
      amount: Prisma.Decimal | number;
      paidAt: Date;
    }>;
  }>;
}): Client {
  const allPayments: Payment[] = [];

  const invoices: Invoice[] = dbClient.invoices.map(inv => {
    for (const p of inv.payments) {
      const daysFromDue = Math.round(
        (p.paidAt.getTime() - inv.dueDate.getTime()) / MS_PER_DAY
      );
      allPayments.push({
        id: p.id,
        invoiceId: p.invoiceId,
        clientId: dbClient.id,
        amount: Number(p.amount),
        paidDate: p.paidAt,
        daysFromDue,
      });
    }

    return {
      id: inv.id,
      clientId: dbClient.id,
      amount: Number(inv.amount),
      dueDate: inv.dueDate,
      issueDate: inv.issueDate,
      status: inv.status as Invoice['status'],
      paidAmount: Number(inv.amountPaid),
      paidDate: inv.paidDate ?? undefined,
      paymentTermDays: Math.round(
        (inv.dueDate.getTime() - inv.issueDate.getTime()) / MS_PER_DAY
      ),
    };
  });

  return {
    id: dbClient.id,
    name: dbClient.name,
    email: dbClient.email ?? '',
    phone: dbClient.phone ?? undefined,
    createdAt: dbClient.createdAt,
    invoices,
    payments: allPayments,
    lastContactDate: undefined,
  };
}
