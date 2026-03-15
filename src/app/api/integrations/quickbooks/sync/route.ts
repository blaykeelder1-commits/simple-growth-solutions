import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { withAuth } from "@/lib/api/with-auth";
import { apiError } from "@/lib/api/errors";
import {
  QuickBooksClient,
  refreshAccessToken,
  syncQuickBooksToDatabase,
  getQuickBooksConfig,
} from "@/lib/integrations/quickbooks";

// POST /api/integrations/quickbooks/sync
// Triggers a full sync of QuickBooks data (customers + invoices)
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

    // Find the QuickBooks integration
    const integration = await prisma.integration.findFirst({
      where: {
        organizationId: user.organizationId,
        provider: "quickbooks",
        status: "connected",
      },
    });

    if (!integration) {
      return NextResponse.json(
        { success: false, message: "QuickBooks is not connected" },
        { status: 404 }
      );
    }

    if (!integration.accessToken || !integration.externalAccountId) {
      return NextResponse.json(
        { success: false, message: "QuickBooks integration is missing credentials" },
        { status: 400 }
      );
    }

    const config = getQuickBooksConfig();
    if (!config) {
      return NextResponse.json(
        { success: false, message: "QuickBooks is not configured on the server" },
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
            syncError: "Refresh token is missing. Please reconnect QuickBooks.",
          },
        });
        return NextResponse.json(
          { success: false, message: "QuickBooks token expired. Please reconnect." },
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
            tokenExpiresAt: new Date(
              Date.now() + refreshed.expiresIn * 1000
            ),
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
          { success: false, message: "Failed to refresh QuickBooks token. Please reconnect." },
          { status: 401 }
        );
      }
    }

    // Create client and run sync
    const qbClient = new QuickBooksClient(
      accessToken,
      integration.externalAccountId,
      config.apiUrl
    );

    const syncResult = await syncQuickBooksToDatabase(
      qbClient,
      user.organizationId,
      prisma
    );

    // Update integration with sync results
    const syncStatus =
      syncResult.errors.length === 0
        ? "success"
        : syncResult.clientsSynced > 0 || syncResult.invoicesSynced > 0
          ? "partial"
          : "error";

    await prisma.integration.update({
      where: { id: integration.id },
      data: {
        lastSyncAt: new Date(),
        lastSyncStatus: syncStatus,
        syncError:
          syncResult.errors.length > 0
            ? syncResult.errors.join("; ")
            : null,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Sync completed",
      data: {
        clientsSynced: syncResult.clientsSynced,
        invoicesSynced: syncResult.invoicesSynced,
        errors: syncResult.errors,
        syncStatus,
      },
    });
  } catch (error) {
    return apiError(error, "QuickBooks sync failed");
  }
});
