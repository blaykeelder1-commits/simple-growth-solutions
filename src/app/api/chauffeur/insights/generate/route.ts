import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { prisma } from "@/lib/db/prisma";
import { GoogleGenerativeAI } from "@google/generative-ai";

// POST /api/chauffeur/insights/generate — Generate AI insights from business metrics
export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        organization: { include: { settings: true } },
      },
    });

    if (!user?.organizationId) {
      return NextResponse.json({ error: "No organization" }, { status: 400 });
    }

    // Gather last 30 days of metrics
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [metrics, invoiceStats, clientCount] = await Promise.all([
      prisma.businessMetric.findMany({
        where: {
          organizationId: user.organizationId,
          metricDate: { gte: thirtyDaysAgo },
        },
        orderBy: { metricDate: "asc" },
      }),
      prisma.invoice.groupBy({
        by: ["status"],
        where: { organizationId: user.organizationId },
        _sum: { amount: true },
        _count: true,
      }),
      prisma.client.count({
        where: { organizationId: user.organizationId },
      }),
    ]);

    if (metrics.length === 0) {
      return NextResponse.json({
        success: true,
        insightsGenerated: 0,
        message: "No metrics data available. Sync your integrations first.",
      });
    }

    // Summarize data for AI
    const totalRevenue = metrics.reduce((sum, m) => sum + Number(m.revenue || 0), 0);
    const totalTransactions = metrics.reduce((sum, m) => sum + (m.transactions || 0), 0);
    const avgDailyRevenue = totalRevenue / metrics.length;

    // Weekly trend (compare last 7 days to previous 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    const recentWeek = metrics.filter((m) => new Date(m.metricDate) >= sevenDaysAgo);
    const prevWeek = metrics.filter(
      (m) => new Date(m.metricDate) >= fourteenDaysAgo && new Date(m.metricDate) < sevenDaysAgo
    );

    const recentRevenue = recentWeek.reduce((s, m) => s + Number(m.revenue || 0), 0);
    const prevRevenue = prevWeek.reduce((s, m) => s + Number(m.revenue || 0), 0);
    const revenueChange = prevRevenue > 0 ? ((recentRevenue - prevRevenue) / prevRevenue) * 100 : 0;

    const invoiceSummary = invoiceStats.map(
      (s) => `${s.status}: ${s._count} invoices ($${Number(s._sum.amount || 0).toFixed(0)})`
    ).join(", ");

    const industry = user.organization?.settings?.industryCategory || user.organization?.industry || "general business";

    // Generate insights with Google AI
    const apiKey = process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "AI not configured" }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `You are a business intelligence analyst. Based on this data for a ${industry} business, generate exactly 3 actionable insights as JSON.

Business Data (last 30 days):
- Total Revenue: $${totalRevenue.toFixed(0)}
- Total Transactions: ${totalTransactions}
- Avg Daily Revenue: $${avgDailyRevenue.toFixed(0)}
- Week-over-week revenue change: ${revenueChange.toFixed(1)}%
- Active clients: ${clientCount}
- Invoice status: ${invoiceSummary || "No invoices"}
- Data points: ${metrics.length} days

Return a JSON array of exactly 3 objects with these fields:
- category: "revenue" | "operations" | "customers" | "growth"
- type: "trend" | "anomaly" | "opportunity" | "risk"
- title: short title (under 60 chars)
- description: 2-3 sentence insight with specific recommendation
- confidence: number 0.0-1.0
- actionRequired: boolean

Only return the JSON array, no other text.`;

    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();

    // Parse the JSON response
    let insights;
    try {
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      insights = JSON.parse(jsonMatch ? jsonMatch[0] : text);
    } catch {
      return NextResponse.json({ error: "Failed to parse AI response" }, { status: 500 });
    }

    // Save insights to database
    let insightsGenerated = 0;
    for (const insight of insights) {
      await prisma.businessInsight.create({
        data: {
          organizationId: user.organizationId,
          category: insight.category,
          type: insight.type,
          title: insight.title,
          description: insight.description,
          confidence: insight.confidence,
          actionRequired: insight.actionRequired ?? false,
        },
      });
      insightsGenerated++;
    }

    return NextResponse.json({
      success: true,
      insightsGenerated,
      insights,
    });
  } catch (error) {
    console.error("Insight generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate insights" },
      { status: 500 }
    );
  }
}
