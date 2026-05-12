import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { prisma } from "@/lib/prisma";
import { checkStageUpsell } from "@/lib/journey/bridge";
import { STAGE_LABELS } from "@/lib/journey";

// GET /api/journey/upsell — Check if current user should see an upsell prompt
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ shouldPrompt: false });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user?.organizationId) {
      return NextResponse.json({ shouldPrompt: false });
    }

    const result = await checkStageUpsell(user.organizationId);

    if (result?.shouldPrompt && result.nextStage) {
      return NextResponse.json({
        shouldPrompt: true,
        nextStage: result.nextStage,
        nextStageLabel: STAGE_LABELS[result.nextStage],
        reason: result.reason,
      });
    }

    return NextResponse.json({ shouldPrompt: false });
  } catch {
    return NextResponse.json({ shouldPrompt: false });
  }
}

// POST /api/journey/upsell — Dismiss the upsell prompt (mark as prompted)
export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user?.organizationId) {
      return NextResponse.json({ error: "No organization" }, { status: 400 });
    }

    await prisma.organization.update({
      where: { id: user.organizationId },
      data: { nextStagePromptedAt: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
