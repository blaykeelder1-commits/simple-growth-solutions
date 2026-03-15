import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { prisma } from "@/lib/db/prisma";
import { decrypt } from "@/lib/encryption";
import {
  GustoClient,
  getGustoConfig,
  refreshAccessToken,
  syncEmployeesFromGusto,
  syncPayrollsFromGusto,
} from "@/lib/integrations/gusto";

// POST /api/integrations/gusto/sync - Sync Gusto data
export async function POST() {
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
      return NextResponse.json(
        { success: false, message: "No organization found" },
        { status: 404 }
      );
    }

    // Find the Gusto integration for this org
    const integration = await prisma.integration.findFirst({
      where: {
        organizationId: user.organizationId,
        provider: "gusto",
        status: "connected",
      },
    });

    if (!integration) {
      return NextResponse.json(
        { success: false, message: "Gusto integration not found or not connected" },
        { status: 404 }
      );
    }

    if (!integration.accessTokenEncrypted || !integration.refreshTokenEncrypted) {
      return NextResponse.json(
        { success: false, message: "Gusto tokens are missing. Please reconnect." },
        { status: 400 }
      );
    }

    const config = getGustoConfig();
    if (!config) {
      return NextResponse.json(
        { success: false, message: "Gusto integration is not configured" },
        { status: 500 }
      );
    }

    let accessToken = decrypt(integration.accessTokenEncrypted);

    // If token is expired, refresh it
    if (integration.tokenExpiresAt && new Date() >= integration.tokenExpiresAt) {
      try {
        const refreshToken = decrypt(integration.refreshTokenEncrypted);
        const newTokens = await refreshAccessToken(config, refreshToken);

        const { encrypt } = await import("@/lib/encryption");
        const encryptedAccessToken = encrypt(newTokens.accessToken);
        const encryptedRefreshToken = encrypt(newTokens.refreshToken);

        await prisma.integration.update({
          where: { id: integration.id },
          data: {
            accessTokenEncrypted: encryptedAccessToken,
            refreshTokenEncrypted: encryptedRefreshToken,
            tokenExpiresAt: newTokens.expiresAt,
          },
        });

        accessToken = newTokens.accessToken;
      } catch (refreshError) {
        console.error("Failed to refresh Gusto token:", refreshError);

        await prisma.integration.update({
          where: { id: integration.id },
          data: {
            status: "expired",
            syncError: "Token refresh failed. Please reconnect.",
          },
        });

        return NextResponse.json(
          { success: false, message: "Gusto token expired. Please reconnect." },
          { status: 401 }
        );
      }
    }

    // Create the Gusto client
    const client = new GustoClient(accessToken);

    // Get the current user to find the company ID
    const gustoUser = await client.getCurrentUser();

    // The /v1/me endpoint returns the company ID in the roles
    // For now, use the externalAccountId if stored, otherwise fetch it
    let companyId = integration.externalAccountId;

    if (!companyId) {
      // Fetch company ID from the Gusto user info
      // The me endpoint typically includes company associations
      const meResponse = gustoUser as unknown as {
        roles?: { companies?: { id: string }[] }[];
        id: string;
      };
      companyId =
        meResponse.roles?.[0]?.companies?.[0]?.id || meResponse.id;

      // Store the company ID for future use
      if (companyId) {
        await prisma.integration.update({
          where: { id: integration.id },
          data: { externalAccountId: companyId },
        });
      }
    }

    if (!companyId) {
      return NextResponse.json(
        { success: false, message: "Could not determine Gusto company ID" },
        { status: 400 }
      );
    }

    // Sync employees and payrolls
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = prisma as any;
    const [employeeResult, payrollResult] = await Promise.all([
      syncEmployeesFromGusto(client, companyId, user.organizationId, db),
      syncPayrollsFromGusto(client, companyId, user.organizationId, db),
    ]);

    // Determine sync status
    const hasErrors =
      employeeResult.errors.length > 0 || payrollResult.errors.length > 0;
    const syncStatus = hasErrors ? "partial" : "success";
    const syncError = hasErrors
      ? [...employeeResult.errors, ...payrollResult.errors].join("; ")
      : null;

    // Update the integration record
    await prisma.integration.update({
      where: { id: integration.id },
      data: {
        lastSyncAt: new Date(),
        lastSyncStatus: syncStatus,
        syncError,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Gusto sync completed",
      employeesSynced: employeeResult.synced,
      payrollsSynced: payrollResult.synced,
      errors: hasErrors
        ? [...employeeResult.errors, ...payrollResult.errors]
        : undefined,
    });
  } catch (error) {
    console.error("Gusto sync failed:", error);
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error ? error.message : "Gusto sync failed",
      },
      { status: 500 }
    );
  }
}
