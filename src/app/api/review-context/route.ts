import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { withAdmin } from "@/lib/api/with-auth";
import { apiError } from "@/lib/api/errors";
import { loadSupportContext } from "@/lib/support/assistant";
import { describeScope } from "@/lib/billing/plan-scope";

/**
 * Everything a reviewer (and Andy, before he writes) must hold a draft against, fetched by
 * the review tool itself so it never depends on what Andy remembers to pass:
 *   - the customer's plan scope (what we may promise, how to offer an upgrade)
 *   - past mistakes: Blayke's edit/reject reasons and what earlier reviews caught
 *
 * GET /api/review-context?entity=support:<orgId> | cr:<changeRequestId>
 */
export const GET = withAdmin(async (req) => {
  try {
    const entity = new URL(req.url).searchParams.get("entity") || "";
    const [type, id] = entity.split(":");
    let organizationId: string | null = null;
    if (type === "support") organizationId = id || null;
    if (type === "cr" && id) {
      const cr = await prisma.changeRequest.findUnique({
        where: { id },
        select: { project: { select: { organizationId: true } } },
      });
      organizationId = cr?.project.organizationId ?? null;
    }
    if (!organizationId) {
      return NextResponse.json({ success: false, message: "entity must be support:<orgId> or cr:<id>" }, { status: 400 });
    }

    const since = new Date(Date.now() - 45 * 24 * 60 * 60 * 1000);
    const [ctx, mistakes] = await Promise.all([
      loadSupportContext(organizationId),
      prisma.workEvent.findMany({
        where: {
          note: { not: null },
          OR: [
            { event: { in: ["edits_requested", "rejected"] }, createdAt: { gte: since }, NOT: { note: { startsWith: "Cleanup:" } } },
            { event: "lesson", createdAt: { gte: since }, note: { startsWith: "REVIEW CAUGHT" } },
            // Standing lessons from real mistakes that reached a customer — never expire.
            { event: "lesson", note: { startsWith: "MISTAKE" } },
          ],
        },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: { event: true, note: true, createdAt: true },
      }),
    ]);

    return NextResponse.json({
      success: true,
      organizationId,
      orgName: ctx.orgName,
      plan: ctx.plan,
      planScope: describeScope(ctx.plan),
      pastMistakes: mistakes.map((m) => `${m.createdAt.toISOString().slice(0, 10)} ${m.event === "lesson" ? "" : `Blayke ${m.event}: `}${m.note}`),
    });
  } catch (error) {
    return apiError(error, "Failed to load review context");
  }
});
