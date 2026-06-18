import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { withAuth } from "@/lib/api/with-auth";
import { apiError } from "@/lib/api/errors";
import { apiLogger } from "@/lib/logger";
import { getAdminEmails, sendSupportEscalationEmail } from "@/lib/email";
import {
  loadSupportContext,
  generateSupportReply,
  type SupportTurn,
} from "@/lib/support/assistant";
import { z } from "zod";

const chatSchema = z.object({
  message: z.string().min(1).max(4000),
});

// POST /api/support/chat — send a message to Andy, get his reply.
export const POST = withAuth(async (req, _ctx, session) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { organizationId: true },
    });

    if (!user?.organizationId) {
      return NextResponse.json({
        reply:
          "Once you've added your first website here in the portal, I can help with questions about it. Head to **My Projects → New** to get started, and I'll be right here.",
        escalate: false,
      });
    }
    const organizationId = user.organizationId;

    const { message } = chatSchema.parse(await req.json());

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      // Graceful degrade — never hard-fail the chat if the key isn't set yet.
      return NextResponse.json({
        reply:
          "I'm not fully switched on yet — our team is finishing my setup. In the meantime, you can submit a Change Request under the **Change Requests** tab and we'll jump on it.",
        escalate: false,
        notConfigured: true,
      });
    }

    // Prior turns for context (chronological).
    const priorRows = await prisma.supportMessage.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
      take: 12,
      select: { role: true, content: true },
    });
    const history: SupportTurn[] = priorRows
      .reverse()
      .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

    const context = await loadSupportContext(organizationId);
    const { reply, escalate, escalateReason } = await generateSupportReply({
      history,
      userMessage: message,
      context,
      apiKey,
    });

    // Persist both turns. Logging must not break the chat experience.
    try {
      await prisma.supportMessage.createMany({
        data: [
          { organizationId, userId: session.user.id, role: "user", content: message },
          {
            organizationId,
            userId: session.user.id,
            role: "assistant",
            content: reply,
            escalated: escalate,
            escalateReason: escalateReason,
          },
        ],
      });
    } catch (e) {
      apiLogger.warn({ err: e }, "Failed to persist support messages");
    }

    // On escalation, loop in staff by email (excluding the submitter so an
    // admin-customer isn't pinged about their own chat).
    if (escalate) {
      getAdminEmails({ exclude: session.user.email })
        .then((emails) =>
          sendSupportEscalationEmail(emails, {
            orgName: context.orgName,
            customerName: session.user.name || session.user.email || "A customer",
            reason: escalateReason || "Andy flagged this conversation for a human.",
            lastMessage: message,
          })
        )
        .catch((e) => apiLogger.warn({ err: e }, "Failed to send support escalation email"));
    }

    return NextResponse.json({ reply, escalate });
  } catch (error) {
    return apiError(error, "Failed to process support message");
  }
});

// GET /api/support/chat — load this org's support history (chronological).
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
