import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { prisma } from "@/lib/db/prisma";

// POST /api/integrations/[id]/sync - Trigger sync for an integration
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id: integrationId } = await params;

    if (!integrationId) {
      return NextResponse.json(
        { success: false, message: "Integration ID is required" },
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

    // Verify the integration belongs to the user's organization
    const integration = await prisma.integration.findFirst({
      where: {
        id: integrationId,
        organizationId: user.organizationId,
      },
    });

    if (!integration) {
      return NextResponse.json(
        { success: false, message: "Integration not found" },
        { status: 404 }
      );
    }

    if (integration.status !== "connected") {
      return NextResponse.json(
        { success: false, message: "Integration is not connected" },
        { status: 400 }
      );
    }

    // In a production environment, this would:
    // 1. Queue a background job to sync data from the provider
    // 2. Use the stored OAuth tokens to authenticate with the provider API
    // 3. Fetch and process data (invoices, transactions, reviews, etc.)
    // 4. Store the data in BusinessMetric or other relevant tables

    // For now, we'll simulate a sync by updating the lastSyncAt timestamp
    const updatedIntegration = await prisma.integration.update({
      where: { id: integrationId },
      data: {
        lastSyncAt: new Date(),
        lastSyncStatus: "success",
        syncError: null,
      },
      select: {
        id: true,
        provider: true,
        status: true,
        lastSyncAt: true,
        lastSyncStatus: true,
        syncError: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Sync completed successfully",
      integration: updatedIntegration,
    });
  } catch (error) {
    console.error("Failed to sync integration:", error);
    return NextResponse.json(
      { success: false, message: "Failed to sync integration" },
      { status: 500 }
    );
  }
}
