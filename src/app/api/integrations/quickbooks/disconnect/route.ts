import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { withAuth } from "@/lib/api/with-auth";
import { apiError } from "@/lib/api/errors";

// DELETE /api/integrations/quickbooks/disconnect
// Removes the QuickBooks integration for the user's organization
export const DELETE = withAuth(async (_request: NextRequest, _ctx, session) => {
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

    // Find and delete the QuickBooks integration
    const integration = await prisma.integration.findUnique({
      where: {
        organizationId_provider: {
          organizationId: user.organizationId,
          provider: "quickbooks",
        },
      },
    });

    if (!integration) {
      return NextResponse.json(
        { success: false, message: "QuickBooks integration not found" },
        { status: 404 }
      );
    }

    await prisma.integration.delete({
      where: { id: integration.id },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        organizationId: user.organizationId,
        userId: user.id,
        action: "integration.disconnected",
        entityType: "integration",
        entityId: "quickbooks",
        oldValues: {
          provider: "quickbooks",
          externalAccountId: integration.externalAccountId,
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: "QuickBooks has been disconnected",
    });
  } catch (error) {
    return apiError(error, "Failed to disconnect QuickBooks");
  }
});
