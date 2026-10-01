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
        limiter: Ratelimit.slidingWindow(20, '1 h'), // 20 signups per hour per IP
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
 * Same limits, kept in this process's memory, used when Upstash Redis isn't configured.
 * Production had no UPSTASH_* env, so every limiter was null and login, signup and
 * password reset were unlimited (found 2026-09-30). One Render instance → per-process
 * memory is a real limit; with several instances it is per instance (still far better
 * than none). Fixed window, pruned as it goes.
 */
const MEMORY_LIMITS: Record<RateLimitType, { max: number; windowMs: number }> = {
  auth: { max: 10, windowMs: 60_000 },
  login: { max: 5, windowMs: 60_000 },
  signup: { max: 20, windowMs: 3_600_000 },
  passwordReset: { max: 3, windowMs: 900_000 },
  api: { max: 100, windowMs: 60_000 },
  ai: { max: 20, windowMs: 60_000 },
  webhook: { max: 1000, windowMs: 60_000 },
};
const memoryHits = new Map<string, { count: number; resetAt: number }>();

export function memoryLimit(type: RateLimitType, key: string, now = Date.now()) {
  const { max, windowMs } = MEMORY_LIMITS[type];
  const id = `${type}:${key}`;
  let entry = memoryHits.get(id);
  if (!entry || entry.resetAt <= now) {
    entry = { count: 0, resetAt: now + windowMs };
    memoryHits.set(id, entry);
  }
  entry.count += 1;
  if (memoryHits.size > 50_000) {
    for (const [k, v] of memoryHits) if (v.resetAt <= now) memoryHits.delete(k);
  }
  return { success: entry.count <= max, limit: max, remaining: Math.max(0, max - entry.count), reset: entry.resetAt };
}

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
  const ip = getClientIp(request);

  // No Redis configured → enforce the same limits in memory (never "allow everything").
  if (!limiter) {
    return memoryLimit(type, ip);
  }

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
    return memoryLimit(type, identifier);
  }

  return await limiter.limit(identifier);
}
