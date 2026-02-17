// Cash Flow Recommendations API
// GET: Fetch AI-powered recommendations for all clients

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { generateAIRecommendations, Recommendation, RecommendationInput } from '@/lib/cashflow/recommendations';
import { withAuth } from '@/lib/api/with-auth';
import { apiError } from '@/lib/api/errors';

export const GET = withAuth(async (_req, _ctx, session) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    const organizationId = user?.organizationId;

    if (!organizationId) {
      return NextResponse.json({
        success: true,
        recommendations: [],
        totalClients: 0,
        totalRecommendations: 0,
      });
    }

    // Get all clients with their outstanding and paid invoice data in one query
    const clients = await prisma.client.findMany({
      where: { organizationId },
      include: {
        invoices: {
          where: {
            status: { in: ['sent', 'viewed', 'partial', 'overdue'] },
          },
          orderBy: { dueDate: 'asc' },
        },
        payments: {
          orderBy: { paidAt: 'desc' },
          take: 20,
        },
      },
    });

    // Batch-fetch paid invoices for late-payment-rate calculation (avoids N+1)
    const clientIds = clients.filter(c => c.invoices.length > 0).map(c => c.id);
    const paidInvoicesAll = clientIds.length > 0
      ? await prisma.invoice.findMany({
          where: {
            clientId: { in: clientIds },
            status: 'paid',
            paidDate: { not: null },
          },
          select: { clientId: true, paidDate: true, dueDate: true },
        })
      : [];

    // Group paid invoices by clientId
    const paidInvoicesByClient = new Map<string, typeof paidInvoicesAll>();
    for (const inv of paidInvoicesAll) {
      if (!inv.clientId) continue;
      const list = paidInvoicesByClient.get(inv.clientId) || [];
      list.push(inv);
      paidInvoicesByClient.set(inv.clientId, list);
    }

    const allRecommendations: Array<{
      clientId: string;
      clientName: string;
      recommendations: Recommendation[];
    }> = [];

    const today = new Date();

    for (const client of clients) {
      if (client.invoices.length === 0) continue;

      // Calculate totals
      const totalOutstanding = client.invoices.reduce(
        (sum, inv) => sum + (Number(inv.amount) - Number(inv.amountPaid)) * 100,
        0
      );

      // Find the most overdue invoice
      const mostOverdueInvoice = client.invoices
        .map(inv => {
          const dueDate = new Date(inv.dueDate);
          const daysPastDue = Math.max(0, Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)));
          return { invoice: inv, daysPastDue };
        })
        .sort((a, b) => b.daysPastDue - a.daysPastDue)[0];

      if (!mostOverdueInvoice) continue;

      // Use pre-fetched payment data from the include
      const totalPaid = client.payments.reduce((sum, p) => sum + Number(p.amount) * 100, 0);

      // Use pre-fetched paid invoices for late payment rate
      const paidInvoicesData = paidInvoicesByClient.get(client.id) || [];
      const paidInvoices = paidInvoicesData.length;
      const lateInvoices = paidInvoicesData.filter(
        inv => inv.paidDate && inv.paidDate > inv.dueDate
      ).length;
      const latePaymentRate = paidInvoices > 0 ? lateInvoices / paidInvoices : 0;

      // Build recommendation input
      const input: RecommendationInput = {
        clientName: client.name,
        clientScore: client.paymentScore || 50,
        invoiceAmount: (Number(mostOverdueInvoice.invoice.amount) - Number(mostOverdueInvoice.invoice.amountPaid)) * 100,
        daysPastDue: mostOverdueInvoice.daysPastDue,
        totalOutstanding,
        paymentHistory: {
          avgDaysToPayment: Number(client.avgDaysToPayment) || 30,
          latePaymentRate,
          totalPaid,
        },
      };

      // Generate recommendations
      const recommendations = await generateAIRecommendations(input);

      if (recommendations.length > 0) {
        allRecommendations.push({
          clientId: client.id,
          clientName: client.name,
          recommendations,
        });
      }
    }

    // Sort by highest priority recommendations first
    allRecommendations.sort((a, b) => {
      const aPriority = a.recommendations[0]?.priority || 'low';
      const bPriority = b.recommendations[0]?.priority || 'low';
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return priorityOrder[aPriority] - priorityOrder[bPriority];
    });

    return NextResponse.json({
      success: true,
      recommendations: allRecommendations,
      totalClients: allRecommendations.length,
      totalRecommendations: allRecommendations.reduce((sum, r) => sum + r.recommendations.length, 0),
    });
  } catch (error) {
    return apiError(error, "Failed to generate recommendations");
  }
});
