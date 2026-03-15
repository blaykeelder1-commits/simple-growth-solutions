import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { withAuth } from "@/lib/api/with-auth";
import { apiError } from "@/lib/api/errors";

// DELETE /api/integrations/yelp/disconnect
// Removes the Yelp integration for the user's organization
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

    const integration = await prisma.integration.findUnique({
      where: {
        organizationId_provider: {
          organizationId: user.organizationId,
          provider: "yelp",
        },
      },
    });

    if (!integration) {
      return NextResponse.json(
        { success: false, message: "Yelp integration not found" },
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
        entityId: "yelp",
        oldValues: {
          provider: "yelp",
          externalAccountId: integration.externalAccountId,
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: "Yelp has been disconnected",
    });
  } catch (error) {
    return apiError(error, "Failed to disconnect Yelp");
  }
});
