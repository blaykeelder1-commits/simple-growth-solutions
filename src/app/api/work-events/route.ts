import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { withAdmin } from "@/lib/api/with-auth";
import { apiError } from "@/lib/api/errors";
import { actorFor, recordWorkEvent } from "@/lib/work/events";

// Events that carry what the loop learns from: Blayke's reasons for edits and
// rejections, Andy's lessons when he ships or triages, and free-standing lessons.
const LESSON_EVENTS = ["edits_requested", "rejected", "shipped", "triaged", "lesson"];

// GET /api/work-events?days=7 — the week's lessons plus a starvation line, so the
// rulebook review reports "3 closed, 1 without a lesson" instead of silence.
export const GET = withAdmin(async (req) => {
  try {
    const days = Math.min(90, Math.max(1, Number(new URL(req.url).searchParams.get("days")) || 7));
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const events = await prisma.workEvent.findMany({
      where: { createdAt: { gte: since }, event: { in: LESSON_EVENTS } },
      orderBy: { createdAt: "asc" },
    });
    const closed = events.filter((e) => e.event === "shipped" || e.event === "triaged");
    const starvation = {
      days,
      closedTickets: closed.length,
      closedWithoutLesson: closed.filter((e) => !e.note).length,
      blaykeEditRequests: events.filter((e) => e.event === "edits_requested").length,
      blaykeRejections: events.filter((e) => e.event === "rejected").length,
      touchesCaptured: events.filter((e) => e.touch).length,
    };
    return NextResponse.json({ success: true, starvation, events });
  } catch (error) {
    return apiError(error, "Failed to load work events");
  }
});

const lessonSchema = z.object({
  entityType: z.enum(["cr", "project", "support", "lead", "rule"]),
  entityId: z.string().min(1),
  lesson: z.string().min(10).max(4000),
  touch: z.string().max(2000).optional(),
  minutes: z.number().int().min(0).max(1440).optional(),
});

// POST /api/work-events — record a lesson (Andy's `ship-sgs.ts log`, or Blayke).
export const POST = withAdmin(async (req, _ctx, session) => {
  try {
    const input = lessonSchema.parse(await req.json());
    await recordWorkEvent({
      entityType: input.entityType,
      entityId: input.entityId,
      event: "lesson",
      actor: actorFor(session),
      note: input.lesson,
      touch: input.touch,
      minutes: input.minutes,
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return apiError(error, "Failed to record lesson");
  }
});
