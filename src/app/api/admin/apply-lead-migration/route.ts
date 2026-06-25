import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { withAdmin } from "@/lib/api/with-auth";
import { apiError } from "@/lib/api/errors";

// TEMPORARY one-shot migration runner (admin-token only). Applies the idempotent
// leads.andy_seen_at DDL on prod, since the Render build does not run migrations and
// there is no other prod-DB access path. Safe to call repeatedly (IF NOT EXISTS).
// REMOVE this route once the column is confirmed present.
export const POST = withAdmin(async (_req, _ctx, _session) => {
  try {
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "andy_seen_at" TIMESTAMP(3)`
    );
    await prisma.$executeRawUnsafe(
      `CREATE INDEX IF NOT EXISTS "leads_status_andy_seen_at_idx" ON "leads"("status", "andy_seen_at")`
    );
    // Backfill existing leads as already-seen so the first inquiry sweep doesn't fan out.
    const backfilled = await prisma.$executeRawUnsafe(
      `UPDATE "leads" SET "andy_seen_at" = "updated_at" WHERE "andy_seen_at" IS NULL`
    );

    // Confirm the column now exists by running the same query the agent feed uses.
    const newCount = await prisma.lead.count({
      where: { status: "new", andySeenAt: null },
    });

    return NextResponse.json({
      success: true,
      backfilled,
      newUnseenAfterBackfill: newCount,
    });
  } catch (error) {
    return apiError(error, "Failed to apply lead migration");
  }
});
