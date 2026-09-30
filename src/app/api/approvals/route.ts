import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { withAdmin } from "@/lib/api/with-auth";
import { apiError } from "@/lib/api/errors";
import { actorFor } from "@/lib/work/events";
import { ApprovalError, createApproval, OPEN_STATUSES } from "@/lib/approvals";
import { ensureDuePauseTasks } from "@/lib/billing/cancellation";

// GET /api/approvals — the queue: every open item plus anything decided in the last 7 days.
export const GET = withAdmin(async () => {
  try {
    await ensureDuePauseTasks().catch(() => undefined); // never block the queue on it
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const items = await prisma.approvalItem.findMany({
      where: { OR: [{ status: { in: OPEN_STATUSES } }, { updatedAt: { gte: since } }] },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    return NextResponse.json({ success: true, items });
  } catch (error) {
    return apiError(error, "Failed to load approvals");
  }
});

// Only these kinds are created through the API. cr_ship comes from the ticket route (with
// its review) and build_start from new-build surfacing — never hand-made, so an item can't
// point at an arbitrary ticket or project.
const createSchema = z.object({
  kind: z.enum(["support_reply", "rule_change"]),
  refId: z.string().min(1),
  organizationId: z.string().nullable().optional(),
  title: z.string().min(1).max(300),
  draft: z.string().max(8000).nullable().optional(),
  previewUrl: z.string().url().nullable().optional(),
  agentNote: z.string().max(8000).nullable().optional(),
  review: z.unknown().optional(),
});

// POST /api/approvals — Andy queues an item (support reply draft, proposed rule).
// cr_ship items are created by the change-request route itself on review_ready.
export const POST = withAdmin(async (req, _ctx, session) => {
  try {
    const input = createSchema.parse(await req.json());
    const item = await createApproval(input, actorFor(session));
    return NextResponse.json({ success: true, item });
  } catch (error) {
    if (error instanceof ApprovalError) {
      return NextResponse.json({ success: false, message: error.message }, { status: error.status });
    }
    return apiError(error, "Failed to create approval");
  }
});
