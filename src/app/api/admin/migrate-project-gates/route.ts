import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { withAdmin } from "@/lib/api/with-auth";
import { apiError } from "@/lib/api/errors";

// TEMP one-shot prod migration (Phase 2: new-build surfacing + Gate 1).
// Adds website_projects.andy_seen_at + build_approved_at and backfills
// andy_seen_at so historical projects don't fan out on the first sweep.
// Idempotent (IF NOT EXISTS); curl once from the VPS with ANDY_SERVICE_TOKEN,
// then this route is removed. Mirrors the documented temp-endpoint playbook —
// the prod DB isn't reachable from the laptop and Render has no API key here.
export const POST = withAdmin(async () => {
  try {
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "website_projects" ADD COLUMN IF NOT EXISTS "andy_seen_at" TIMESTAMP(3);`
    );
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "website_projects" ADD COLUMN IF NOT EXISTS "build_approved_at" TIMESTAMP(3);`
    );
    const backfilled = await prisma.$executeRawUnsafe(
      `UPDATE "website_projects" SET "andy_seen_at" = now() WHERE "andy_seen_at" IS NULL;`
    );
    return NextResponse.json({ success: true, backfilled });
  } catch (error) {
    return apiError(error, "Failed to migrate project gates");
  }
});
