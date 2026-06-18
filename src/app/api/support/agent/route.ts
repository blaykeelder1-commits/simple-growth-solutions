import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { withAdmin } from "@/lib/api/with-auth";
import { apiError } from "@/lib/api/errors";
import { apiLogger } from "@/lib/logger";
import { getAdminEmails, sendSupportEscalationEmail } from "@/lib/email";
import { loadSupportContext, SUPPORT_RULEBOOK } from "@/lib/support/assistant";
import { z } from "zod";

// Andy-only endpoints (authenticated by the ANDY_SERVICE_TOKEN → admin). This is
// how Andy on the VPS reads pending support questions and posts his replies,
// using his existing Max-subscription agent setup — no LLM call lives in SGS.

// GET /api/support/agent — threads whose latest message is from the customer
// (i.e. waiting on Andy), with that customer's own context + the rulebook.
export const GET = withAdmin(async (_req, _ctx, _session) => {
  try {
    const orgGroups = await prisma.supportMessage.groupBy({
      by: ["organizationId"],
      _max: { createdAt: true },
    });

    const threads: unknown[] = [];
    for (const g of orgGroups) {
      const recent = await prisma.supportMessage.findMany({
        where: { organizationId: g.organizationId },
        orderBy: { createdAt: "desc" },
        take: 12,
        select: { role: true, content: true, createdAt: true },
      });
      if (!recent.length) continue;
      // Pending only if the customer spoke last (latest message is role=user).
      if (recent[0].role !== "user") continue;

      const context = await loadSupportContext(g.organizationId);
      threads.push({
        organizationId: g.organizationId,
        orgName: context.orgName,
        lastCustomerAt: recent[0].createdAt.toISOString(),
        context,
        messages: recent
          .reverse()
          .map((m) => ({ role: m.role, content: m.content })),
      });
    }

    return NextResponse.json({
      rulebook: SUPPORT_RULEBOOK,
      pendingCount: threads.length,
      threads,
    });
  } catch (error) {
    return apiError(error, "Failed to load support queue");
  }
});

const replySchema = z.object({
  organizationId: z.string().min(1),
  reply: z.string().min(1).max(8000),
  escalate: z.boolean().optional().default(false),
  escalateReason: z.string().max(500).optional(),
});

// POST /api/support/agent — Andy posts a reply into a customer's thread.
export const POST = withAdmin(async (req, _ctx, _session) => {
  try {
    const { organizationId, reply, escalate, escalateReason } = replySchema.parse(
      await req.json()
    );

    // Reply must attach to a real user in the org. Use the latest customer
    // message's author (the person Andy is answering); fall back to any org user.
    // SupportMessage has no user relation, so resolve the user separately.
    const lastUserMsg = await prisma.supportMessage.findFirst({
      where: { organizationId, role: "user" },
      orderBy: { createdAt: "desc" },
      select: { userId: true, content: true },
    });
    let userId = lastUserMsg?.userId;
    if (!userId) {
      const anyUser = await prisma.user.findFirst({
        where: { organizationId },
        select: { id: true },
      });
      userId = anyUser?.id;
    }
    if (!userId) {
      return NextResponse.json(
        { success: false, message: "No user found for organization" },
        { status: 404 }
      );
    }

    await prisma.supportMessage.create({
      data: {
        organizationId,
        userId,
        role: "assistant",
        content: reply,
        escalated: escalate,
        escalateReason: escalateReason || null,
      },
    });

    if (escalate) {
      const [ctx, customer] = await Promise.all([
        loadSupportContext(organizationId),
        lastUserMsg?.userId
          ? prisma.user.findUnique({
              where: { id: lastUserMsg.userId },
              select: { name: true, email: true },
            })
          : Promise.resolve(null),
      ]);
      getAdminEmails()
        .then((emails) =>
          sendSupportEscalationEmail(emails, {
            orgName: ctx.orgName,
            customerName: customer?.name || customer?.email || "A customer",
            reason: escalateReason || "Andy flagged this conversation for a human.",
            lastMessage: lastUserMsg?.content || "(see portal thread)",
          })
        )
        .catch((e) =>
          apiLogger.warn({ err: e }, "Failed to send support escalation email")
        );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return apiError(error, "Failed to post support reply");
  }
});
