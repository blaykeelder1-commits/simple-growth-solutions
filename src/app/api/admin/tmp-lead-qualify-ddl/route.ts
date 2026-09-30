import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { withAdmin } from "@/lib/api/with-auth";
import { apiError } from "@/lib/api/errors";

// TEMPORARY one-shot DDL for lead source + qualification columns (Render runs no
// migrations). Idempotent, nullable-only. Delete right after it has run in prod.
const STATEMENTS: string[] = [
  `ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "source" TEXT`,
  `ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "utm_source" TEXT`,
  `ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "utm_medium" TEXT`,
  `ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "utm_campaign" TEXT`,
  `ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "referrer" TEXT`,
  `ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "trade" TEXT`,
  `ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "desired_action" TEXT`,
  `ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "current_lead_source" TEXT`,
  `ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "ready_this_week" BOOLEAN`,
  `ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "fit_score" INTEGER`,
  `ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "fit_status" TEXT`,
  `ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "fit_reasons" TEXT`,
  `ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "qualified_at" TIMESTAMP(3)`,
  `CREATE INDEX IF NOT EXISTS "leads_source_idx" ON "leads"("source")`,
  `CREATE INDEX IF NOT EXISTS "leads_fit_status_idx" ON "leads"("fit_status")`,
];

export const POST = withAdmin(async () => {
  try {
    for (const sql of STATEMENTS) await prisma.$executeRawUnsafe(sql);
    const cols = await prisma.$queryRawUnsafe<{ column_name: string }[]>(
      `SELECT column_name FROM information_schema.columns WHERE table_name = 'leads' ORDER BY column_name`
    );
    return NextResponse.json({ success: true, applied: STATEMENTS.length, columns: cols.map((c) => c.column_name) });
  } catch (error) {
    return apiError(error, "lead qualify DDL failed");
  }
});
