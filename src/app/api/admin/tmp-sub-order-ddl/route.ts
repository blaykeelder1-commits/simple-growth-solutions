import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { withAdmin } from "@/lib/api/with-auth";
import { apiError } from "@/lib/api/errors";

// TEMPORARY one-shot DDL: subscriptions.square_order_id, so a first payment is matched to
// the exact checkout that was paid (Render runs no migrations). Idempotent, nullable.
// Delete right after it has run in prod.
const STATEMENTS: string[] = [
  `ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "square_order_id" TEXT`,
  `CREATE INDEX IF NOT EXISTS "subscriptions_square_order_id_idx" ON "subscriptions"("square_order_id")`,
];

export const POST = withAdmin(async () => {
  try {
    for (const sql of STATEMENTS) await prisma.$executeRawUnsafe(sql);
    const cols = await prisma.$queryRawUnsafe<{ column_name: string }[]>(
      `SELECT column_name FROM information_schema.columns WHERE table_name = 'subscriptions' AND column_name = 'square_order_id'`
    );
    return NextResponse.json({ success: true, applied: STATEMENTS.length, present: cols.length === 1 });
  } catch (error) {
    return apiError(error, "subscription order DDL failed");
  }
});
