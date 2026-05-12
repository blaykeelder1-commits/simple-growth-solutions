// Cross-stage data bridge
// Ensures data flows between stages so onboarding is seamless

import { prisma } from "@/lib/prisma";
import { advanceStage, type CustomerStage } from "./index";

/**
 * When a lead converts and gets a website, pre-fill their organization
 * with data from the lead and analysis for Cash Flow AI onboarding.
 */
export async function bridgeWebsiteToOrganization(leadId: string) {
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
  });

  if (!lead || !lead.convertedToOrgId) return;

  // Pre-fill organization settings from lead data
  await prisma.organizationSettings.upsert({
    where: { organizationId: lead.convertedToOrgId },
    update: {
      industryCategory: lead.industry || undefined,
    },
    create: {
      organizationId: lead.convertedToOrgId,
      industryCategory: lead.industry || null,
    },
  });
}

/**
 * When Cash Flow AI is activated, seed initial data from any
 * existing QuickBooks connection (if Chauffeur was connected first).
 */
export async function bridgeChauffeurToCashFlow(organizationId: string) {
  const integration = await prisma.integration.findFirst({
    where: {
      organizationId,
      provider: "quickbooks",
      status: { in: ["connected", "active"] },
    },
  });

  if (!integration) return { synced: false, reason: "No QB integration" };

  // Check if we already have clients/invoices
  const existingClients = await prisma.client.count({
    where: { organizationId },
  });

  if (existingClients > 0) {
    return { synced: false, reason: "Already has client data" };
  }

  // The QB sync will be triggered from the Cash Flow AI onboarding flow
  return { synced: true, integrationId: integration.id };
}

/**
 * When Cash Flow AI is activated, advance the journey stage
 * and pre-populate any available data.
 */
export async function onCashFlowActivated(organizationId: string) {
  await advanceStage(organizationId, "cashflow", "system");

  // Try to bridge data from Chauffeur if available
  return bridgeChauffeurToCashFlow(organizationId);
}

/**
 * When Business Chauffeur is activated, pull Cash Flow AI data
 * into the business intelligence context.
 */
export async function onChauffeurActivated(organizationId: string) {
  await advanceStage(organizationId, "chauffeur", "system");

  // Count available data sources for the dashboard
  const [clientCount, invoiceCount, integrationCount] = await Promise.all([
    prisma.client.count({ where: { organizationId } }),
    prisma.invoice.count({ where: { organizationId } }),
    prisma.integration.count({
      where: { organizationId, status: { in: ["connected", "active"] } },
    }),
  ]);

  return {
    dataSources: {
      clients: clientCount,
      invoices: invoiceCount,
      integrations: integrationCount,
    },
  };
}

/**
 * Check if an organization qualifies for the next stage upsell.
 * Returns the next stage and a reason if appropriate.
 */
export async function checkStageUpsell(organizationId: string): Promise<{
  shouldPrompt: boolean;
  nextStage?: CustomerStage;
  reason?: string;
} | null> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    include: {
      subscriptions: { where: { status: { in: ["active", "trialing"] } } },
    },
  });

  if (!org) return null;

  const stage = org.customerStage as CustomerStage;

  // Don't prompt if we already prompted in the last 7 days
  if (org.nextStagePromptedAt) {
    const daysSincePrompt = Math.floor(
      (Date.now() - org.nextStagePromptedAt.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysSincePrompt < 7) return { shouldPrompt: false };
  }

  switch (stage) {
    case "website_managed": {
      // After 30 days of managed website, prompt for cybersecurity
      const daysSinceStage = Math.floor(
        (Date.now() - org.stageStartedAt.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysSinceStage >= 30) {
        return {
          shouldPrompt: true,
          nextStage: "cybersecurity",
          reason: "Your website has been live for 30+ days. Protect it with security monitoring.",
        };
      }
      break;
    }
    case "cybersecurity": {
      // After cybersecurity, prompt for Cash Flow AI
      const daysSinceStage = Math.floor(
        (Date.now() - org.stageStartedAt.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysSinceStage >= 14) {
        return {
          shouldPrompt: true,
          nextStage: "cashflow",
          reason: "Ready to optimize your cash flow? Start with our free dashboard — upgrade to AR Agent anytime.",
        };
      }
      break;
    }
    case "cashflow": {
      // After Cash Flow AI shows value, prompt for Business Chauffeur
      const invoiceCount = await prisma.invoice.count({
        where: { organizationId },
      });
      if (invoiceCount >= 10) {
        return {
          shouldPrompt: true,
          nextStage: "chauffeur",
          reason: "You have real business data flowing. Get the full picture with Business Chauffeur.",
        };
      }
      break;
    }
  }

  return { shouldPrompt: false };
}
