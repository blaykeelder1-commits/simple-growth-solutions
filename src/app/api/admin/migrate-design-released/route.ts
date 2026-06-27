import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { withAdmin } from "@/lib/api/with-auth";
import { apiError } from "@/lib/api/errors";

// TEMPORARY one-shot prod migration — adds website_projects.design_options_released_at
// (Gate 2). Idempotent IF NOT EXISTS; raw SQL only so it deploys before the picker
// gate code. Curl once from the VPS with the Andy token, verify, then delete.
export const POST = withAdmin(async () => {
  try {
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "website_projects" ADD COLUMN IF NOT EXISTS "design_options_released_at" TIMESTAMP(3);`
    );
    const columns = await prisma.$queryRawUnsafe(
      `SELECT column_name FROM information_schema.columns
       WHERE table_name = 'website_projects' AND column_name = 'design_options_released_at';`
    );
    return NextResponse.json({ success: true, columns });
  } catch (error) {
    return apiError(error, "design-released migration failed");
  }
});
