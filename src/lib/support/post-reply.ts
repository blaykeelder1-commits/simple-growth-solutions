import { prisma } from "@/lib/db/prisma";
import { apiLogger } from "@/lib/logger";
import { getAdminEmails, sendSupportEscalationEmail, sendSupportReplyEmail } from "@/lib/email";
import { loadSupportContext } from "@/lib/support/assistant";

/**
 * Post an assistant reply into a customer's portal support thread. The ONLY
 * caller that reaches a customer is the approval queue's Send (Blayke, in the
 * admin portal) — see src/lib/approvals. Returns false when the org has no user
 * to attach the message to.
 */
export async function postSupportReply(opts: {
  organizationId: string;
  reply: string;
  escalate?: boolean;
  escalateReason?: string | null;
}): Promise<boolean> {
  const { organizationId, reply, escalate = false, escalateReason } = opts;

  // Attach to the customer being answered (latest customer message's author),
  // falling back to any org user. SupportMessage has no user relation.
  const lastUserMsg = await prisma.supportMessage.findFirst({
    where: { organizationId, role: "user" },
    orderBy: { createdAt: "desc" },
    select: { userId: true, content: true },
  });
  let userId = lastUserMsg?.userId;
  if (!userId) {
    const anyUser = await prisma.user.findFirst({ where: { organizationId }, select: { id: true } });
    userId = anyUser?.id;
  }
  if (!userId) return false;

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

  // The customer is not watching the portal — email them the reply so it actually reaches them.
  const recipient = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, name: true } });
  if (recipient?.email) {
    const firstName = recipient.name?.trim().split(/\s+/)[0] || "there";
    sendSupportReplyEmail(recipient.email, firstName, reply).catch((e) =>
      apiLogger.error({ err: e, organizationId }, "Support reply posted but the customer email FAILED")
    );
  }

  if (escalate) {
    const [ctx, customer] = await Promise.all([
      loadSupportContext(organizationId),
      lastUserMsg?.userId
        ? prisma.user.findUnique({ where: { id: lastUserMsg.userId }, select: { name: true, email: true } })
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
      .catch((e) => apiLogger.warn({ err: e }, "Failed to send support escalation email"));
  }
  return true;
}
