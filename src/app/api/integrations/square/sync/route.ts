import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { withAuth } from "@/lib/api/with-auth";
import { apiError } from "@/lib/api/errors";
import {
  SquareClient,
  refreshAccessToken,
  syncSquareToDatabase,
  getSquareConfig,
} from "@/lib/integrations/square";

// POST /api/integrations/square/sync
// Triggers a sync of Square POS data (locations, orders, payments → BusinessMetric)
export const POST = withAuth(async (_request: NextRequest, _ctx, session) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user?.organizationId) {
      return NextResponse.json(
        { success: false, message: "No organization found" },
        { status: 404 }
      );
    }

    // Find the Square integration
    const integration = await prisma.integration.findFirst({
      where: {
        organizationId: user.organizationId,
        provider: "square",
        status: "connected",
      },
    });

    if (!integration) {
      return NextResponse.json(
        { success: false, message: "Square is not connected" },
        { status: 404 }
      );
    }

    if (!integration.accessToken || !integration.externalAccountId) {
      return NextResponse.json(
        { success: false, message: "Square integration is missing credentials" },
        { status: 400 }
      );
    }

    const config = getSquareConfig();
    if (!config) {
      return NextResponse.json(
        { success: false, message: "Square is not configured on the server" },
        { status: 500 }
      );
    }

    // Refresh token if expired (or about to expire in next 5 minutes)
    let accessToken = integration.accessToken;
    const tokenExpiry = integration.tokenExpiresAt
      ? new Date(integration.tokenExpiresAt)
      : null;
    const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000);

    if (!tokenExpiry || tokenExpiry < fiveMinutesFromNow) {
      if (!integration.refreshToken) {
        // Token is expired and no refresh token — mark as error
        await prisma.integration.update({
          where: { id: integration.id },
          data: {
            status: "expired",
            syncError: "Refresh token is missing. Please reconnect Square.",
          },
        });
        return NextResponse.json(
          { success: false, message: "Square token expired. Please reconnect." },
          { status: 401 }
        );
      }

      try {
        const refreshed = await refreshAccessToken(integration.refreshToken);
        accessToken = refreshed.accessToken;

        // Persist the new tokens
        await prisma.integration.update({
          where: { id: integration.id },
          data: {
            accessToken: refreshed.accessToken,
            refreshToken: refreshed.refreshToken,
            tokenExpiresAt: refreshed.expiresAt,
          },
        });
      } catch (refreshError) {
        await prisma.integration.update({
          where: { id: integration.id },
          data: {
            status: "expired",
            syncError: `Token refresh failed: ${refreshError instanceof Error ? refreshError.message : "Unknown error"}`,
          },
        });
        return NextResponse.json(
          { success: false, message: "Failed to refresh Square token. Please reconnect." },
          { status: 401 }
        );
      }
    }

    // Create client and run sync
    const squareClient = new SquareClient(accessToken, config.environment);

    const syncResult = await syncSquareToDatabase(
      squareClient,
      user.organizationId,
      prisma
    );

    // Update integration with sync results
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
      message: "Sync completed",
      data: {
        locationsSynced: syncResult.locationsSynced,
        ordersSynced: syncResult.ordersSynced,
        revenue: syncResult.revenue,
      },
    });
  } catch (error) {
    return apiError(error, "Square sync failed");
  }
});
