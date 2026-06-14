import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { timingSafeEqual } from "crypto";
import { authOptions } from "@/lib/auth/options";
import { Session } from "next-auth";

/** Session type with guaranteed non-optional user fields after auth check */
export type AuthenticatedSession = Session & {
  user: { id: string; role: string; organizationId: string | null };
};

/**
 * Headless service auth for the NanoClaw/Andy agent. When ANDY_SERVICE_TOKEN is
 * set and a request presents `Authorization: Bearer <token>` matching it, the
 * request is treated as an admin (no NextAuth session/cookie required). This is
 * what lets the autonomous fulfillment agent read pending change requests and
 * flip their status without a browser login. Disabled entirely when the env var
 * is unset — so this is a no-op in any environment that hasn't opted in.
 */
function serviceSession(req: NextRequest): AuthenticatedSession | null {
  const expected = process.env.ANDY_SERVICE_TOKEN;
  if (!expected) return null;

  const header = req.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  const provided = header.slice(7).trim();
  if (!provided) return null;

  // Constant-time compare; bail before timingSafeEqual if lengths differ
  // (timingSafeEqual throws on length mismatch).
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  return {
    user: {
      id: "andy-service",
      email: "andy@snakgroup.biz",
      role: "admin",
      organizationId: null,
    },
    expires: new Date(Date.now() + 60_000).toISOString(),
  } as AuthenticatedSession;
}

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
    // Headless agent (Andy) bypass — only active when ANDY_SERVICE_TOKEN is set.
    const service = serviceSession(req);
    if (service) {
      return handler(req, ctx, service);
    }

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
