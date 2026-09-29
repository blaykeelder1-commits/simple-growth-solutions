import { NextResponse } from "next/server";
import { z } from "zod";
import { withAdmin } from "@/lib/api/with-auth";
import { apiError } from "@/lib/api/errors";
import { actorFor } from "@/lib/work/events";
import { ApprovalError, decideApproval, markRuleApplied, sendApproval } from "@/lib/approvals";

const actionSchema = z.object({
  action: z.enum(["approve", "edit", "reject", "send", "applied"]),
  reason: z.string().max(4000).optional(),
});

// POST /api/approvals/[id] — Blayke acts on an item from /admin/approvals.
// Andy's service token may only mark an APPROVED rule change as applied (after he
// writes it into his rulebook). He never approves, edits, rejects or sends.
export const POST = withAdmin(async (req, ctx, session) => {
  try {
    const { id } = await ctx.params;
    const { action, reason } = actionSchema.parse(await req.json());
    const actor = actorFor(session);
    if (action === "applied") {
      const item = await markRuleApplied(id, actor);
      return NextResponse.json({ success: true, item });
    }
    if (actor === "andy") {
      return NextResponse.json(
        { success: false, message: "Andy cannot approve or send — Blayke decides" },
        { status: 403 }
      );
    }
    const item =
      action === "send"
        ? await sendApproval(id, session.user.email || session.user.id, actor)
        : await decideApproval({ id, decision: action, reason, via: "portal", actor });
    return NextResponse.json({ success: true, item });
  } catch (error) {
    if (error instanceof ApprovalError) {
      return NextResponse.json({ success: false, message: error.message }, { status: error.status });
    }
    return apiError(error, "Failed to update approval");
  }
});
