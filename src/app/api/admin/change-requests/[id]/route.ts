import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { withAdmin } from "@/lib/api/with-auth";
import { apiError } from "@/lib/api/errors";
import { z } from "zod";

const updateSchema = z.object({
  status: z.enum(["pending", "approved", "in_progress", "completed", "rejected"]),
  resolution: z.string().optional(),
});

// PATCH /api/admin/change-requests/[id] - Update change request status
export const PATCH = withAdmin(async (req, ctx) => {
  try {
    const { id } = await ctx.params;
    const body = await req.json();
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
    return apiError(error, "Failed to update change request");
  }
});
