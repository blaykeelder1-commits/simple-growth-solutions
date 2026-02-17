import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";
import { withAuth } from "@/lib/api/with-auth";
import { apiError } from "@/lib/api/errors";

// Query params schema
const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

// GET /api/cashflow/activity - Get recent cash flow activity
export const GET = withAuth(async (request: NextRequest, _ctx, session) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user?.organizationId) {
      return NextResponse.json({ success: true, activity: [] });
    }

    const { searchParams } = new URL(request.url);
    // Validate query params with Zod
    const queryResult = querySchema.safeParse({
      limit: searchParams.get("limit") ?? undefined,
    });
    const limit = queryResult.success ? queryResult.data.limit : 10;

    // Fetch recent payments with invoice and client info
    const recentPayments = await prisma.payment.findMany({
      where: {
        invoice: { organizationId: user.organizationId },
      },
      include: {
        invoice: {
          include: {
            client: { select: { name: true } },
          },
        },
      },
      orderBy: { paidAt: "desc" },
      take: limit,
    });

    // Fetch recent invoices
    const recentInvoices = await prisma.invoice.findMany({
      where: { organizationId: user.organizationId },
      include: {
        client: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    // Fetch recent recommendations
    const recentRecommendations = await prisma.aIRecommendation.findMany({
      where: { organizationId: user.organizationId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    // Combine and sort by date
    const activity = [
      ...recentPayments.map((p) => ({
        id: p.id,
        type: "payment" as const,
        title: `Payment from ${p.invoice?.client?.name || "Unknown Client"}`,
        amount: p.amount,
        timestamp: p.paidAt.toISOString(),
      })),
      ...recentInvoices.map((inv) => ({
        id: inv.id,
        type: "invoice" as const,
        title: `Invoice ${inv.invoiceNumber} to ${inv.client?.name || "Unknown Client"}`,
        amount: inv.amount,
        timestamp: inv.createdAt.toISOString(),
      })),
      ...recentRecommendations.map((rec) => ({
        id: rec.id,
        type: "recommendation" as const,
        title: rec.title,
        timestamp: rec.createdAt.toISOString(),
      })),
    ]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);

    return NextResponse.json({ success: true, activity });
  } catch (error) {
    return apiError(error, "Failed to fetch activity");
  }
});
