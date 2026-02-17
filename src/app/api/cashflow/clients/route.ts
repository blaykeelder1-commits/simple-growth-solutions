import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { withAuth } from "@/lib/api/with-auth";
import { apiError } from "@/lib/api/errors";

// GET /api/cashflow/clients - List clients with cursor-based pagination
export const GET = withAuth(async (request: NextRequest, _ctx, session) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user?.organizationId) {
      return NextResponse.json({
        success: true,
        data: [],
        pagination: { hasMore: false, nextCursor: null },
      });
    }

    const { searchParams } = new URL(request.url);
    const cursor = searchParams.get("cursor");
    const take = Math.min(parseInt(searchParams.get("take") || "20"), 100);

    const results = await prisma.client.findMany({
      take: take + 1,
      cursor: cursor ? { id: cursor } : undefined,
      orderBy: { createdAt: "desc" },
      where: { organizationId: user.organizationId },
      include: {
        _count: {
          select: { invoices: true },
        },
      },
    });

    const hasMore = results.length > take;
    const data = hasMore ? results.slice(0, -1) : results;

    return NextResponse.json({
      success: true,
      data,
      pagination: {
        hasMore,
        nextCursor: hasMore ? data[data.length - 1].id : null,
      },
    });
  } catch (error) {
    return apiError(error, "Failed to fetch clients");
  }
});
