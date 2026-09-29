import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { withAdmin } from "@/lib/api/with-auth";
import { apiError } from "@/lib/api/errors";

// NanoClaw ↔ portal chat bridge (ANDY_SERVICE_TOKEN → admin).
function requireAndy(session: { user: { id: string } }) {
  return session.user.id === "andy-service"
    ? null
    : NextResponse.json({ success: false, message: "Andy service token only" }, { status: 403 });
}

// GET — staff messages Andy hasn't picked up yet (oldest first).
export const GET = withAdmin(async (_req, _ctx, session) => {
  const denied = requireAndy(session);
  if (denied) return denied;
  try {
    const messages = await prisma.staffMessage.findMany({
      where: { role: "blayke", andySeenAt: null },
      orderBy: { createdAt: "asc" },
      take: 20,
    });
    return NextResponse.json({ success: true, messages });
  } catch (error) {
    return apiError(error, "Failed to load staff messages");
  }
});

const postSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("seen"), ids: z.array(z.string()).min(1).max(20) }),
  z.object({ action: z.literal("reply"), content: z.string().trim().min(1).max(20000) }),
]);

// POST — {action:"seen", ids} claims messages (set-once, so a restart can't re-feed
// them); {action:"reply", content} posts Andy's answer into the thread.
export const POST = withAdmin(async (req, _ctx, session) => {
  const denied = requireAndy(session);
  if (denied) return denied;
  try {
    const body = postSchema.parse(await req.json());
    if (body.action === "seen") {
      const res = await prisma.staffMessage.updateMany({
        where: { id: { in: body.ids }, role: "blayke", andySeenAt: null },
        data: { andySeenAt: new Date() },
      });
      return NextResponse.json({ success: true, claimed: res.count });
    }
    const message = await prisma.staffMessage.create({ data: { role: "andy", content: body.content } });
    return NextResponse.json({ success: true, message });
  } catch (error) {
    return apiError(error, "Failed to update Andy chat");
  }
});
