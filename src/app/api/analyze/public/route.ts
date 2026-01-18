import { NextRequest, NextResponse } from "next/server";
import { analyzeWebsite } from "@/lib/analyzer";
import { z } from "zod";

// Force dynamic rendering for this API route
export const dynamic = "force-dynamic";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const analyzeSchema = z.object({
  url: z.string().url("Invalid URL"),
});

// Initialize rate limiter for public/unauthenticated requests
// 3 analyses per IP per hour to prevent abuse while allowing genuine interest
const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null;

const publicAnalyzeRateLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(3, "1 h"), // 3 requests per hour per IP
      analytics: true,
      prefix: "ratelimit:public-analyze",
    })
  : null;

// Get client IP address
function getClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }
  return request.headers.get("x-real-ip") || "anonymous";
}

// GET /api/analyze/public?url=...
// Public endpoint for landing page URL analyzer - no authentication required
export async function GET(req: NextRequest) {
  try {
    // Apply rate limiting
    if (publicAnalyzeRateLimiter) {
      const ip = getClientIp(req);
      const { success, limit, remaining, reset } = await publicAnalyzeRateLimiter.limit(ip);

      if (!success) {
        return NextResponse.json(
          {
            success: false,
            error: "Rate limit exceeded",
            message: "You've reached the free analysis limit. Create an account for unlimited access!",
            retryAfter: reset ? Math.ceil((reset - Date.now()) / 1000) : 3600,
          },
          {
            status: 429,
            headers: {
              "Retry-After": String(reset ? Math.ceil((reset - Date.now()) / 1000) : 3600),
              "X-RateLimit-Limit": String(limit),
              "X-RateLimit-Remaining": String(remaining),
            },
          }
        );
      }
    }

    const { searchParams } = new URL(req.url);
    const url = searchParams.get("url");

    if (!url) {
      return NextResponse.json(
        { success: false, error: "URL parameter is required" },
        { status: 400 }
      );
    }

    // Validate URL
    try {
      analyzeSchema.parse({ url });
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid URL format" },
        { status: 400 }
      );
    }

    // Run the analysis
    const analysis = await analyzeWebsite(url);

    // Return structured response for the landing page analyzer
    // Note: We intentionally don't include full AI analysis for public requests
    // to encourage users to sign up for the full experience
    return NextResponse.json({
      url: analysis.url,
      overallScore: analysis.score,
      checks: {
        ssl: {
          passed: analysis.checks.ssl.passed,
          score: analysis.checks.ssl.score,
          message: analysis.checks.ssl.message,
          details: analysis.checks.ssl.details,
        },
        mobile: {
          passed: analysis.checks.mobile.passed,
          score: analysis.checks.mobile.score,
          message: analysis.checks.mobile.message,
          details: analysis.checks.mobile.details,
        },
        seo: {
          passed: analysis.checks.seo.passed,
          score: analysis.checks.seo.score,
          message: analysis.checks.seo.message,
          details: analysis.checks.seo.details,
        },
        speed: {
          passed: analysis.checks.speed.passed,
          score: analysis.checks.speed.score,
          message: analysis.checks.speed.message,
          details: analysis.checks.speed.details,
        },
        accessibility: {
          passed: analysis.checks.accessibility.passed,
          score: analysis.checks.accessibility.score,
          message: analysis.checks.accessibility.message,
          details: analysis.checks.accessibility.details,
        },
        design: {
          passed: analysis.checks.design.passed,
          score: analysis.checks.design.score,
          message: analysis.checks.design.message,
          details: analysis.checks.design.details,
        },
      },
      recommendations: analysis.recommendations,
      // Don't include aiAnalysis for public requests - this is a premium feature
    });
  } catch (error) {
    console.error("Public analyze error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to analyze website. Please try again." },
      { status: 500 }
    );
  }
}
