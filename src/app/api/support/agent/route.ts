import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { withAdmin } from "@/lib/api/with-auth";
import { apiError } from "@/lib/api/errors";
import { loadSupportContext, SUPPORT_RULEBOOK } from "@/lib/support/assistant";

// Andy-only endpoints (authenticated by the ANDY_SERVICE_TOKEN → admin). This is
// how Andy on the VPS reads pending support questions (his drafts are queued via /api/approvals),
// using his existing Max-subscription agent setup — no LLM call lives in SGS.

// GET /api/support/agent — threads whose latest message is from the customer
// (i.e. waiting on Andy), with that customer's own context + the rulebook.
export const GET = withAdmin(async (_req, _ctx, _session) => {
  try {
    const orgGroups = await prisma.supportMessage.groupBy({
      by: ["organizationId"],
      _max: { createdAt: true },
    });

    const threads: unknown[] = [];
    for (const g of orgGroups) {
      const recent = await prisma.supportMessage.findMany({
        where: { organizationId: g.organizationId },
        orderBy: { createdAt: "desc" },
        take: 12,
        select: { role: true, content: true, createdAt: true },
      });
      if (!recent.length) continue;
      // Pending only if the customer spoke last (latest message is role=user).
      if (recent[0].role !== "user") continue;
      // A draft for this thread is already waiting on Blayke — don't draft it again.
      const queued = await prisma.approvalItem.findFirst({
        where: { kind: "support_reply", refId: g.organizationId, status: { in: ["awaiting", "approved"] } },
        select: { id: true },
      });
      if (queued) continue;
      // If Blayke asked for changes to the last draft, hand Andy that feedback.
      const lastDecision = await prisma.approvalItem.findFirst({
        where: { kind: "support_reply", refId: g.organizationId, status: "edits_requested" },
        orderBy: { decidedAt: "desc" },
        select: { code: true, draft: true, feedback: true },
      });

      const context = await loadSupportContext(g.organizationId);
      threads.push({
        organizationId: g.organizationId,
        orgName: context.orgName,
        lastCustomerAt: recent[0].createdAt.toISOString(),
        context,
        editsRequested: lastDecision
          ? { code: lastDecision.code, previousDraft: lastDecision.draft, feedback: lastDecision.feedback }
          : null,
        messages: recent
          .reverse()
          .map((m) => ({ role: m.role, content: m.content })),
      });
    }

    return NextResponse.json({
      rulebook: SUPPORT_RULEBOOK,
      pendingCount: threads.length,
      threads,
    });
  } catch (error) {
    return apiError(error, "Failed to load support queue");
  }
});

// POST /api/support/agent — retired 2026-09-29. It let Andy post straight into a
// customer's thread. Replies are now queued with POST /api/approvals
// (kind "support_reply", refId = organizationId) and reach the customer only
// when Blayke presses Send on /admin/approvals.
export const POST = withAdmin(async () => {
  return NextResponse.json(
    {
      success: false,
      message: 'Direct replies are retired — POST /api/approvals {kind:"support_reply", refId:<organizationId>, draft}',
    },
    { status: 410 }
  );
});
