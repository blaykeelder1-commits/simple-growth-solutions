import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { prisma } from "@/lib/db/prisma";
import { apiError } from "@/lib/api/errors";
import { z } from "zod";

// Statuses an admin is allowed to set manually. This is the ops escape hatch
// for cases where Square didn't fire a webhook, a comp account is needed, or
// a sub needs to be force-canceled outside of Square. Production payments
// still flow through the Square webhook path.
const adminStatusSchema = z.object({
  status: z.enum(["active", "trialing", "canceled", "past_due"]),
  reason: z.string().min(1).max(500).optional(),
});

// PATCH /api/admin/subscriptions/[id]
// Manually transition a subscription's status. Admin/owner only.
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }
    if (session.user.role !== "admin" && session.user.role !== "owner") {
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { status, reason } = adminStatusSchema.parse(body);

    const existing = await prisma.subscription.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, message: "Subscription not found" }, { status: 404 });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const now = new Date();
      const sub = await tx.subscription.update({
        where: { id },
        data: {
          status,
          ...(status === "active" && !existing.currentPeriodStart
            ? {
                currentPeriodStart: now,
                currentPeriodEnd: addOneMonth(now),
              }
            : {}),
          ...(status === "canceled" ? { canceledAt: now } : {}),
        },
      });

      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          organizationId: existing.organizationId,
          action: "subscription_status_changed_manual",
          entityType: "subscription",
          entityId: id,
          oldValues: { status: existing.status },
          newValues: { status, reason: reason ?? null },
        },
      });

      return sub;
    });

    return NextResponse.json({
      success: true,
      subscription: {
        id: updated.id,
        plan: updated.plan,
        status: updated.status,
        currentPeriodEnd: updated.currentPeriodEnd,
        canceledAt: updated.canceledAt,
      },
    });
  } catch (error) {
    return apiError(error, "Failed to update subscription");
  }
}

function addOneMonth(date: Date): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + 1);
  return d;
}
