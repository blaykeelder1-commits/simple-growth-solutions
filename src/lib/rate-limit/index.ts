import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { NextRequest, NextResponse } from 'next/server';

// Initialize Redis client (optional - gracefully handles missing config)
const redis = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
  : null;

// Define rate limiters for different endpoints
export const rateLimiters = {
  // Auth endpoints - stricter limits
  auth: redis
    ? new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(10, '1 m'), // 10 requests per minute
        analytics: true,
        prefix: 'ratelimit:auth',
      })
    : null,

  // Login endpoint - very strict to prevent brute force
  login: redis
    ? new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(5, '1 m'), // 5 attempts per minute
        analytics: true,
        prefix: 'ratelimit:login',
      })
    : null,

  // Signup endpoint
  signup: redis
    ? new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(3, '1 h'), // 3 signups per hour per IP
        analytics: true,
        prefix: 'ratelimit:signup',
      })
    : null,

  // Password reset - prevent enumeration attacks
  passwordReset: redis
    ? new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(3, '15 m'), // 3 requests per 15 minutes
        analytics: true,
        prefix: 'ratelimit:password-reset',
      })
    : null,

  // API endpoints - moderate limits
  api: redis
    ? new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(100, '1 m'), // 100 requests per minute
        analytics: true,
        prefix: 'ratelimit:api',
      })
    : null,

  // AI/expensive endpoints - stricter limits
  ai: redis
    ? new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(20, '1 m'), // 20 requests per minute
        analytics: true,
        prefix: 'ratelimit:ai',
      })
    : null,

  // Webhook endpoints - high limits
  webhook: redis
    ? new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(1000, '1 m'), // 1000 requests per minute
        analytics: true,
        prefix: 'ratelimit:webhook',
      })
    : null,
};

export type RateLimitType = keyof typeof rateLimiters;

/**
 * Get the client IP address from the request
 */
export function getClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }
  return request.headers.get('x-real-ip') || 'anonymous';
}

/**
 * Rate limit middleware for API routes
 */
export async function rateLimit(
  request: NextRequest,
  type: RateLimitType = 'api'
): Promise<{ success: boolean; limit?: number; remaining?: number; reset?: number }> {
  const limiter = rateLimiters[type];

  // If Redis is not configured, allow all requests (development mode)
  if (!limiter) {
    return { success: true };
  }

  const ip = getClientIp(request);
  const { success, limit, remaining, reset } = await limiter.limit(ip);

  return { success, limit, remaining, reset };
}

/**
 * Create a rate-limited response
 */
export function rateLimitedResponse(reset?: number): NextResponse {
  return NextResponse.json(
    {
      error: 'Too many requests',
      message: 'Please wait before making another request',
      retryAfter: reset ? Math.ceil((reset - Date.now()) / 1000) : 60,
    },
    {
      status: 429,
      headers: {
        'Retry-After': String(reset ? Math.ceil((reset - Date.now()) / 1000) : 60),
        'X-RateLimit-Limit': '10',
        'X-RateLimit-Remaining': '0',
      },
    }
  );
}

/**
 * Helper function to apply rate limiting to an API route
 */
export async function withRateLimit(
  request: NextRequest,
  type: RateLimitType = 'api'
): Promise<NextResponse | null> {
  const { success, reset } = await rateLimit(request, type);

  if (!success) {
    return rateLimitedResponse(reset);
  }

  return null; // Continue with the request
}

/**
 * Rate limit by a custom identifier (e.g., user ID, email)
 */
export async function rateLimitByIdentifier(
  identifier: string,
  type: RateLimitType = 'api'
): Promise<{ success: boolean; limit?: number; remaining?: number; reset?: number }> {
  const limiter = rateLimiters[type];

  if (!limiter) {
    return { success: true };
  }

  return await limiter.limit(identifier);
}
