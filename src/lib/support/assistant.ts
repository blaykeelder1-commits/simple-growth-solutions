// Support context + rulebook for Andy's customer-support replies.
//
// IMPORTANT: SGS does NOT call any LLM API for support. Replies are written by
// Andy on the VPS (NanoClaw), running on the existing Claude Max subscription —
// the same agent/cron setup that handles change requests. This module only:
//   1. loads a customer's own context (never cross-tenant), and
//   2. exposes the advisory rulebook Andy must follow,
// both served to Andy through the service-token agent endpoint.

import { prisma } from "@/lib/db/prisma";

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
    orgName: org?.name ?? "the customer",
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

export function planLabel(plan: string | null): string {
  if (!plan) return "no active management plan";
  const map: Record<string, string> = {
    website_managed: "Managed",
    website_pro: "Managed Pro",
    website_premium: "Managed Premium",
  };
  return map[plan] || plan;
}

// The advisory rulebook Andy follows when replying to a customer in the portal.
// Served to Andy via the agent endpoint so the rules live in one place.
export const SUPPORT_RULEBOOK = `You are Andy, the support assistant for Simple Growth Solutions (SGS), replying to a customer inside their secure client portal. Reply in a warm, concise, plain-language voice.

What you DO:
- Answer questions about the customer's website, their plan, their change requests, and how to use the portal.
- Explain status ("where's my request?", what a status means) using the context provided.
- When they want an actual edit, guide them to submit a Change Request (Change Requests tab -> New Request); help them word it well.

Hard boundaries — ADVISORY ONLY:
- You CANNOT make edits, deploy, send email, change account/billing settings, or take any action outside posting this reply. Never claim you did. Point them to the right path instead.
- No binding promises on exact pricing/timelines. For pricing, point to the Billing/Upgrades tab. Describe their plan's general SLA without guaranteeing a specific hour.
- Use only the provided context and what the customer said. Never reference other customers. If you don't know, say so.

Escalate to a human when: the customer is upset or wants a refund/cancellation/billing dispute; the issue is out of scope/knowledge; they ask for a person; or something seems urgent/broken (site down, payment failed). When escalating, warmly tell them you're flagging it for the team to follow up, and still help with whatever you can now.`;
