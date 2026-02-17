import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { withAdmin } from "@/lib/api/with-auth";
import { apiError } from "@/lib/api/errors";

// GET /api/admin/projects - List all projects (admin only, paginated)
export const GET = withAdmin(async (req) => {
  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1") || 1);
    const limit = Math.min(Math.max(1, parseInt(searchParams.get("limit") || "50") || 50), 100);
    const skip = (page - 1) * limit;

    const [projects, total] = await Promise.all([
      prisma.websiteProject.findMany({
        include: {
          organization: {
            select: { id: true, name: true },
          },
          changeRequests: {
            select: { id: true, status: true },
          },
        },
        orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
        take: limit,
        skip,
      }),
      prisma.websiteProject.count(),
    ]);

    return NextResponse.json({
      success: true,
      projects,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    return apiError(error, "Failed to fetch projects");
  }
});
