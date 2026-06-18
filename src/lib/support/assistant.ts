// Andy — the customer-facing support assistant in the client portal.
//
// Scope is ADVISORY ONLY. Andy answers questions, explains how the portal and
// the customer's site work, troubleshoots, and helps the customer file a change
// request through the normal pipeline. He never sends email, changes settings,
// makes binding pricing/timeline promises, or takes any irreversible action from
// chat. When something is out of scope or he is unsure, he escalates to a human.
//
// Powered by Claude (the same brain as Andy on NanoClaw), running in-app so it
// can answer the customer in real time.

import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/db/prisma";

export const SUPPORT_MODEL = process.env.SUPPORT_MODEL || "claude-sonnet-4-6";

// Plans whose customers can submit change requests (mirrors the change-request route).
const MANAGED_PLAN_KEYS = new Set([
  "website_managed",
  "website_pro",
  "website_premium",
  "starter_bundle",
  "growth_bundle",
  "full_suite",
  "enterprise_suite",
]);
const ACTIVE_SUB_STATUSES = new Set(["active", "trialing"]);

export interface SupportContext {
  orgName: string;
  plan: string | null;
  planStatus: string | null;
  projects: { name: string; status: string; url: string | null }[];
  recentRequests: { title: string; status: string; createdAt: string }[];
}

export interface SupportTurn {
  role: "user" | "assistant";
  content: string;
}

export interface SupportReply {
  reply: string;
  escalate: boolean;
  escalateReason: string | null;
}

/** Load only THIS organization's data — never cross-tenant. */
export async function loadSupportContext(
  organizationId: string
): Promise<SupportContext> {
  const [org, sub, projects] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: organizationId },
      select: { name: true },
    }),
    prisma.subscription.findFirst({
      where: {
        organizationId,
        plan: { in: Array.from(MANAGED_PLAN_KEYS) },
        status: { in: Array.from(ACTIVE_SUB_STATUSES) },
      },
      orderBy: { createdAt: "desc" },
      select: { plan: true, status: true },
    }),
    prisma.websiteProject.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
      select: {
        projectName: true,
        status: true,
        deployedUrl: true,
        existingUrl: true,
        changeRequests: {
          orderBy: { createdAt: "desc" },
          take: 5,
          select: { title: true, status: true, createdAt: true },
        },
      },
    }),
  ]);

  const recentRequests = projects
    .flatMap((p) => p.changeRequests)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 8)
    .map((r) => ({
      title: r.title,
      status: r.status,
      createdAt: r.createdAt.toISOString().slice(0, 10),
    }));

  return {
    orgName: org?.name ?? "your business",
    plan: sub?.plan ?? null,
    planStatus: sub?.status ?? null,
    projects: projects.map((p) => ({
      name: p.projectName,
      status: p.status,
      url: p.deployedUrl || p.existingUrl || null,
    })),
    recentRequests,
  };
}

function planLabel(plan: string | null): string {
  if (!plan) return "no active management plan";
  const map: Record<string, string> = {
    website_managed: "Managed",
    website_pro: "Managed Pro",
    website_premium: "Managed Premium",
  };
  return map[plan] || plan;
}

export function buildSupportSystemPrompt(ctx: SupportContext): string {
  const projectLines = ctx.projects.length
    ? ctx.projects
        .map((p) => `- ${p.name} (${p.status}${p.url ? `, ${p.url}` : ""})`)
        .join("\n")
    : "- (no websites on file yet)";
  const requestLines = ctx.recentRequests.length
    ? ctx.recentRequests
        .map((r) => `- "${r.title}" — ${r.status} (submitted ${r.createdAt})`)
        .join("\n")
    : "- (no change requests yet)";

  return `You are Andy, the friendly support assistant for Simple Growth Solutions (SGS), a done-for-you website management service. You are talking with a customer inside their secure client portal.

# Who you're helping
- Business: ${ctx.orgName}
- Current plan: ${planLabel(ctx.plan)}${ctx.planStatus ? ` (${ctx.planStatus})` : ""}
- Their websites:
${projectLines}
- Their recent change requests:
${requestLines}

# What you DO
- Answer questions about their website, their plan, their change requests, and how to use the portal.
- Help them understand status ("where's my request?", "what does 'review_ready' mean?").
- Troubleshoot and explain in plain, friendly language.
- When they want an actual change made to their site, guide them to submit a Change Request (the "Change Requests" tab → "New Request"). That is how edits get made — our team/automation picks it up from there. You can help them write a clear request.

# Hard boundaries — you are ADVISORY ONLY
- You CANNOT make edits, deploy anything, send emails, change account/billing settings, issue refunds, or take any action outside this chat. Never say or imply you have done any of these. If asked, explain the right path (e.g. submit a change request, or visit the Billing tab).
- Do NOT make binding promises about exact pricing, timelines, or what will be built. For specific pricing, point them to the Billing/Upgrades tab. For delivery times, describe their plan's general SLA without guaranteeing a specific hour.
- Only use the information above and what the customer tells you. Never reference other customers or data that isn't theirs. If you don't know, say so.
- Be concise, warm, and professional. Use plain language.

# When to escalate to a human
Escalate when: the customer is upset or asking for a refund/cancellation/billing dispute; the issue is outside your scope or knowledge; they explicitly ask for a person; or something seems urgent/broken (site down, payment failed). When you escalate, tell the customer warmly that you're flagging it for the team who will follow up, and still help with anything you can right now.

# Output format (IMPORTANT)
Write your normal reply to the customer in plain text/markdown. Then, on the VERY LAST line, output a single control line and nothing after it:
CONTROL {"escalate": false}
or, if you are escalating:
CONTROL {"escalate": true, "reason": "<short reason>"}
The customer never sees the CONTROL line; it is stripped out. Always include exactly one CONTROL line as the final line.`;
}

const CONTROL_RE = /\n?CONTROL\s*(\{[\s\S]*\})\s*$/;

/** Generate Andy's next reply. Parses + strips the trailing CONTROL line. */
export async function generateSupportReply(args: {
  history: SupportTurn[];
  userMessage: string;
  context: SupportContext;
  apiKey: string;
}): Promise<SupportReply> {
  const client = new Anthropic({ apiKey: args.apiKey });

  const messages = [
    ...args.history.slice(-12).map((m) => ({
      role: m.role,
      content: m.content,
    })),
    { role: "user" as const, content: args.userMessage },
  ];

  const res = await client.messages.create({
    model: SUPPORT_MODEL,
    max_tokens: 1024,
    system: buildSupportSystemPrompt(args.context),
    messages,
  });

  const raw = res.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();

  let escalate = false;
  let escalateReason: string | null = null;
  let reply = raw;

  const match = raw.match(CONTROL_RE);
  if (match) {
    reply = raw.replace(CONTROL_RE, "").trim();
    try {
      const ctrl = JSON.parse(match[1]) as { escalate?: boolean; reason?: string };
      escalate = Boolean(ctrl.escalate);
      escalateReason = ctrl.reason?.trim() || null;
    } catch {
      // Malformed control line — treat as no escalation, keep the cleaned reply.
    }
  }

  // Never return an empty reply.
  if (!reply) {
    reply =
      "Sorry — I had trouble forming a reply just now. Could you rephrase, or I can flag this for a teammate?";
  }

  return { reply, escalate, escalateReason };
}
