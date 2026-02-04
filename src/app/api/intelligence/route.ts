// Business Intelligence API
// Generates industry-specific insights for Business Chauffeur

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  generateBusinessIntelligence,
  getQuickInsights,
  getIndustryProfile,
  type IndustrySubtype,
  type DailyRevenue,
  type CustomerAcquisition,
} from "@/lib/industry";

// GET - Get business intelligence report
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { organization: true },
    });

    if (!user?.organizationId || !user.organization) {
      return NextResponse.json(
        { error: "No organization found" },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const quick = searchParams.get("quick") === "true";

    // Get organization settings for industry type
    const orgSettings = await prisma.organizationSettings.findUnique({
      where: { organizationId: user.organizationId },
    });

    // Default to pet_grooming if not set (user's example)
    const industrySubtype: IndustrySubtype =
      (orgSettings?.industrySubtype as IndustrySubtype) || "pet_grooming";
    const region = orgSettings?.region || user.organization.name || "TX";

    // For quick insights, just return fast results
    if (quick) {
      // Get basic metrics from database
      const [invoices] = await Promise.all([
        prisma.invoice.findMany({
          where: {
            organizationId: user.organizationId,
            createdAt: { gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) },
          },
          select: { amount: true, status: true },
        }),
        prisma.client.count({
          where: { organizationId: user.organizationId },
        }),
      ]);

      const totalRevenue = invoices
        .filter((i) => i.status === "paid")
        .reduce((sum, i) => sum + Number(i.amount), 0);

      const avgTicket = invoices.length > 0
        ? Math.round(totalRevenue / invoices.filter((i) => i.status === "paid").length)
        : 5000;

      const quickInsights = getQuickInsights(industrySubtype, region, {
        averageTicket: avgTicket,
        monthlyRevenue: Math.round(totalRevenue / 3),
        repeatRate: 0.4, // Would calculate from actual data
      });

      return NextResponse.json({
        insights: quickInsights,
        industry: getIndustryProfile(industrySubtype).displayName,
        region,
      });
    }

    // Full intelligence report
    // Gather all data from database
    const [invoices, clients, _transactions] = await Promise.all([
      prisma.invoice.findMany({
        where: {
          organizationId: user.organizationId,
          createdAt: { gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) },
        },
        include: { client: true },
        orderBy: { createdAt: "asc" },
      }),
      prisma.client.findMany({
        where: { organizationId: user.organizationId },
        include: {
          invoices: {
            select: { amount: true, status: true, createdAt: true },
          },
        },
      }),
      prisma.bankTransaction.findMany({
        where: {
          organizationId: user.organizationId,
          date: { gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) },
        },
        orderBy: { date: "asc" },
      }),
    ]);

    // Build revenue data from invoices
    const revenueByDate = new Map<string, DailyRevenue>();
    invoices
      .filter((inv) => inv.status === "paid")
      .forEach((inv) => {
        const dateKey = inv.createdAt.toISOString().split("T")[0];
        const existing = revenueByDate.get(dateKey) || {
          date: inv.createdAt,
          revenue: 0,
          transactionCount: 0,
          averageTicket: 0,
        };
        existing.revenue += Number(inv.amount);
        existing.transactionCount += 1;
        revenueByDate.set(dateKey, existing);
      });

    // Calculate averages
    const revenueData: DailyRevenue[] = Array.from(revenueByDate.values()).map((day) => ({
      ...day,
      averageTicket: day.transactionCount > 0 ? day.revenue / day.transactionCount : 0,
    }));

    // Build customer acquisition data
    const customerData: CustomerAcquisition[] = clients.map((client) => {
      const paidInvoices = client.invoices.filter((i) => i.status === "paid");
      const totalValue = paidInvoices.reduce((sum, i) => sum + Number(i.amount), 0);
      const firstInvoice = paidInvoices.sort(
        (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
      )[0];

      // Determine acquisition channel from client data or default
      const channel = determineAcquisitionChannel(client);

      return {
        customerId: client.id,
        customerName: client.name,
        firstVisitDate: firstInvoice?.createdAt || client.createdAt,
        acquisitionChannel: channel,
        firstOrderValue: firstInvoice ? Number(firstInvoice.amount) : 0,
        lifetimeValue: totalValue,
        totalVisits: paidInvoices.length,
        isActive: paidInvoices.some(
          (i) => i.createdAt > new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
        ),
      };
    });

    // Calculate business metrics
    const totalPaidInvoices = invoices.filter((i) => i.status === "paid");
    const totalRevenue = totalPaidInvoices.reduce((sum, i) => sum + Number(i.amount), 0);
    const avgTicket = totalPaidInvoices.length > 0
      ? Math.round(totalRevenue / totalPaidInvoices.length)
      : 5000;

    // Monthly revenue (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const monthlyRevenue = totalPaidInvoices
      .filter((i) => i.createdAt >= thirtyDaysAgo)
      .reduce((sum, i) => sum + Number(i.amount), 0);

    // Repeat rate
    const repeatCustomers = clients.filter(
      (c) => c.invoices.filter((i) => i.status === "paid").length > 1
    ).length;
    const repeatRate = clients.length > 0 ? repeatCustomers / clients.length : 0;

    // Generate full report
    const report = generateBusinessIntelligence(
      user.organization.name,
      industrySubtype,
      region,
      revenueData,
      customerData,
      {
        averageTicket: avgTicket,
        monthlyRevenue,
        customerCount: clients.length,
        repeatRate,
      }
    );

    return NextResponse.json(report);
  } catch (error) {
    console.error("[Intelligence API] Error generating report:", error);
    return NextResponse.json(
      { error: "Failed to generate business intelligence" },
      { status: 500 }
    );
  }
}

