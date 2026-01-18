import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { prisma } from "@/lib/db/prisma";

// GET /api/integrations - List integrations for organization
export async function GET() {
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
      return NextResponse.json({ success: true, integrations: [] });
    }

    const integrations = await prisma.integration.findMany({
      where: { organizationId: user.organizationId },
      select: {
        id: true,
        provider: true,
        status: true,
        lastSyncAt: true,
        lastSyncStatus: true,
        syncError: true,
      },
    });

    return NextResponse.json({ success: true, integrations });
  } catch (error) {
    console.error("Failed to fetch integrations:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch integrations" },
      { status: 500 }
    );
  }
}
