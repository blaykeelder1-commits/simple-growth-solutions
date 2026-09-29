import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { withAdmin } from "@/lib/api/with-auth";
import { apiError } from "@/lib/api/errors";

// TEMPORARY one-shot DDL for staff_messages (Render runs no migrations). Idempotent.
// Delete right after it has run in prod.
const STATEMENTS: string[] = [
  "CREATE TABLE IF NOT EXISTS \"staff_messages\" (\n    \"id\" TEXT NOT NULL,\n    \"role\" TEXT NOT NULL,\n    \"author_id\" TEXT,\n    \"content\" TEXT NOT NULL,\n    \"context\" TEXT,\n    \"andy_seen_at\" TIMESTAMP(3),\n    \"created_at\" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,\n    CONSTRAINT \"staff_messages_pkey\" PRIMARY KEY (\"id\")\n)",
  "CREATE INDEX IF NOT EXISTS \"staff_messages_role_andy_seen_at_idx\" ON \"staff_messages\"(\"role\", \"andy_seen_at\")",
  "CREATE INDEX IF NOT EXISTS \"staff_messages_created_at_idx\" ON \"staff_messages\"(\"created_at\")"
];

export const POST = withAdmin(async () => {
  try {
    for (const sql of STATEMENTS) await prisma.$executeRawUnsafe(sql);
    return NextResponse.json({ success: true, applied: STATEMENTS.length, staffMessages: await prisma.staffMessage.count() });
  } catch (error) {
    return apiError(error, "staff chat DDL failed");
  }
});
