-- Design-feedback turnaround loop: a set-once guard so Andy's sweep surfaces each
-- [DESIGN]-tagged edit/deny ProjectNote to Blayke exactly once. IF NOT EXISTS keeps
-- the manual prod apply idempotent (temp endpoint / prisma db execute).
ALTER TABLE "project_notes" ADD COLUMN IF NOT EXISTS "andy_seen_at" TIMESTAMP(3);

-- FIRST-DEPLOY BACKFILL — run once, before the sweep is live, so existing notes
-- don't fan out. Every note that exists at apply-time is treated as already-seen;
-- only new feedback notes (created after, hence NULL) surface.
UPDATE "project_notes" SET "andy_seen_at" = now() WHERE "andy_seen_at" IS NULL;
