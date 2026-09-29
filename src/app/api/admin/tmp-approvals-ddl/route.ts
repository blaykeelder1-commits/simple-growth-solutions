import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { withAdmin } from "@/lib/api/with-auth";
import { apiError } from "@/lib/api/errors";

// TEMPORARY one-shot DDL (Render's build runs no migrations). Idempotent — every
// statement is IF NOT EXISTS. Delete this route right after it has run in prod.
const STATEMENTS: string[] = [
  "CREATE TABLE IF NOT EXISTS \"work_events\" (\n    \"id\" TEXT NOT NULL,\n    \"entity_type\" TEXT NOT NULL,\n    \"entity_id\" TEXT NOT NULL,\n    \"event\" TEXT NOT NULL,\n    \"actor\" TEXT NOT NULL,\n    \"note\" TEXT,\n    \"touch\" TEXT,\n    \"minutes\" INTEGER,\n    \"created_at\" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,\n    CONSTRAINT \"work_events_pkey\" PRIMARY KEY (\"id\")\n)",
  "CREATE INDEX IF NOT EXISTS \"work_events_entity_type_entity_id_idx\" ON \"work_events\"(\"entity_type\", \"entity_id\")",
  "CREATE INDEX IF NOT EXISTS \"work_events_event_created_at_idx\" ON \"work_events\"(\"event\", \"created_at\")",
  "CREATE TABLE IF NOT EXISTS \"approval_items\" (\n    \"id\" TEXT NOT NULL,\n    \"code\" TEXT NOT NULL,\n    \"kind\" TEXT NOT NULL,\n    \"ref_id\" TEXT NOT NULL,\n    \"organization_id\" TEXT,\n    \"title\" TEXT NOT NULL,\n    \"draft\" TEXT,\n    \"preview_url\" TEXT,\n    \"agent_note\" TEXT,\n    \"status\" TEXT NOT NULL DEFAULT 'awaiting',\n    \"decided_via\" TEXT,\n    \"decided_at\" TIMESTAMP(3),\n    \"feedback\" TEXT,\n    \"sent_at\" TIMESTAMP(3),\n    \"sent_by\" TEXT,\n    \"created_at\" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,\n    \"updated_at\" TIMESTAMP(3) NOT NULL,\n    CONSTRAINT \"approval_items_pkey\" PRIMARY KEY (\"id\")\n)",
  "CREATE UNIQUE INDEX IF NOT EXISTS \"approval_items_code_key\" ON \"approval_items\"(\"code\")",
  "CREATE INDEX IF NOT EXISTS \"approval_items_status_created_at_idx\" ON \"approval_items\"(\"status\", \"created_at\")",
  "CREATE INDEX IF NOT EXISTS \"approval_items_kind_ref_id_idx\" ON \"approval_items\"(\"kind\", \"ref_id\")"
];

export const POST = withAdmin(async () => {
  try {
    for (const sql of STATEMENTS) await prisma.$executeRawUnsafe(sql);
    const [workEvents, approvalItems] = await Promise.all([
      prisma.workEvent.count(),
      prisma.approvalItem.count(),
    ]);
    return NextResponse.json({ success: true, applied: STATEMENTS.length, workEvents, approvalItems });
  } catch (error) {
    return apiError(error, "approvals DDL failed");
  }
});
