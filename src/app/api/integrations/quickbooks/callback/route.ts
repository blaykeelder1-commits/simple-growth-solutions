import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db/prisma";
import { exchangeCodeForTokens } from "@/lib/integrations/quickbooks";

// GET /api/integrations/quickbooks/callback
// QuickBooks redirects here after user authorizes (or denies)
export async function GET(request: NextRequest) {
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const redirectBase = `${baseUrl}/dashboard/chauffeur/integrations`;

  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const realmId = searchParams.get("realmId");
    const error = searchParams.get("error");

    // Handle user denial or error from Intuit
    if (error) {
      return NextResponse.redirect(
        `${redirectBase}?error=quickbooks_denied`
      );
    }

    if (!code || !state || !realmId) {
      return NextResponse.redirect(
        `${redirectBase}?error=quickbooks_missing_params`
      );
    }

    // Validate state token against the cookie
    const cookieStore = await cookies();
    const storedState = cookieStore.get("qb_oauth_state")?.value;
    const userId = cookieStore.get("qb_oauth_user")?.value;

    if (!storedState || storedState !== state) {
      return NextResponse.redirect(
        `${redirectBase}?error=quickbooks_invalid_state`
      );
    }

    if (!userId) {
      return NextResponse.redirect(
        `${redirectBase}?error=quickbooks_no_session`
      );
    }

    // Clear the OAuth cookies
    cookieStore.delete("qb_oauth_state");
    cookieStore.delete("qb_oauth_user");

    // Look up the user's organization
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user?.organizationId) {
      return NextResponse.redirect(
        `${redirectBase}?error=quickbooks_no_organization`
      );
    }

    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code, realmId);

    // Upsert the integration record
    await prisma.integration.upsert({
      where: {
        organizationId_provider: {
          organizationId: user.organizationId,
          provider: "quickbooks",
        },
      },
      update: {
        status: "connected",
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        tokenExpiresAt: new Date(Date.now() + tokens.expiresIn * 1000),
        externalAccountId: realmId,
        syncError: null,
      },
      create: {
        organizationId: user.organizationId,
        provider: "quickbooks",
        status: "connected",
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        tokenExpiresAt: new Date(Date.now() + tokens.expiresIn * 1000),
        externalAccountId: realmId,
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        organizationId: user.organizationId,
        userId: user.id,
        action: "integration.connected",
        entityType: "integration",
        entityId: "quickbooks",
        newValues: { provider: "quickbooks", realmId },
      },
    });

    return NextResponse.redirect(
      `${redirectBase}?connected=quickbooks`
    );
  } catch (error) {
    console.error("QuickBooks OAuth callback error:", error);
    return NextResponse.redirect(
      `${redirectBase}?error=quickbooks_callback_failed`
    );
  }
}
