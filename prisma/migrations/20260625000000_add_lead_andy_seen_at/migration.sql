-- Anti-retrigger "set-once" guard for Andy's lead/inquiry sweep.
-- Mirrors change_requests.andy_seen_at: stamped the first time Andy surfaces a
-- public inquiry to Blayke so the sweep (status='new' AND andy_seen_at IS NULL)
-- never re-notifies it. IF NOT EXISTS keeps the manual prod apply idempotent
-- (prisma db execute --url $DIRECT_URL), per the Render-shell migration playbook.
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "andy_seen_at" TIMESTAMP(3);

-- Index for the sweep's pending-new query.
CREATE INDEX IF NOT EXISTS "leads_status_andy_seen_at_idx" ON "leads"("status", "andy_seen_at");

-- BACKFILL (anti-fanout): treat every lead that already exists as "already seen"
-- so the first sweep after deploy cannot fan out a burst of notifications across
-- historical inquiries. Only brand-new, un-stamped 'new' leads are ever picked up.
UPDATE "leads" SET "andy_seen_at" = "updated_at" WHERE "andy_seen_at" IS NULL;
