import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";

// Zod schema for insight update
const updateInsightSchema = z.object({
  actionTaken: z.boolean().optional(),
  actionDetails: z.string().max(2000, "actionDetails exceeds maximum length of 2000 characters").optional(),
});

// PATCH /api/chauffeur/insights/[id] - Update an insight (mark as actioned)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id: insightId } = await params;

    if (!insightId) {
      return NextResponse.json(
        { success: false, message: "Insight ID is required" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user?.organizationId) {
      return NextResponse.json(
        { success: false, message: "No organization found" },
        { status: 404 }
      );
    }

    // Verify the insight belongs to the user's organization
    const insight = await prisma.businessInsight.findFirst({
      where: {
        id: insightId,
        organizationId: user.organizationId,
      },
    });

    if (!insight) {
      return NextResponse.json(
        { success: false, message: "Insight not found" },
        { status: 404 }
      );
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, message: "Invalid JSON body" },
        { status: 400 }
      );
    }

    // Validate input with Zod
    const parseResult = updateInsightSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { success: false, message: parseResult.error.issues[0]?.message || "Invalid input", errors: parseResult.error.issues },
        { status: 400 }
      );
    }

    const { actionTaken, actionDetails } = parseResult.data;

    const updatedInsight = await prisma.businessInsight.update({
      where: { id: insightId },
      data: {
        ...(typeof actionTaken === "boolean" && { actionTaken }),
        ...(actionDetails && { actionDetails }),
      },
    });

    return NextResponse.json({
      success: true,
      insight: {
        id: updatedInsight.id,
        category: updatedInsight.category,
        type: updatedInsight.type,
        title: updatedInsight.title,
        description: updatedInsight.description,
        confidence: updatedInsight.confidence ? Number(updatedInsight.confidence) : null,
        actionRequired: updatedInsight.actionRequired,
        actionTaken: updatedInsight.actionTaken,
        createdAt: updatedInsight.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("Failed to update insight:", error);
    return NextResponse.json(
      { success: false, message: "Failed to update insight" },
      { status: 500 }
    );
  }
}
