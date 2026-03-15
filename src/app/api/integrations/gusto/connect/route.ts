import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { getGustoAuthUrl, getGustoConfig } from "@/lib/integrations/gusto";
import crypto from "crypto";

// GET /api/integrations/gusto/connect - Start Gusto OAuth flow
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const config = getGustoConfig();
    if (!config) {
      return NextResponse.json(
        { success: false, message: "Gusto integration is not configured" },
        { status: 500 }
      );
    }

    // Generate a random state token for CSRF protection
    const state = crypto.randomBytes(32).toString("hex");

    // Build the Gusto OAuth URL
    const authUrl = getGustoAuthUrl(config, state);

    // Set the state in a cookie with 10-minute expiry
    const response = NextResponse.redirect(authUrl);
    response.cookies.set("gusto_oauth_state", state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 10, // 10 minutes
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Failed to start Gusto OAuth flow:", error);
    return NextResponse.json(
      { success: false, message: "Failed to start Gusto connection" },
      { status: 500 }
    );
  }
}
