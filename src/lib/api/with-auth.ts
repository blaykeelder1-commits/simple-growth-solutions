import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { Session } from "next-auth";

export type AuthenticatedHandler = (
  req: NextRequest,
  ctx: { params: Promise<Record<string, string>> },
  session: Session & { user: { id: string; role: string; organizationId: string | null } }
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

    return handler(req, ctx, session as Parameters<AuthenticatedHandler>[2]);
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
