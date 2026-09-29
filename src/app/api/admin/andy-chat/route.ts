import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { withAdmin } from "@/lib/api/with-auth";
import { apiError } from "@/lib/api/errors";

// GET /api/admin/andy-chat — the staff ↔ Andy conversation (latest 100, oldest first).
// `waiting` = the last message is staff's, so Andy is still working on it.
export const GET = withAdmin(async () => {
  try {
    const recent = await prisma.staffMessage.findMany({ orderBy: { createdAt: "desc" }, take: 100 });
    const messages = recent.reverse();
    const last = messages[messages.length - 1];
    return NextResponse.json({ success: true, messages, waiting: !!last && last.role === "blayke" });
  } catch (error) {
    return apiError(error, "Failed to load Andy chat");
  }
});

const postSchema = z.object({
  content: z.string().trim().min(1).max(8000),
  context: z.string().max(500).optional(),
});

// POST /api/admin/andy-chat — a staff member writes to Andy. Andy's own replies come
// in through /api/admin/andy-chat/agent; his service token may not post here.
export const POST = withAdmin(async (req, _ctx, session) => {
  try {
    if (session.user.id === "andy-service") {
      return NextResponse.json({ success: false, message: "Andy replies via /api/admin/andy-chat/agent" }, { status: 403 });
    }
    const { content, context } = postSchema.parse(await req.json());
    const message = await prisma.staffMessage.create({
      data: { role: "blayke", authorId: session.user.id, content, context: context || null },
    });
    return NextResponse.json({ success: true, message });
  } catch (error) {
    return apiError(error, "Failed to send message to Andy");
  }
});
