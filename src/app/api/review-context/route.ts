import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { withAdmin } from "@/lib/api/with-auth";
import { apiError } from "@/lib/api/errors";
import { loadSupportContext } from "@/lib/support/assistant";
import { describeScope } from "@/lib/billing/plan-scope";
import { getPastMistakes } from "@/lib/review/mistakes";

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

    const [ctx, pastMistakes] = await Promise.all([loadSupportContext(organizationId), getPastMistakes()]);

    return NextResponse.json({
      success: true,
      organizationId,
      orgName: ctx.orgName,
      plan: ctx.plan,
      planScope: describeScope(ctx.plan),
      pastMistakes,
    });
  } catch (error) {
    return apiError(error, "Failed to load review context");
  }
});
