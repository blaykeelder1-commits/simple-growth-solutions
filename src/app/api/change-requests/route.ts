import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { withAuth } from "@/lib/api/with-auth";
import { apiError } from "@/lib/api/errors";

// GET /api/change-requests - List change requests for user's organization
export const GET = withAuth(async (req, _ctx, session) => {
  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(Math.max(1, parseInt(searchParams.get("limit") || "50") || 50), 100);

    const isAdmin = session.user.role === "admin";

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    if (!isAdmin && !user.organizationId) {
      return NextResponse.json({ success: true, requests: [] });
    }

    const whereClause = isAdmin
      ? {}
      : {
          project: {
            organizationId: user.organizationId!,
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
  } catch (error) {
    return apiError(error, "Failed to fetch change requests");
  }
});
