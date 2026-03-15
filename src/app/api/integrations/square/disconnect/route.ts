import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { withAuth } from "@/lib/api/with-auth";
import { apiError } from "@/lib/api/errors";

// DELETE /api/integrations/square/disconnect
// Removes the Square integration for the user's organization
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

    // Find and delete the Square integration
    const integration = await prisma.integration.findUnique({
      where: {
        organizationId_provider: {
          organizationId: user.organizationId,
          provider: "square",
        },
      },
    });

    if (!integration) {
      return NextResponse.json(
        { success: false, message: "Square integration not found" },
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
        entityId: "square",
        oldValues: {
          provider: "square",
          externalAccountId: integration.externalAccountId,
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: "Square has been disconnected",
    });
  } catch (error) {
    return apiError(error, "Failed to disconnect Square");
  }
});
