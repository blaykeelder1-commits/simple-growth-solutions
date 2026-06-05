import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

// Liveness + database health probe. Public and unauthenticated so external
// uptime monitors (UptimeRobot, the GitHub Actions backstop, Render) can hit
// it. Returns 200 only when the app AND its database are reachable — this is
// exactly the signal that was missing when the Supabase project paused and
// every DB-backed request started 500-ing with no alert.
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Cheapest possible round-trip that proves the connection + pooler route.
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json(
      { status: "ok", db: "up", time: new Date().toISOString() },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  } catch {
    return NextResponse.json(
      { status: "error", db: "down", time: new Date().toISOString() },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }
}
