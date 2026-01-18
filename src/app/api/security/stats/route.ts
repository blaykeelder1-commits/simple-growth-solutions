import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { prisma } from "@/lib/db/prisma";

// GET /api/security/stats - Get security dashboard stats
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
        stats: {
          totalScans: 0,
          avgScore: null,
          openVulnerabilities: 0,
          lastScanDate: null,
        },
      });
    }

    // Get scan stats
    const scans = await prisma.securityScan.findMany({
      where: {
        organizationId: user.organizationId,
        status: "completed",
      },
      select: {
        overallScore: true,
        completedAt: true,
      },
      orderBy: { completedAt: "desc" },
    });

    // Calculate average score
    const scoresWithValue = scans.filter((s) => s.overallScore !== null);
    const avgScore =
      scoresWithValue.length > 0
        ? Math.round(
            scoresWithValue.reduce((sum, s) => sum + (s.overallScore || 0), 0) /
              scoresWithValue.length
          )
        : null;

    // Count open vulnerabilities
    const openVulnerabilities = await prisma.vulnerability.count({
      where: {
        scan: { organizationId: user.organizationId },
        status: "open",
      },
    });

    return NextResponse.json({
      success: true,
      stats: {
        totalScans: scans.length,
        avgScore,
        openVulnerabilities,
        lastScanDate: scans[0]?.completedAt?.toISOString() || null,
      },
    });
  } catch (error) {
    console.error("[Security Stats API] GET error:", error instanceof Error ? error.message : error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}
