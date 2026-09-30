import { NextResponse } from "next/server";
import { bestStanding, MANAGED_PLANS, STANDING_SELECT, type StandingResult } from "@/lib/billing/standing";
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
    // Anti-retrigger sweep filters (used by Andy's intake sweep):
    //   ?unseen=true        → only tickets Andy hasn't processed (andySeenAt IS NULL)
    //   ?createdWithin=<h>  → maxAge guard: only tickets created within the last <h> hours
    const unseenOnly = url.searchParams.get("unseen") === "true";
    const createdWithinHours = url.searchParams.get("createdWithin");

    type Where = {
      assigneeId?: string | null;
      status?: { in: string[] };
      slaDueAt?: { lte: Date };
      andySeenAt?: null;
      createdAt?: { gte: Date };
      OR?: ({ createdAt: { gte: Date } } | { updatedAt: { gte: Date } })[];
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
    if (unseenOnly) {
      where.andySeenAt = null;
    }
    if (createdWithinHours) {
      // "Recent" = created OR touched recently: a ticket Blayke sent back for edits, or one
      // that was just paid for, is new work even if it was first filed weeks ago.
      const since = new Date(Date.now() - parseInt(createdWithinHours, 10) * 60 * 60 * 1000);
      where.OR = [{ createdAt: { gte: since } }, { updatedAt: { gte: since } }];
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
          where: { organizationId: { in: orgIds }, plan: { in: MANAGED_PLANS } },
          select: { organizationId: true, ...STANDING_SELECT },
          orderBy: { createdAt: "desc" },
        })
      : [];
    // Plan + billing standing per org. A plan only counts when it's paid or an in-date
    // comp — Andy skips "unpaid" customers (and the claim route refuses them anyway).
    const standingByOrg = new Map<string, StandingResult>();
    for (const orgId of orgIds) {
      standingByOrg.set(orgId, bestStanding(subs.filter((s) => s.organizationId === orgId)));
    }
    const planByOrg = new Map<string, string>();
    for (const [orgId, st] of standingByOrg) {
      if (st.standing !== "unpaid" && st.sub) planByOrg.set(orgId, st.sub.plan);
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
        andySeenAt: r.andySeenAt,
        resolution: r.resolution,
        project: {
          id: r.project.id,
          name: r.project.projectName,
          organizationName: r.project.organization?.name ?? null,
          // Andy needs it to write to the customer (support-sgs.ts draft <organizationId>).
          organizationId: r.project.organization?.id ?? null,
        },
        plan: r.project.organization
          ? planByOrg.get(r.project.organization.id) ?? null
          : null,
        // paid | comp | unpaid — "unpaid" means: no new work, don't promise any.
        billing: r.project.organization
          ? standingByOrg.get(r.project.organization.id)?.standing ?? "unpaid"
          : "unpaid",
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
