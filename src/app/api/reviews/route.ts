import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { withAuth } from "@/lib/api/with-auth";
import { apiError } from "@/lib/api/errors";

// GET /api/reviews - Fetch latest review metrics for the user's organization
export const GET = withAuth(async (_request: NextRequest, _ctx, session) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user?.organizationId) {
      return NextResponse.json({
        success: true,
        google: null,
        yelp: null,
      });
    }

    // Fetch latest Google review metrics
    const googleMetric = await prisma.businessMetric.findFirst({
      where: {
        organizationId: user.organizationId,
        source: "google",
      },
      orderBy: { metricDate: "desc" },
    });

    // Fetch latest Yelp review metrics
    const yelpMetric = await prisma.businessMetric.findFirst({
      where: {
        organizationId: user.organizationId,
        source: "yelp",
      },
      orderBy: { metricDate: "desc" },
    });

    const parseCustomMetrics = (metric: typeof googleMetric) => {
      if (!metric) return null;
      let reviews: unknown[] = [];
      try {
        const custom = metric.customMetrics
          ? JSON.parse(metric.customMetrics)
          : {};
        reviews = custom.reviews || [];
      } catch {
        // ignore parse errors
      }
      return {
        rating: metric.avgRating ? Number(metric.avgRating) : 0,
        count: metric.reviewCount || 0,
        reviews,
        lastSynced: metric.updatedAt,
      };
    };

    return NextResponse.json({
      success: true,
      google: parseCustomMetrics(googleMetric),
      yelp: parseCustomMetrics(yelpMetric),
    });
  } catch (error) {
    return apiError(error, "Failed to fetch review metrics");
  }
});
