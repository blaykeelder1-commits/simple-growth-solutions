import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { prisma } from "@/lib/db/prisma";
import { logger } from "@/lib/logger";

/**
 * GET /api/security/trends
 *
 * Returns the last 12 scan scores for the authenticated user's organization,
 * along with a trend indicator.
 */
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
      return NextResponse.json({
        success: true,
        trends: [],
        improving: false,
      });
    }

    // Fetch last 12 completed scans with scores
    const scans = await prisma.securityScan.findMany({
      where: {
        organizationId: user.organizationId,
        status: "completed",
        overallScore: { not: null },
      },
      orderBy: { completedAt: "asc" },
      take: 12,
      select: {
        overallScore: true,
        completedAt: true,
      },
    });

    const trends = scans.map((scan) => ({
      date: scan.completedAt?.toISOString() || scan.completedAt?.toISOString() || "",
      score: scan.overallScore ?? 0,
    }));

    // Determine if scores are improving
    // Compare average of last 3 scans to average of first 3 scans
    let improving = false;
    if (trends.length >= 4) {
      const recentScans = trends.slice(-3);
      const olderScans = trends.slice(0, 3);
      const recentAvg = recentScans.reduce((sum, t) => sum + t.score, 0) / recentScans.length;
      const olderAvg = olderScans.reduce((sum, t) => sum + t.score, 0) / olderScans.length;
      improving = recentAvg > olderAvg;
    } else if (trends.length >= 2) {
      // Simple comparison: is the latest score higher than the first?
      improving = trends[trends.length - 1].score > trends[0].score;
    }

    return NextResponse.json({
      success: true,
      trends,
      improving,
    });
  } catch (error) {
    logger.error({ err: error, route: "security/trends" }, "GET error");
    return NextResponse.json(
      { success: false, message: "Failed to fetch trends" },
      { status: 500 }
    );
  }
}
