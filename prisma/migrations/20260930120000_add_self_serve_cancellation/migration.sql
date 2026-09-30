-- Self-serve cancellation + one-time save offer. IF NOT EXISTS keeps the manual prod apply idempotent.
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "cancel_requested_at" TIMESTAMP(3);
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "cancel_at" TIMESTAMP(3);
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "cancel_reason" TEXT;
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "cancel_comment" TEXT;
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "pending_plan" TEXT;
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "save_offer_used_at" TIMESTAMP(3);
