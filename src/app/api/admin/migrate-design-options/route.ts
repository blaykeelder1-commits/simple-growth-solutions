import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { withAdmin } from "@/lib/api/with-auth";
import { apiError } from "@/lib/api/errors";

// TEMPORARY one-shot prod migration endpoint (prod-migration-via-endpoint
// playbook). Adds the design-options columns to website_projects with idempotent
// IF NOT EXISTS, then verifies. Curl once from the VPS with the Andy service
// token, confirm success, then DELETE this file. Uses raw SQL only — it does NOT
// reference the new Prisma fields, so it deploys safely BEFORE the picker code.
export const POST = withAdmin(async () => {
  try {
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "website_projects" ADD COLUMN IF NOT EXISTS "design_options" TEXT;`
    );
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "website_projects" ADD COLUMN IF NOT EXISTS "selected_design_option" TEXT;`
    );
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "website_projects" ADD COLUMN IF NOT EXISTS "design_selected_at" TIMESTAMP(3);`
    );
    await prisma.$executeRawUnsafe(
      `CREATE INDEX IF NOT EXISTS "website_projects_selected_design_option_idx" ON "website_projects"("selected_design_option");`
    );

    const columns = await prisma.$queryRawUnsafe(
      `SELECT column_name FROM information_schema.columns
       WHERE table_name = 'website_projects'
         AND column_name IN ('design_options','selected_design_option','design_selected_at')
       ORDER BY column_name;`
    );

    return NextResponse.json({ success: true, columns });
  } catch (error) {
    return apiError(error, "design-options migration failed");
  }
});
