import { NextResponse, NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

// Routes that require authentication
const protectedPrefixes = ["/dashboard", "/portal", "/admin", "/onboarding"];

// Routes that additionally require admin/owner role
const adminPrefixes = ["/admin"];

function isProtectedRoute(pathname: string): boolean {
  return protectedPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix + "/")
  );
}

function isAdminRoute(pathname: string): boolean {
  return adminPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix + "/")
  );
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // --- Auth checks for protected routes ---
  if (isProtectedRoute(pathname)) {
    const token = await getToken({ req: request });

    if (!token) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("callbackUrl", request.url);
      return NextResponse.redirect(loginUrl);
    }

    // Admin routes require admin or owner role
    if (isAdminRoute(pathname)) {
      const role = token.role as string | undefined;
      if (role !== "admin" && role !== "owner") {
        // Redirect unauthorized users to dashboard
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }
    }
  }

  // --- Security Headers ---
  const response = NextResponse.next();
  const headers = response.headers;

  // Prevent clickjacking
  headers.set("X-Frame-Options", "DENY");

  // Prevent MIME type sniffing
  headers.set("X-Content-Type-Options", "nosniff");

  // Enable XSS filter
  headers.set("X-XSS-Protection", "1; mode=block");

  // Referrer policy
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  // Permissions policy (disable features we don't use)
  headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), interest-cohort=()"
  );

  // Content Security Policy
  if (process.env.NODE_ENV === "production") {
    headers.set(
      "Content-Security-Policy",
      [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' https://js.stripe.com", // unsafe-inline required for Next.js App Router inline scripts
        "style-src 'self' 'unsafe-inline'", // unsafe-inline needed for Tailwind/inline styles
        "img-src 'self' data: https: blob:",
        "font-src 'self' data:",
        "connect-src 'self' https://api.stripe.com https://api.resend.com https://*.supabase.co wss://*.supabase.co",
        "frame-src 'self' https://js.stripe.com https://hooks.stripe.com",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        "frame-ancestors 'none'",
        "upgrade-insecure-requests",
      ].join("; ")
    );

    // HSTS - only in production
    headers.set(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains; preload"
    );
  }

  return response;
}

// Configure which paths the middleware runs on
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - api routes that need different headers (webhooks)
     */
    "/((?!_next/static|_next/image|favicon.ico|public|api/billing/webhook).*)",
  ],
};
