import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { prisma } from "@/lib/db/prisma";
import { apiError } from "@/lib/api/errors";
import { z } from "zod";

const patchSchema = z.object({ active: z.boolean() });

// PATCH /api/admin/promo-codes/[id] — activate / deactivate a code. Admin only.
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }
    if (session.user.role !== "admin") {
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const { active } = patchSchema.parse(await request.json());

    const existing = await prisma.promoCode.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, message: "Code not found" }, { status: 404 });
    }

    const updated = await prisma.promoCode.update({
      where: { id },
      data: { active },
    });

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "promo_code_toggled",
        entityType: "promo_code",
        entityId: id,
        oldValues: { active: existing.active },
        newValues: { active },
      },
    });

    return NextResponse.json({ success: true, code: { id: updated.id, active: updated.active } });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, message: "Invalid input" }, { status: 400 });
    }
    return apiError(error, "Failed to update promo code");
  }
}