// POST - Update business intelligence settings
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user?.organizationId) {
      return NextResponse.json(
        { error: "No organization found" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { industrySubtype, region } = body;

    // Validate industry subtype
    const validSubtypes = [
      "pet_grooming",
      "hair_salon",
      "fast_casual",
      "auto_repair",
      // Add more as needed
    ];

    if (industrySubtype && !validSubtypes.includes(industrySubtype)) {
      return NextResponse.json(
        { error: "Invalid industry subtype" },
        { status: 400 }
      );
    }

    // Update or create settings
    await prisma.organizationSettings.upsert({
      where: { organizationId: user.organizationId },
      update: {
        ...(industrySubtype && { industrySubtype }),
        ...(region && { region }),
      },
      create: {
        organizationId: user.organizationId,
        industrySubtype: industrySubtype || "pet_grooming",
        region: region || "TX",
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Intelligence API] Error updating settings:", error);
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 }
    );
  }
}

// Helper to determine acquisition channel from client data
function determineAcquisitionChannel(client: {
  email?: string | null;
  notes?: string | null;
  tags?: string[];
  source?: string | null;
}): CustomerAcquisition["acquisitionChannel"] {
  // Check source field if available
  if (client.source) {
    const source = client.source.toLowerCase();
    if (source.includes("google")) return "google_search";
    if (source.includes("yelp")) return "yelp";
    if (source.includes("facebook") || source.includes("fb")) return "facebook";
    if (source.includes("instagram") || source.includes("ig")) return "instagram";
    if (source.includes("referral") || source.includes("friend")) return "referral";
    if (source.includes("walk") || source.includes("drive")) return "walk_in";
    if (source.includes("phone") || source.includes("call")) return "phone_call";
    if (source.includes("online") || source.includes("web")) return "online_booking";
  }

  // Check notes for hints
  if (client.notes) {
    const notes = client.notes.toLowerCase();
    if (notes.includes("referred")) return "referral";
    if (notes.includes("google")) return "google_search";
    if (notes.includes("yelp")) return "yelp";
  }

  // Default based on common patterns
  return "walk_in";
}
