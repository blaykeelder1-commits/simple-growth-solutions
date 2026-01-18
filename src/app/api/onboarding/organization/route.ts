import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";

const organizationSchema = z.object({
  name: z.string().min(1, "Organization name is required").max(100),
  industry: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Check if user already has an organization
    const existingUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { organizationId: true },
    });

    if (existingUser?.organizationId) {
      return NextResponse.json(
        { error: "User already belongs to an organization" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validatedData = organizationSchema.parse(body);

    // Create organization and update user in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create the organization
      const organization = await tx.organization.create({
        data: {
          name: validatedData.name,
          industry: validatedData.industry || null,
          subscriptionTier: "starter",
          subscriptionStatus: "trial",
        },
      });

      // Update user with organization and make them owner
      await tx.user.update({
        where: { id: session.user.id },
        data: {
          organizationId: organization.id,
          role: "owner",
        },
      });

      // Log the action
      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          organizationId: organization.id,
          action: "organization_created",
          entityType: "organization",
          entityId: organization.id,
          newValues: {
            name: organization.name,
            industry: organization.industry,
          },
        },
      });

      return organization;
    });

    return NextResponse.json(
      {
        success: true,
        organization: {
          id: result.id,
          name: result.name,
          industry: result.industry,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to create organization" },
      { status: 500 }
    );
  }
}
