import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { prisma } from "@/lib/db/prisma";

// DELETE /api/integrations/gusto/disconnect - Disconnect Gusto integration
export async function DELETE() {
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

    // Find the Gusto integration
    const integration = await prisma.integration.findFirst({
      where: {
        organizationId: user.organizationId,
        provider: "gusto",
      },
    });

    if (!integration) {
      return NextResponse.json(
        { success: false, message: "Gusto integration not found" },
        { status: 404 }
      );
    }

    // Delete the integration record
    await prisma.integration.delete({
      where: { id: integration.id },
    });

    // Create audit log entry
    await prisma.auditLog.create({
      data: {
        organizationId: user.organizationId,
        userId: session.user.id,
        action: "integration.disconnected",
        entityType: "integration",
        entityId: integration.id,
        oldValues: { provider: "gusto" },
      },
    });

    return NextResponse.json({
      success: true,
      message: "Gusto integration disconnected",
    });
  } catch (error) {
    console.error("Failed to disconnect Gusto:", error);
    return NextResponse.json(
      { success: false, message: "Failed to disconnect Gusto integration" },
      { status: 500 }
    );
  }
}
