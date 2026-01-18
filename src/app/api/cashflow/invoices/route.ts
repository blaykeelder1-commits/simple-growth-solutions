import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { prisma } from "@/lib/db/prisma";
import { logger } from "@/lib/logger";

// GET /api/cashflow/invoices - List invoices with cursor-based pagination
export async function GET(request: NextRequest) {
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
      return NextResponse.json({
        success: true,
        data: [],
        pagination: { hasMore: false, nextCursor: null },
      });
    }

    const { searchParams } = new URL(request.url);
    const cursor = searchParams.get("cursor");
    const take = Math.min(parseInt(searchParams.get("take") || "20"), 100);

    const results = await prisma.invoice.findMany({
      take: take + 1,
      cursor: cursor ? { id: cursor } : undefined,
      orderBy: { createdAt: "desc" },
      where: { organizationId: user.organizationId },
      include: {
        client: {
          select: { id: true, name: true },
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
    logger.error({ err: error, route: "cashflow/invoices" }, "GET error");
    return NextResponse.json(
      { success: false, message: "Failed to fetch invoices" },
      { status: 500 }
    );
  }
}
