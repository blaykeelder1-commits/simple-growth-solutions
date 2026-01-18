import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { prisma } from "@/lib/db/prisma";

// GET /api/change-requests - List change requests for user's organization
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50");

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user?.organizationId && user?.role !== "admin") {
      return NextResponse.json({ success: true, requests: [] });
    }

    // Build where clause based on user role
    const whereClause = user?.role === "admin"
      ? {} // Admin sees all
      : {
          project: {
            organizationId: user?.organizationId || undefined,
          },
        };

    const requests = await prisma.changeRequest.findMany({
      where: whereClause,
      include: {
        project: {
          select: { id: true, projectName: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return NextResponse.json({ success: true, requests });
  } catch {
    return NextResponse.json(
      { success: false, message: "Failed to fetch change requests" },
      { status: 500 }
    );
  }
}
