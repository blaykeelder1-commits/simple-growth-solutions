import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { withAdmin } from "@/lib/api/with-auth";
import { apiError } from "@/lib/api/errors";

// GET /api/admin/change-requests
// Used by the kanban dispatch board. Optional query params:
//   ?assigneeId=<userId|me|unassigned>
//   ?status=<pending,in_progress,...>
//   ?dueWithin=<24|72|168>  (hours)
export const GET = withAdmin(async (req, _ctx, session) => {
  try {
    const url = new URL(req.url);
    const assigneeFilter = url.searchParams.get("assigneeId");
    const statusFilter = url.searchParams.get("status");
    const dueWithinHours = url.searchParams.get("dueWithin");

    type Where = {
      assigneeId?: string | null;
      status?: { in: string[] };
      slaDueAt?: { lte: Date };
    };
    const where: Where = {};
    if (assigneeFilter === "me") {
      where.assigneeId = session.user.id;
    } else if (assigneeFilter === "unassigned") {
      where.assigneeId = null;
    } else if (assigneeFilter) {
      where.assigneeId = assigneeFilter;
    }
    if (statusFilter) {
      where.status = { in: statusFilter.split(",") };
    }
    if (dueWithinHours) {
      const cutoff = new Date(Date.now() + parseInt(dueWithinHours, 10) * 60 * 60 * 1000);
      where.slaDueAt = { lte: cutoff };
    }

    const requests = await prisma.changeRequest.findMany({
      where,
      include: {
        project: {
          select: {
            id: true,
            projectName: true,
            organization: { select: { id: true, name: true } },
          },
        },
        assignee: { select: { id: true, name: true, email: true } },
        requester: { select: { id: true, name: true, email: true } },
      },
      orderBy: [
        // Soonest SLA first; nulls last.
        { slaDueAt: { sort: "asc", nulls: "last" } },
        { createdAt: "desc" },
      ],
    });

    // Attach each org's active managed plan so the board can show the tier
    // (Premium/Pro tickets matter more than Managed at the same SLA).
    const orgIds = Array.from(
      new Set(
        requests
          .map((r) => r.project.organization?.id)
          .filter((id): id is string => Boolean(id))
      )
    );
    const subs = orgIds.length
      ? await prisma.subscription.findMany({
          where: {
            organizationId: { in: orgIds },
            status: { in: ["active", "trialing"] },
            plan: { startsWith: "website_" },
          },
          select: { organizationId: true, plan: true },
          orderBy: { createdAt: "desc" },
        })
      : [];
    const planByOrg = new Map<string, string>();
    for (const s of subs) {
      if (!planByOrg.has(s.organizationId)) planByOrg.set(s.organizationId, s.plan);
    }

    return NextResponse.json({
      success: true,
      changeRequests: requests.map((r) => ({
        id: r.id,
        title: r.title,
        description: r.description,
        type: r.type,
        priority: r.priority,
        status: r.status,
        isRush: r.isRush,
        slaDueAt: r.slaDueAt,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
        // Andy autonomous-fulfillment fields (null for human-handled tickets).
        previewUrl: r.previewUrl,
        agentNote: r.agentNote,
        resolution: r.resolution,
        project: {
          id: r.project.id,
          name: r.project.projectName,
          organizationName: r.project.organization?.name ?? null,
        },
        plan: r.project.organization
          ? planByOrg.get(r.project.organization.id) ?? null
          : null,
        assignee: r.assignee
          ? { id: r.assignee.id, name: r.assignee.name, email: r.assignee.email }
          : null,
        requester: r.requester
          ? { id: r.requester.id, name: r.requester.name, email: r.requester.email }
          : null,
      })),
    });
  } catch (error) {
    return apiError(error, "Failed to list change requests");
  }
});
