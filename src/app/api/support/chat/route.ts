import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { withAuth } from "@/lib/api/with-auth";
import { apiError } from "@/lib/api/errors";
import { z } from "zod";

const chatSchema = z.object({
  message: z.string().min(1).max(4000),
});

// POST /api/support/chat — customer posts a message. We just store it; Andy
// picks it up on the VPS (his Max-subscription cron, same as change requests)
// and posts a reply back via the service-token agent endpoint. No LLM call here.
export const POST = withAuth(async (req, _ctx, session) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { organizationId: true },
    });

    if (!user?.organizationId) {
      return NextResponse.json({
        ok: false,
        message:
          "Add your first website here in the portal and I can help with questions about it — head to My Projects → New.",
      });
    }

    const { message } = chatSchema.parse(await req.json());

    await prisma.supportMessage.create({
      data: {
        organizationId: user.organizationId,
        userId: session.user.id,
        role: "user",
        content: message,
      },
    });

    // pending=true tells the portal to start polling for Andy's reply.
    return NextResponse.json({ ok: true, pending: true });
  } catch (error) {
    return apiError(error, "Failed to send support message");
  }
});

// GET /api/support/chat — this org's support history (chronological). The portal
// polls this to surface Andy's reply when it lands.
export const GET = withAuth(async (_req, _ctx, session) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { organizationId: true },
    });
    if (!user?.organizationId) {
      return NextResponse.json({ messages: [] });
    }

    const rows = await prisma.supportMessage.findMany({
      where: { organizationId: user.organizationId },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: { role: true, content: true, createdAt: true },
    });

    return NextResponse.json({
      messages: rows.reverse().map((m) => ({
        role: m.role,
        content: m.content,
        timestamp: m.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    return apiError(error, "Failed to load support history");
  }
});
