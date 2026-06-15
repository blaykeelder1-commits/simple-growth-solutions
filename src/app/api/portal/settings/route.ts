import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";

// Real persistence for the portal Settings page. Previously the page faked a
// save (a setTimeout) and never wrote anything — this backs it with the DB.

// GET /api/portal/settings — current profile + organization values to populate
// the form (so the customer sees their real data, not empty placeholders).
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      name: true,
      email: true,
      organization: { select: { name: true, industry: true } },
    },
  });

  return NextResponse.json({
    success: true,
    settings: {
      name: user?.name ?? "",
      email: user?.email ?? "",
      organizationName: user?.organization?.name ?? "",
      industry: user?.organization?.industry ?? "",
    },
  });
}

const updateSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  organizationName: z.string().trim().min(1).max(100).optional(),
  industry: z.string().trim().max(100).optional(),
});

// PATCH /api/portal/settings — persist profile name + organization fields.
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const data = updateSchema.parse(await request.json());

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { organizationId: true },
    });

    if (data.name !== undefined) {
      await prisma.user.update({
        where: { id: session.user.id },
        data: { name: data.name },
      });
    }

    if (
      (data.organizationName !== undefined || data.industry !== undefined) &&
      user?.organizationId
    ) {
      await prisma.organization.update({
        where: { id: user.organizationId },
        data: {
          ...(data.organizationName !== undefined ? { name: data.organizationName } : {}),
          ...(data.industry !== undefined ? { industry: data.industry } : {}),
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: error.issues[0].message },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, message: "Failed to save settings" },
      { status: 500 }
    );
  }
}
