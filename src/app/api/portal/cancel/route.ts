import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/api/with-auth";
import { apiError } from "@/lib/api/errors";
import { acceptDowngrade, CancelError, cancelState, scheduleCancel, undoCancel } from "@/lib/billing/cancellation";

// The customer's own organization only — never a parameter.
function orgOf(session: { user: { organizationId: string | null; id: string } }) {
  return session.user.id === "andy-service" ? null : session.user.organizationId;
}

// GET /api/portal/cancel — their plan, whether a cancellation is scheduled, and the one
// save offer they're eligible for (if any).
export const GET = withAuth(async (_req, _ctx, session) => {
  try {
    const org = orgOf(session);
    if (!org) return NextResponse.json({ success: false, message: "No organization" }, { status: 403 });
    return NextResponse.json({ success: true, ...(await cancelState(org)) });
  } catch (error) {
    return apiError(error, "Failed to load cancellation");
  }
});

const bodySchema = z.object({
  action: z.enum(["cancel", "undo", "downgrade"]),
  reason: z.string().max(40).optional(),
  comment: z.string().max(2000).optional(),
});

// POST /api/portal/cancel — cancel (end of paid period), undo, or take the downgrade offer.
export const POST = withAuth(async (req, _ctx, session) => {
  try {
    const org = orgOf(session);
    if (!org) return NextResponse.json({ success: false, message: "No organization" }, { status: 403 });
    const { action, reason, comment } = bodySchema.parse(await req.json());
    if (action === "cancel") {
      const r = await scheduleCancel(org, reason ?? "", comment ?? null);
      return NextResponse.json({ success: true, cancelAt: r.cancelAt });
    }
    if (action === "undo") {
      await undoCancel(org);
      return NextResponse.json({ success: true });
    }
    await acceptDowngrade(org, reason ?? "", comment ?? null);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof CancelError) {
      return NextResponse.json({ success: false, message: error.message }, { status: error.status });
    }
    return apiError(error, "Failed to update your plan");
  }
});
