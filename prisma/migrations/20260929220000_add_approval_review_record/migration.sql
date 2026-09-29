-- 3-pass review record on approval items. Idempotent for the manual prod apply.
ALTER TABLE "approval_items" ADD COLUMN IF NOT EXISTS "review_record" TEXT;
