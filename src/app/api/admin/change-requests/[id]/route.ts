import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";

const updateSchema = z.object({
  status: z.enum(["pending", "approved", "in_progress", "completed", "rejected"]),
  resolution: z.string().optional(),
});

// PATCH /api/admin/change-requests/[id] - Update change request status
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const { id } = await params;

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    // Check admin role
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (user?.role !== "admin") {
      return NextResponse.json(
        { success: false, message: "Admin access required" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = updateSchema.parse(body);

    const changeRequest = await prisma.changeRequest.update({
      where: { id },
      data: {
        status: validatedData.status,
        ...(validatedData.resolution && { resolution: validatedData.resolution }),
      },
    });

    return NextResponse.json({ success: true, changeRequest });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: "Invalid data", errors: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, message: "Failed to update change request" },
      { status: 500 }
    );
  }
}
