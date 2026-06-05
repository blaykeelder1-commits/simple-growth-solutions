import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { prisma } from "@/lib/db/prisma";
import { apiError } from "@/lib/api/errors";
import {
  normalizeCode,
  isWebsitePlan,
  STANDARD_PRICE_CENTS,
  FOUNDING_PRICE_CENTS,
  type WebsitePlanKey,
} from "@/lib/billing/founding";
import { z } from "zod";

// GET /api/admin/promo-codes — list founding/promo codes. Admin only.
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }
    if (session.user.role !== "admin") {
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
    }

    const codes = await prisma.promoCode.findMany({
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      // Surface the founding price points so the admin UI can show what each
      // code grants without duplicating the pricing table.
      foundingPrices: FOUNDING_PRICE_CENTS,
      standardPrices: STANDARD_PRICE_CENTS,
      codes: codes.map((c) => ({
        id: c.id,
        code: c.code,
        description: c.description,
        restrictToPlan: c.restrictToPlan,
        maxRedemptions: c.maxRedemptions,
        redeemedCount: c.redeemedCount,
        active: c.active,
        expiresAt: c.expiresAt,
        createdAt: c.createdAt,
      })),
    });
  } catch (error) {
    return apiError(error, "Failed to list promo codes");
  }
}

const createSchema = z.object({
  code: z.string().trim().min(3).max(40),
  description: z.string().trim().max(200).optional(),
  restrictToPlan: z
    .enum(["website_managed", "website_pro", "website_premium"])
    .optional(),
  maxRedemptions: z.number().int().positive().optional(),
  expiresAt: z.string().datetime().optional(),
});

// POST /api/admin/promo-codes — create a founding/promo code. Admin only.
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }
    if (session.user.role !== "admin") {
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const data = createSchema.parse(body);
    const code = normalizeCode(data.code);

    if (data.restrictToPlan && !isWebsitePlan(data.restrictToPlan)) {
      return NextResponse.json(
        { success: false, message: "restrictToPlan must be a website plan" },
        { status: 400 }
      );
    }

    const existing = await prisma.promoCode.findUnique({ where: { code } });
    if (existing) {
      return NextResponse.json(
        { success: false, message: "A code with that name already exists" },
        { status: 409 }
      );
    }

    const created = await prisma.promoCode.create({
      data: {
        code,
        description: data.description || null,
        restrictToPlan: (data.restrictToPlan as WebsitePlanKey | undefined) ?? null,
        maxRedemptions: data.maxRedemptions ?? null,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "promo_code_created",
        entityType: "promo_code",
        entityId: created.id,
        newValues: {
          code: created.code,
          restrictToPlan: created.restrictToPlan,
          maxRedemptions: created.maxRedemptions,
        },
      },
    });

    return NextResponse.json({ success: true, code: { id: created.id, code: created.code } }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }
    return apiError(error, "Failed to create promo code");
  }
}
