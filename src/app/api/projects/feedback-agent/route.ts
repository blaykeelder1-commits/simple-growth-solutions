import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { withAdmin } from "@/lib/api/with-auth";
import { apiError } from "@/lib/api/errors";
import { z } from "zod";

// Andy-only (ANDY_SERVICE_TOKEN → admin). Closes the design-feedback turnaround:
// when the owner clicks "Request edits" / "Deny" on the admin review card, a
// [DESIGN]-tagged internal ProjectNote is created. This endpoint lets Andy surface
// each one to Blayke on WhatsApp exactly once (projectNote.andySeenAt set-once),
// so Claude/Andy can revise and re-post the options. Mirrors /api/projects/agent.

const DESIGN_TAG = "[DESIGN]";
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
const BASE_URL = "https://simple-growth-solution.com";

// GET /api/projects/feedback-agent — unsurfaced design edit/deny requests.
export const GET = withAdmin(async () => {
  try {
    const since = new Date(Date.now() - MAX_AGE_MS);
    // Surface BOTH staff (internal) and customer (client-visible) [DESIGN] notes —
    // the design conversation flows both ways through the one thread.
    const notes = await prisma.projectNote.findMany({
      where: {
        andySeenAt: null,
        createdAt: { gte: since },
        content: { startsWith: DESIGN_TAG },
      },
      orderBy: { createdAt: "asc" },
      take: 25,
      select: {
        id: true,
        content: true,
        isInternal: true,
        createdAt: true,
        projectId: true,
        project: {
          select: {
            projectName: true,
            organization: { select: { name: true } },
          },
        },
      },
    });

    return NextResponse.json({
      pendingCount: notes.length,
      feedback: notes.map((n) => {
        const denied = n.content.includes("DENIED");
        return {
          noteId: n.id,
          projectId: n.projectId,
          projectName: n.project?.projectName ?? null,
          businessName: n.project?.organization?.name ?? null,
          decision: denied ? "denied" : "edits",
          // Customer notes are client-visible; staff notes are internal.
          source: n.isInternal ? "staff" : "customer",
          // Strip the "[DESIGN] DENIED: " / "[DESIGN] EDITS REQUESTED: " prefix.
          feedback: n.content.replace(/^\[DESIGN\]\s*(DENIED|EDITS REQUESTED):\s*/, ""),
          adminUrl: `${BASE_URL}/admin/projects/${n.projectId}`,
          createdAt: n.createdAt.toISOString(),
        };
      }),
    });
  } catch (error) {
    return apiError(error, "Failed to load design feedback");
  }
});

const seenSchema = z.object({
  noteId: z.string().min(1),
});

// POST /api/projects/feedback-agent — mark a feedback note surfaced (set-once).
export const POST = withAdmin(async (req) => {
  try {
    const { noteId } = seenSchema.parse(await req.json());
    const result = await prisma.projectNote.updateMany({
      where: { id: noteId, andySeenAt: null },
      data: { andySeenAt: new Date() },
    });
    return NextResponse.json({ success: true, marked: result.count > 0 });
  } catch (error) {
    return apiError(error, "Failed to mark feedback seen");
  }
});
