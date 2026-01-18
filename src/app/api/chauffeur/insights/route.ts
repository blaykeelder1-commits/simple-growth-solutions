import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { prisma } from "@/lib/db/prisma";

// GET /api/chauffeur/insights - Get business insights for organization
export async function GET() {
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
      return NextResponse.json({ success: true, insights: [] });
    }

    const insights = await prisma.businessInsight.findMany({
      where: { organizationId: user.organizationId },
      orderBy: [
        { actionRequired: "desc" },
        { createdAt: "desc" },
      ],
      take: 50,
    });

    return NextResponse.json({
      success: true,
      insights: insights.map((insight) => ({
        id: insight.id,
        category: insight.category,
        type: insight.type,
        title: insight.title,
        description: insight.description,
        confidence: insight.confidence ? Number(insight.confidence) : null,
        actionRequired: insight.actionRequired,
        actionTaken: insight.actionTaken,
        createdAt: insight.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("Failed to fetch insights:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch insights" },
      { status: 500 }
    );
  }
}
