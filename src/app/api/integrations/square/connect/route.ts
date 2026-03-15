import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { getSquareAuthUrl } from "@/lib/integrations/square";
import { cookies } from "next/headers";
import { randomBytes } from "crypto";

// GET /api/integrations/square/connect
// Generates a state token and redirects to Square OAuth
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    // Generate a cryptographically random state token
    const state = randomBytes(32).toString("hex");

    // Store state in a secure cookie for validation on callback
    const cookieStore = await cookies();
    cookieStore.set("square_oauth_state", state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 600, // 10 minutes
      path: "/",
    });

    // Also store the user ID so we can associate the integration on callback
    cookieStore.set("square_oauth_user", session.user.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 600,
      path: "/",
    });

    const authUrl = getSquareAuthUrl(state);

    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error("Failed to initiate Square connection:", error);
    return NextResponse.redirect(
      new URL(
        "/dashboard/chauffeur/integrations?error=square_connect_failed",
        process.env.NEXTAUTH_URL || "http://localhost:3000"
      )
    );
  }
}
