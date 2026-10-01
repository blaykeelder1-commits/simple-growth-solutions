import { NextResponse } from "next/server";
import { withAdmin } from "@/lib/api/with-auth";
import { apiError } from "@/lib/api/errors";
import { loadChanges } from "@/lib/agent/changes";

// GET /api/agent/changes?since=<ISO>
// Andy's pull-only lever feed (ANDY_SERVICE_TOKEN → admin). Read-only. Returns ids and
// event types since `since` (default: last 24 h, never more than 7 days back) plus the
// `next` cursor to send on the following call.
const MAX_LOOKBACK_MS = 7 * 24 * 60 * 60 * 1000;

export const GET = withAdmin(async (req) => {
  try {
    const now = new Date();
    const raw = new URL(req.url).searchParams.get("since");
    let since = raw ? new Date(raw) : new Date(now.getTime() - 24 * 60 * 60 * 1000);
    if (Number.isNaN(since.getTime())) {
      return NextResponse.json({ success: false, message: "since must be an ISO date" }, { status: 400 });
    }
    const floor = new Date(now.getTime() - MAX_LOOKBACK_MS);
    if (since < floor) since = floor;
    const result = await loadChanges(since, now);
    return NextResponse.json({ success: true, since: since.toISOString(), ...result });
  } catch (error) {
    return apiError(error, "Failed to load agent changes");
  }
});
