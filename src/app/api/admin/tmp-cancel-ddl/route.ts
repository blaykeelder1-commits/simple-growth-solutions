import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { withAdmin } from "@/lib/api/with-auth";
import { apiError } from "@/lib/api/errors";

// TEMPORARY one-shot DDL for self-serve cancellation. Raw SQL only, so it deploys BEFORE
// the schema that reads these columns. Idempotent. Delete after it has run.
const STATEMENTS = [
  `ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "cancel_requested_at" TIMESTAMP(3)`,
  `ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "cancel_at" TIMESTAMP(3)`,
  `ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "cancel_reason" TEXT`,
  `ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "cancel_comment" TEXT`,
  `ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "pending_plan" TEXT`,
  `ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "save_offer_used_at" TIMESTAMP(3)`,
];

export const POST = withAdmin(async () => {
  try {
    for (const sql of STATEMENTS) await prisma.$executeRawUnsafe(sql);
    const cols = await prisma.$queryRawUnsafe<{ n: bigint }[]>(
      `SELECT COUNT(*)::bigint AS n FROM information_schema.columns WHERE (table_name = 'subscriptions' AND column_name IN ('cancel_requested_at','cancel_at','cancel_reason','cancel_comment','pending_plan')) OR (table_name = 'organizations' AND column_name = 'save_offer_used_at')`
    );
    return NextResponse.json({ success: true, columnsPresent: Number(cols[0]?.n ?? 0) });
  } catch (error) {
    return apiError(error, "cancel DDL failed");
  }
});
