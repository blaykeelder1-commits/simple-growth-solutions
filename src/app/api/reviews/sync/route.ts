import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { withAuth } from "@/lib/api/with-auth";
import { apiError } from "@/lib/api/errors";
import { syncGoogleReviewsToDatabase } from "@/lib/integrations/google-business";
import { syncYelpReviewsToDatabase } from "@/lib/integrations/yelp";

// POST /api/reviews/sync - Sync reviews from a provider
export const POST = withAuth(async (request: NextRequest, _ctx, session) => {
  try {
    const body = await request.json();
    const { provider, businessId } = body;

    if (!provider || !businessId) {
      return NextResponse.json(
        { success: false, message: "provider and businessId are required" },
        { status: 400 }
      );
    }

    if (!["google", "yelp"].includes(provider)) {
      return NextResponse.json(
        { success: false, message: "provider must be 'google' or 'yelp'" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user?.organizationId) {
      return NextResponse.json(
        { success: false, message: "No organization found" },
        { status: 404 }
      );
    }

    // Verify the integration exists and is connected
    const integrationProvider =
      provider === "google" ? "google_business" : "yelp";

    const integration = await prisma.integration.findUnique({
      where: {
        organizationId_provider: {
          organizationId: user.organizationId,
          provider: integrationProvider,
        },
      },
    });

    if (!integration || integration.status !== "connected") {
      return NextResponse.json(
        {
          success: false,
          message: `${provider === "google" ? "Google Business" : "Yelp"} is not connected`,
        },
        { status: 400 }
      );
    }

    let result;

    if (provider === "google") {
      result = await syncGoogleReviewsToDatabase(
        businessId,
        user.organizationId,
        prisma
      );
    } else {
      result = await syncYelpReviewsToDatabase(
        businessId,
        user.organizationId,
        prisma
      );
    }

    // Update integration sync status
    await prisma.integration.update({
      where: { id: integration.id },
      data: {
        lastSyncAt: new Date(),
        lastSyncStatus: "success",
        syncError: null,
      },
    });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    return apiError(error, "Failed to sync reviews");
  }
});
