import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isApproverRequest } from "@/lib/api/with-auth";
import { apiError } from "@/lib/api/errors";
import { ApprovalError, approvalsUrl, CUSTOMER_FACING, decideApproval } from "@/lib/approvals";

const decideSchema = z.object({
  code: z.string().min(4).max(12),
  decision: z.enum(["approve", "edit", "reject"]),
  reason: z.string().max(4000).optional(),
});

// POST /api/approvals/decide — Blayke's WhatsApp command, relayed by the NanoClaw
// HOST (SGS_APPROVER_TOKEN). Approving never sends: customer-facing items wait for
// Send on /admin/approvals.
export async function POST(req: NextRequest) {
  if (!isApproverRequest(req)) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }
  try {
    const { code, decision, reason } = decideSchema.parse(await req.json());
    const item = await decideApproval({ code, decision, reason, via: "whatsapp", actor: "blayke" });
    return NextResponse.json({
      success: true,
      item: { code: item.code, kind: item.kind, title: item.title, status: item.status },
      needsSend: item.status === "approved" && CUSTOMER_FACING.has(item.kind),
      portalUrl: approvalsUrl(),
    });
  } catch (error) {
    if (error instanceof ApprovalError) {
      return NextResponse.json({ success: false, message: error.message }, { status: error.status });
    }
    return apiError(error, "Failed to apply decision");
  }
}
