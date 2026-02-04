// Cash Flow Recommendations API
// GET: Fetch AI-powered recommendations for all clients

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { prisma } from '@/lib/db/prisma';
import { generateAIRecommendations, Recommendation, RecommendationInput } from '@/lib/cashflow/recommendations';
import { apiLogger as logger } from '@/lib/logger';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const organizationId = session.user.organizationId;

    // Get all clients with their invoice data
    const clients = await prisma.client.findMany({
      where: { organizationId },
      include: {
        invoices: {
          where: {
            status: { in: ['sent', 'viewed', 'partial', 'overdue'] },
          },
          orderBy: { dueDate: 'asc' },
        },
      },
    });

    // Get payment data for each client
    const allRecommendations: Array<{
      clientId: string;
      clientName: string;
      recommendations: Recommendation[];
    }> = [];

    for (const client of clients) {
      if (client.invoices.length === 0) continue;

      // Calculate totals
      const totalOutstanding = client.invoices.reduce(
        (sum, inv) => sum + (Number(inv.amount) - Number(inv.amountPaid)) * 100,
        0
      );

      // Find the most overdue invoice
      const today = new Date();
      const mostOverdueInvoice = client.invoices
        .map(inv => {
          const dueDate = new Date(inv.dueDate);
          const daysPastDue = Math.max(0, Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)));
          return { invoice: inv, daysPastDue };
        })
        .sort((a, b) => b.daysPastDue - a.daysPastDue)[0];

      if (!mostOverdueInvoice) continue;

      // Get payment history
      const payments = await prisma.payment.findMany({
        where: {
          invoice: { clientId: client.id },
        },
        orderBy: { paymentDate: 'desc' },
        take: 20,
      });

      const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount) * 100, 0);

      // Calculate late payment rate
      const paidInvoices = await prisma.invoice.count({
        where: {
          clientId: client.id,
          status: 'paid',
        },
      });
      const lateInvoices = await prisma.invoice.count({
        where: {
          clientId: client.id,
          status: 'paid',
          paidAt: { gt: prisma.raw('due_date') },
        },
      });
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
    logger.error('[Recommendations API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to generate recommendations' },
      { status: 500 }
    );
  }
}
