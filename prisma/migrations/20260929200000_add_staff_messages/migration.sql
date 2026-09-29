-- Staff ↔ Andy portal chat. IF NOT EXISTS keeps the manual prod apply idempotent.
CREATE TABLE IF NOT EXISTS "staff_messages" (
    "id" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "author_id" TEXT,
    "content" TEXT NOT NULL,
    "context" TEXT,
    "andy_seen_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "staff_messages_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "staff_messages_role_andy_seen_at_idx" ON "staff_messages"("role", "andy_seen_at");
CREATE INDEX IF NOT EXISTS "staff_messages_created_at_idx" ON "staff_messages"("created_at");
