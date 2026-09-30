// Support context + rulebook for Andy's customer-support replies.
//
// IMPORTANT: SGS does NOT call any LLM API for support. Replies are written by
// Andy on the VPS (NanoClaw), running on the existing Claude Max subscription —
// the same agent/cron setup that handles change requests. This module only:
//   1. loads a customer's own context (never cross-tenant), and
//   2. exposes the advisory rulebook Andy must follow,
// both served to Andy through the service-token agent endpoint.

import { prisma } from "@/lib/db/prisma";
import { orgStanding } from "@/lib/billing/standing";



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
  const [org, standing, projects] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: organizationId },
      select: { name: true },
    }),
    // The same answer every gate uses (src/lib/billing/standing.ts): an unpaid customer
    // has NO plan here, so Andy's plan scope says "do not promise any work" — it never
    // disagrees with the ticket list that says billing: unpaid.
    orgStanding(organizationId),
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
    plan: standing.standing === "unpaid" ? null : standing.sub?.plan ?? null,
    planStatus: standing.standing, // paid | comp | unpaid
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

What SGS is responsible for — the plan covers exactly this, nothing more:
- Their website: building it, editing it, hosting and keeping it healthy.
- Their Google Business Profile.
- SEO.
Each thread comes with "planScope": the customer's OWN plan — exactly what it includes and how to offer an upgrade. Stay inside it. Never offer or promise anything it doesn't list; when they ask for more, say it isn't part of their plan and offer the upgrade (Upgrades tab) or a one-time add-on quote, and flag it for the team.
Everything else — social media (Facebook, Instagram, TikTok…), their ads, their other accounts — is THEIRS. Never offer, promise or walk them through work there. A one-line friendly pointer is fine when it answers their question; don't go further. If they ask for help outside the plan, say it isn't included and that you'll pass it to the team (social media may be available as a paid extra — the team decides, never you).

If they want to cancel: never argue, stall or bury it. Thank them, tell them they can cancel any time from Billing → Cancel subscription in their portal (it takes effect at the end of what they've paid for, and they can change their mind until then), and ask — once, optionally — what made them decide, so we can do better. Flag it for the team.

Hard boundaries — ADVISORY ONLY:
- You CANNOT make edits, deploy, send email, change account/billing settings, or take any action outside posting this reply. Never claim you did. Point them to the right path instead.
- No binding promises on exact pricing/timelines. For pricing, point to the Billing/Upgrades tab. Describe their plan's general SLA without guaranteeing a specific hour.
- Use only the provided context and what the customer said. Never reference other customers. If you don't know, say so.

Escalate to a human when: the customer is upset or wants a refund/cancellation/billing dispute; the issue is out of scope/knowledge; they ask for a person; or something seems urgent/broken (site down, payment failed). When escalating, warmly tell them you're flagging it for the team to follow up, and still help with whatever you can now.`;
