import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { prisma } from "@/lib/db/prisma";
import { exchangeCodeForTokens, getGustoConfig } from "@/lib/integrations/gusto";
import { encrypt } from "@/lib/encryption";

// GET /api/integrations/gusto/callback - Handle Gusto OAuth callback
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.redirect(
        new URL("/auth/signin?error=unauthorized", request.url)
      );
    }

    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    // Handle OAuth errors from Gusto
    if (error) {
      console.error("Gusto OAuth error:", error);
      return NextResponse.redirect(
        new URL(
          `/dashboard/chauffeur/integrations?error=gusto_oauth_denied`,
          request.url
        )
      );
    }

    if (!code || !state) {
      return NextResponse.redirect(
        new URL(
          `/dashboard/chauffeur/integrations?error=gusto_missing_params`,
          request.url
        )
      );
    }

    // Validate state against cookie
    const storedState = request.cookies.get("gusto_oauth_state")?.value;
    if (!storedState || storedState !== state) {
      return NextResponse.redirect(
        new URL(
          `/dashboard/chauffeur/integrations?error=gusto_invalid_state`,
          request.url
        )
      );
    }

    const config = getGustoConfig();
    if (!config) {
      return NextResponse.redirect(
        new URL(
          `/dashboard/chauffeur/integrations?error=gusto_not_configured`,
          request.url
        )
      );
    }

    // Exchange authorization code for tokens
    const tokens = await exchangeCodeForTokens(config, code);

    // Get the user's organization
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user?.organizationId) {
      return NextResponse.redirect(
        new URL(
          `/dashboard/chauffeur/integrations?error=no_organization`,
          request.url
        )
      );
    }

    // Encrypt tokens before storing
    const encryptedAccessToken = encrypt(tokens.accessToken);
    const encryptedRefreshToken = encrypt(tokens.refreshToken);

    // Create or update the Gusto integration record
    await prisma.integration.upsert({
      where: {
        organizationId_provider: {
          organizationId: user.organizationId,
          provider: "gusto",
        },
      },
      update: {
        accessTokenEncrypted: encryptedAccessToken,
        refreshTokenEncrypted: encryptedRefreshToken,
        tokenExpiresAt: tokens.expiresAt,
        status: "connected",
        syncError: null,
      },
      create: {
        organizationId: user.organizationId,
        provider: "gusto",
        accessTokenEncrypted: encryptedAccessToken,
        refreshTokenEncrypted: encryptedRefreshToken,
        tokenExpiresAt: tokens.expiresAt,
        status: "connected",
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        organizationId: user.organizationId,
        userId: session.user.id,
        action: "integration.connected",
        entityType: "integration",
        newValues: { provider: "gusto" },
      },
    });

    // Clear the state cookie and redirect
    const response = NextResponse.redirect(
      new URL(
        `/dashboard/chauffeur/integrations?connected=gusto`,
        request.url
      )
    );
    response.cookies.set("gusto_oauth_state", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 0,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Gusto OAuth callback failed:", error);
    return NextResponse.redirect(
      new URL(
        `/dashboard/chauffeur/integrations?error=gusto_callback_failed`,
        request.url
      )
    );
  }
}
