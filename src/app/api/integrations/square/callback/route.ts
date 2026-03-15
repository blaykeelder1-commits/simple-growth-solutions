import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db/prisma";
import { exchangeCodeForTokens } from "@/lib/integrations/square";

// GET /api/integrations/square/callback
// Square redirects here after user authorizes (or denies)
export async function GET(request: NextRequest) {
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const redirectBase = `${baseUrl}/dashboard/chauffeur/integrations`;

  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    // Handle user denial or error from Square
    if (error) {
      return NextResponse.redirect(
        `${redirectBase}?error=square_denied`
      );
    }

    if (!code || !state) {
      return NextResponse.redirect(
        `${redirectBase}?error=square_missing_params`
      );
    }

    // Validate state token against the cookie
    const cookieStore = await cookies();
    const storedState = cookieStore.get("square_oauth_state")?.value;
    const userId = cookieStore.get("square_oauth_user")?.value;

    if (!storedState || storedState !== state) {
      return NextResponse.redirect(
        `${redirectBase}?error=square_invalid_state`
      );
    }

    if (!userId) {
      return NextResponse.redirect(
        `${redirectBase}?error=square_no_session`
      );
    }

    // Clear the OAuth cookies
    cookieStore.delete("square_oauth_state");
    cookieStore.delete("square_oauth_user");

    // Look up the user's organization
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user?.organizationId) {
      return NextResponse.redirect(
        `${redirectBase}?error=square_no_organization`
      );
    }

    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code);

    // Upsert the integration record
    await prisma.integration.upsert({
      where: {
        organizationId_provider: {
          organizationId: user.organizationId,
          provider: "square",
        },
      },
      update: {
        status: "connected",
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        tokenExpiresAt: tokens.expiresAt,
        externalAccountId: tokens.merchantId,
        syncError: null,
      },
      create: {
        organizationId: user.organizationId,
        provider: "square",
        status: "connected",
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        tokenExpiresAt: tokens.expiresAt,
        externalAccountId: tokens.merchantId,
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        organizationId: user.organizationId,
        userId: user.id,
        action: "integration.connected",
        entityType: "integration",
        entityId: "square",
        newValues: { provider: "square", merchantId: tokens.merchantId },
      },
    });

    return NextResponse.redirect(
      `${redirectBase}?connected=square`
    );
  } catch (error) {
    console.error("Square OAuth callback error:", error);
    return NextResponse.redirect(
      `${redirectBase}?error=square_callback_failed`
    );
  }
}
