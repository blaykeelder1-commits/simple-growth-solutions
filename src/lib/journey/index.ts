import { prisma } from "@/lib/prisma";

export const CUSTOMER_STAGES = [
  "lead",
  "website_analysis",
  "website_build",
  "website_managed",
  "cybersecurity",
  "cashflow",
  "chauffeur",
] as const;

export type CustomerStage = (typeof CUSTOMER_STAGES)[number];

export const STAGE_LABELS: Record<CustomerStage, string> = {
  lead: "Lead",
  website_analysis: "Website Analysis",
  website_build: "Website Build",
  website_managed: "Managed Website",
  cybersecurity: "Cybersecurity",
  cashflow: "Cash Flow AI",
  chauffeur: "Business Chauffeur",
};

export const STAGE_DESCRIPTIONS: Record<CustomerStage, string> = {
  lead: "New lead captured",
  website_analysis: "Website analyzed, issues identified",
  website_build: "Free website being built",
  website_managed: "Website managed by SGS",
  cybersecurity: "Security scanning active",
  cashflow: "Cash Flow AI active",
  chauffeur: "Business Chauffeur active",
};

function getStageIndex(stage: string): number {
  return CUSTOMER_STAGES.indexOf(stage as CustomerStage);
}

export function getNextStage(currentStage: string): CustomerStage | null {
  const idx = getStageIndex(currentStage);
  if (idx === -1 || idx >= CUSTOMER_STAGES.length - 1) return null;
  return CUSTOMER_STAGES[idx + 1];
}

export async function advanceStage(
  organizationId: string,
  toStage: CustomerStage,
  triggeredBy: string = "system"
) {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { customerStage: true },
  });

  if (!org) throw new Error("Organization not found");

  const fromStage = org.customerStage;
  const now = new Date();

  await prisma.$transaction([
    prisma.organization.update({
      where: { id: organizationId },
      data: {
        customerStage: toStage,
        stageStartedAt: now,
        stageCompletedAt: null,
        nextStagePromptedAt: null,
      },
    }),
    prisma.journeyEvent.create({
      data: {
        organizationId,
        fromStage,
        toStage,
        triggeredBy,
      },
    }),
  ]);

  return { fromStage, toStage };
}

export async function markStageCompleted(organizationId: string) {
  await prisma.organization.update({
    where: { id: organizationId },
    data: { stageCompletedAt: new Date() },
  });
}

export async function markNextStagePrompted(organizationId: string) {
  await prisma.organization.update({
    where: { id: organizationId },
    data: { nextStagePromptedAt: new Date() },
  });
}

export async function getFunnelStats() {
  const counts = await prisma.organization.groupBy({
    by: ["customerStage"],
    _count: { id: true },
  });

  const stats: Record<string, number> = {};
  for (const stage of CUSTOMER_STAGES) {
    const match = counts.find((c) => c.customerStage === stage);
    stats[stage] = match?._count.id ?? 0;
  }

  return stats;
}
