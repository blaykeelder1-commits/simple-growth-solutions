import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { withAuth } from "@/lib/api/with-auth";
import { apiError } from "@/lib/api/errors";
import { searchBusiness } from "@/lib/integrations/yelp";

// POST /api/integrations/yelp/connect
// Searches for a business on Yelp and creates an Integration record
export const POST = withAuth(async (request: NextRequest, _ctx, session) => {
  try {
    const body = await request.json();
    const { businessName, location } = body;

    if (!businessName || !location) {
      return NextResponse.json(
        { success: false, message: "businessName and location are required" },
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

    // Search for the business on Yelp
    const result = await searchBusiness(businessName, location);

    if (!result) {
      return NextResponse.json(
        {
          success: false,
          message: "No business found matching that name and location on Yelp",
        },
        { status: 404 }
      );
    }

    // Upsert Integration record
    await prisma.integration.upsert({
      where: {
        organizationId_provider: {
          organizationId: user.organizationId,
          provider: "yelp",
        },
      },
      update: {
        status: "connected",
        externalAccountId: result.yelpId,
        syncError: null,
      },
      create: {
        organizationId: user.organizationId,
        provider: "yelp",
        status: "connected",
        externalAccountId: result.yelpId,
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        organizationId: user.organizationId,
        userId: user.id,
        action: "integration.connected",
        entityType: "integration",
        entityId: "yelp",
        newValues: {
          provider: "yelp",
          yelpId: result.yelpId,
          businessName: result.name,
        },
      },
    });

    return NextResponse.json({
      success: true,
      business: result,
    });
  } catch (error) {
    return apiError(error, "Failed to connect Yelp");
  }
});
