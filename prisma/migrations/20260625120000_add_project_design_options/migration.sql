-- In-portal design-options picker for new_build projects. Admin attaches 2–3
-- mockup directions (design_options = JSON-array string of {key,label,blurb,previewUrl}),
-- the customer previews them and picks one in the portal (selected_design_option),
-- stamped design_selected_at. Keeps the whole "choose a direction" loop inside the
-- customer portal — no email. IF NOT EXISTS keeps the manual prod apply idempotent
-- (prisma db execute --url $DIRECT_URL), per the Render-shell migration playbook.
ALTER TABLE "website_projects" ADD COLUMN IF NOT EXISTS "design_options" TEXT;
ALTER TABLE "website_projects" ADD COLUMN IF NOT EXISTS "selected_design_option" TEXT;
ALTER TABLE "website_projects" ADD COLUMN IF NOT EXISTS "design_selected_at" TIMESTAMP(3);

-- Index so an "awaiting the customer's pick" query (design_options set,
-- selected_design_option null) stays cheap.
CREATE INDEX IF NOT EXISTS "website_projects_selected_design_option_idx"
  ON "website_projects"("selected_design_option");
