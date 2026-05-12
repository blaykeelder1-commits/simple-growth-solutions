import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { withAdmin } from "@/lib/api/with-auth";
import { apiError } from "@/lib/api/errors";

// GET /api/admin/operators
// Returns the team — anyone with role admin or owner. Used to populate the
// assignee dropdown on the kanban dispatch board.
export const GET = withAdmin(async () => {
  try {
    const operators = await prisma.user.findMany({
      where: { role: { in: ["admin", "owner"] } },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        _count: { select: { assignedChangeRequests: { where: { status: { in: ["pending", "approved", "in_progress"] } } } } },
      },
      orderBy: { name: "asc" },
    });
    return NextResponse.json({
      success: true,
      operators: operators.map((o) => ({
        id: o.id,
        name: o.name,
        email: o.email,
        role: o.role,
        openAssignedCount: o._count.assignedChangeRequests,
      })),
    });
  } catch (error) {
    return apiError(error, "Failed to list operators");
  }
});
