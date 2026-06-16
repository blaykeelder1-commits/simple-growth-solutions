-- Anti-retrigger "set-once" guard for Andy's intake sweep.
-- Mirrors subscriptions.founding_reminder_sent_at: stamped the first time Andy
-- processes a ticket so the sweep (status='pending' AND andy_seen_at IS NULL)
-- never re-notifies or re-works it.
ALTER TABLE "change_requests" ADD COLUMN "andy_seen_at" TIMESTAMP(3);

-- Index for the sweep's pending-new query.
CREATE INDEX "change_requests_status_andy_seen_at_idx" ON "change_requests"("status", "andy_seen_at");

-- BACKFILL (anti-fanout): treat every ticket that already exists as "already
-- seen" so the first sweep after deploy cannot fan out a burst of notifications
-- across historical rows. Only un-stamped pending rows would ever be picked up;
-- stamping them here makes the first run a clean no-op for old tickets.
UPDATE "change_requests" SET "andy_seen_at" = "updated_at" WHERE "andy_seen_at" IS NULL;
