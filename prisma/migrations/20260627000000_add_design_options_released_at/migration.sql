-- Gate 2 (staff → customer) for the design-options workflow. Staff build options
-- and review them on the admin board first; the customer's in-portal picker stays
-- hidden until staff approve sending them, which stamps design_options_released_at.
-- IF NOT EXISTS keeps the manual prod apply idempotent (prisma db execute /
-- one-shot endpoint), per the Render-shell migration playbook.
ALTER TABLE "website_projects" ADD COLUMN IF NOT EXISTS "design_options_released_at" TIMESTAMP(3);
