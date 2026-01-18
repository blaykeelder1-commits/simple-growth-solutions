import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";

// Query params schema
const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

// GET /api/cashflow/activity - Get recent cash flow activity
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

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
    console.error("[API] cashflow/activity GET error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch activity" },
      { status: 500 }
    );
  }
}
