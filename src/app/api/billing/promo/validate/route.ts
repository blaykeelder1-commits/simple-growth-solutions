import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { apiError } from "@/lib/api/errors";
import { validatePromoCode } from "@/lib/billing/founding";
import { z } from "zod";

const schema = z.object({
  code: z.string().trim().min(1).max(40),
  plan: z.string().min(1),
});

// POST /api/billing/promo/validate — preview a founding code's effect on a plan
// before checkout. Public so prospects can see founding pricing on the pricing
// page before signing up. Read-only: reveals only the already-published
// founding price and never reserves/redeems the code; redemption is still
// bounded by maxRedemptions at checkout/activation.
export async function POST(request: NextRequest) {
  try {
    const { code, plan } = schema.parse(await request.json());
    const result = await validatePromoCode(prisma, code, plan);

    if (!result.ok) {
      return NextResponse.json({ valid: false, message: result.error });
    }

    return NextResponse.json({
      valid: true,
      plan: result.plan,
      standardCents: result.standardCents,
      foundingCents: result.foundingCents,
      savingsCents: result.standardCents - result.foundingCents,
      introMonths: result.introMonths,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ valid: false, message: "Enter a valid code." }, { status: 400 });
    }
    return apiError(error, "Failed to validate promo code");
  }
}
