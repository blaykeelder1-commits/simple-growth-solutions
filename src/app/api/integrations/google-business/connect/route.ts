import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { withAuth } from "@/lib/api/with-auth";
import { apiError } from "@/lib/api/errors";
import { searchBusiness } from "@/lib/integrations/google-business";

// POST /api/integrations/google-business/connect
// Searches for a business via Google Places API and creates an Integration record
export const POST = withAuth(async (request: NextRequest, _ctx, session) => {
  try {
    const body = await request.json();
    const { businessName, location } = body;

    if (!businessName) {
      return NextResponse.json(
        { success: false, message: "businessName is required" },
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

    // Search for the business
    const result = await searchBusiness(businessName, location);

    if (!result) {
      return NextResponse.json(
        {
          success: false,
          message: "No business found matching that name and location",
        },
        { status: 404 }
      );
    }

    // Upsert Integration record
    await prisma.integration.upsert({
      where: {
        organizationId_provider: {
          organizationId: user.organizationId,
          provider: "google_business",
        },
      },
      update: {
        status: "connected",
        externalAccountId: result.placeId,
        syncError: null,
      },
      create: {
        organizationId: user.organizationId,
        provider: "google_business",
        status: "connected",
        externalAccountId: result.placeId,
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        organizationId: user.organizationId,
        userId: user.id,
        action: "integration.connected",
        entityType: "integration",
        entityId: "google_business",
        newValues: {
          provider: "google_business",
          placeId: result.placeId,
          businessName: result.name,
        },
      },
    });

    return NextResponse.json({
      success: true,
      business: result,
    });
  } catch (error) {
    return apiError(error, "Failed to connect Google Business");
  }
});
