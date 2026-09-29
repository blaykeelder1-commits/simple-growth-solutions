-- Work timeline + single approval queue. IF NOT EXISTS keeps the manual prod
-- apply idempotent (Render's build runs no migrations — apply BEFORE the deploy).
CREATE TABLE IF NOT EXISTS "work_events" (
    "id" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "actor" TEXT NOT NULL,
    "note" TEXT,
    "touch" TEXT,
    "minutes" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "work_events_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "work_events_entity_type_entity_id_idx" ON "work_events"("entity_type", "entity_id");
CREATE INDEX IF NOT EXISTS "work_events_event_created_at_idx" ON "work_events"("event", "created_at");

CREATE TABLE IF NOT EXISTS "approval_items" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "ref_id" TEXT NOT NULL,
    "organization_id" TEXT,
    "title" TEXT NOT NULL,
    "draft" TEXT,
    "preview_url" TEXT,
    "agent_note" TEXT,
    "status" TEXT NOT NULL DEFAULT 'awaiting',
    "decided_via" TEXT,
    "decided_at" TIMESTAMP(3),
    "feedback" TEXT,
    "sent_at" TIMESTAMP(3),
    "sent_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "approval_items_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "approval_items_code_key" ON "approval_items"("code");
CREATE INDEX IF NOT EXISTS "approval_items_status_created_at_idx" ON "approval_items"("status", "created_at");
CREATE INDEX IF NOT EXISTS "approval_items_kind_ref_id_idx" ON "approval_items"("kind", "ref_id");
