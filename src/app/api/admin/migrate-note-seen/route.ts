import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { withAdmin } from "@/lib/api/with-auth";
import { apiError } from "@/lib/api/errors";

// TEMP one-shot prod migration: adds project_notes.andy_seen_at and backfills it
// (design-feedback turnaround loop). Idempotent; curl once from the VPS with
// ANDY_SERVICE_TOKEN, then this route is removed. Documented temp-endpoint playbook.
export const POST = withAdmin(async () => {
  try {
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "project_notes" ADD COLUMN IF NOT EXISTS "andy_seen_at" TIMESTAMP(3);`
    );
    const backfilled = await prisma.$executeRawUnsafe(
      `UPDATE "project_notes" SET "andy_seen_at" = now() WHERE "andy_seen_at" IS NULL;`
    );
    return NextResponse.json({ success: true, backfilled });
  } catch (error) {
    return apiError(error, "Failed to migrate project_notes.andy_seen_at");
  }
});
