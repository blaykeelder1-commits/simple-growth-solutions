import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { withAdmin } from "@/lib/api/with-auth";
import { apiError } from "@/lib/api/errors";

// TEMPORARY one-shot DDL: approval_items.review_record. Raw SQL only, so it deploys
// BEFORE the schema that reads the column. Idempotent. Delete after it has run.
export const POST = withAdmin(async () => {
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "approval_items" ADD COLUMN IF NOT EXISTS "review_record" TEXT`);
    const cols = await prisma.$queryRawUnsafe<{ column_name: string }[]>(
      `SELECT column_name FROM information_schema.columns WHERE table_name = 'approval_items' AND column_name = 'review_record'`
    );
    return NextResponse.json({ success: true, hasColumn: cols.length === 1 });
  } catch (error) {
    return apiError(error, "review_record DDL failed");
  }
});
