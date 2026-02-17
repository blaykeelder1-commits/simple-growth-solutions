import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { Session } from "next-auth";

/** Session type with guaranteed non-optional user fields after auth check */
export type AuthenticatedSession = Session & {
  user: { id: string; role: string; organizationId: string | null };
};

export type AuthenticatedHandler = (
  req: NextRequest,
  ctx: { params: Promise<Record<string, string>> },
  session: AuthenticatedSession
) => Promise<NextResponse>;

export type AdminHandler = AuthenticatedHandler;

/**
 * Wraps an API handler to require authentication.
 * Eliminates repeated session-checking boilerplate.
 */
export function withAuth(handler: AuthenticatedHandler) {
  return async (req: NextRequest, ctx: { params: Promise<Record<string, string>> }) => {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    // Ensure role is always present (default to "user" if missing from session)
    const authedSession: AuthenticatedSession = {
      ...session,
      user: {
        ...session.user,
        role: session.user.role ?? "user",
        organizationId: session.user.organizationId ?? null,
      },
    };

    return handler(req, ctx, authedSession);
  };
}

/**
 * Wraps an API handler to require admin role.
 */
export function withAdmin(handler: AdminHandler) {
  return withAuth(async (req, ctx, session) => {
    if (session.user.role !== "admin") {
      return NextResponse.json(
        { success: false, message: "Admin access required" },
        { status: 403 }
      );
    }

    return handler(req, ctx, session);
  });
}
