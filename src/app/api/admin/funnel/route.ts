import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { prisma } from "@/lib/prisma";
import { CUSTOMER_STAGES, STAGE_LABELS } from "@/lib/journey";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as { role?: string }).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Stage counts
  const stageCounts = await prisma.organization.groupBy({
    by: ["customerStage"],
    _count: { id: true },
  });

  const funnel = CUSTOMER_STAGES.map((stage) => {
    const match = stageCounts.find((c) => c.customerStage === stage);
    return {
      stage,
      label: STAGE_LABELS[stage],
      count: match?._count.id ?? 0,
    };
  });

  // Recent journey events (last 50)
  const recentEvents = await prisma.journeyEvent.findMany({
    take: 50,
    orderBy: { createdAt: "desc" },
    include: {
      organization: { select: { name: true } },
    },
  });

  // Conversion rates between stages
  const totalOrgs = await prisma.organization.count();
  const conversions = funnel.map((stage, i) => ({
    ...stage,
    percentage: totalOrgs > 0 ? Math.round((stage.count / totalOrgs) * 100) : 0,
    conversionFromPrevious:
      i === 0
        ? 100
        : funnel[i - 1].count > 0
          ? Math.round((stage.count / funnel[i - 1].count) * 100)
          : 0,
  }));

  return NextResponse.json({
    success: true,
    funnel: conversions,
    recentEvents: recentEvents.map((e) => ({
      id: e.id,
      orgName: e.organization.name,
      fromStage: e.fromStage,
      toStage: e.toStage,
      triggeredBy: e.triggeredBy,
      createdAt: e.createdAt,
    })),
    totalOrganizations: totalOrgs,
  });
}
