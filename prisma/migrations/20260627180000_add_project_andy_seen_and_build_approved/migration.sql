-- Phase 2 (new-build surfacing + Gate 1) for the SGS customer workflow.
--   andy_seen_at      : set-once guard so Andy surfaces a new_build to Blayke on
--                       WhatsApp exactly once (mirrors leads.andy_seen_at).
--   build_approved_at : Gate 1 — Blayke's "build it" approval. No design options
--                       are built until this is stamped (symmetric with
--                       design_options_released_at, the Gate-2 send-to-customer stamp).
-- IF NOT EXISTS keeps the manual prod apply idempotent (prisma db execute /
-- one-shot endpoint), per the Render-shell migration playbook.
ALTER TABLE "website_projects" ADD COLUMN IF NOT EXISTS "andy_seen_at" TIMESTAMP(3);
ALTER TABLE "website_projects" ADD COLUMN IF NOT EXISTS "build_approved_at" TIMESTAMP(3);

-- FIRST-DEPLOY BACKFILL — run EXACTLY ONCE, immediately after the columns exist
-- and BEFORE the sgs-newbuild-sweep cron is live, so historical projects do not
-- all fan out on the first sweep. Every project that exists at apply-time is
-- treated as already-surfaced; only genuinely new submissions (created after this
-- runs, hence andy_seen_at IS NULL) will surface. Idempotent in practice because
-- it is executed a single deliberate time while the cron is still offline.
UPDATE "website_projects" SET "andy_seen_at" = now() WHERE "andy_seen_at" IS NULL;
