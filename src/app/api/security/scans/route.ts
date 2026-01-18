import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { prisma } from "@/lib/db/prisma";
import { runSecurityScan, validateScanUrlWithDNS } from "@/lib/security/scanner";
import { z } from "zod";
import { logger } from "@/lib/logger";

// Constants for pagination limits
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const MIN_LIMIT = 1;

// Rate limiting configuration
const RATE_LIMIT = 10; // Max scans per window
const RATE_WINDOW_MS = 60000; // 1 minute window

// In-memory rate limit store
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

/**
 * Check if an organization has exceeded the rate limit for scans
 * Returns true if the request should be allowed, false if rate limited
 */
function checkRateLimit(orgId: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(orgId);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(orgId, { count: 1, resetTime: now + RATE_WINDOW_MS });
    return true;
  }

  if (record.count >= RATE_LIMIT) {
    return false;
  }

  record.count++;
  return true;
}

const scanSchema = z.object({
  url: z
    .string()
    .min(3, "URL must be at least 3 characters")
    .max(2048, "URL exceeds maximum length"),
});

// GET /api/security/scans - List security scans
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user?.organizationId) {
      return NextResponse.json({ success: true, scans: [] });
    }

    const { searchParams } = new URL(request.url);
    const limitParam = parseInt(searchParams.get("limit") || String(DEFAULT_LIMIT), 10);
    // Validate and clamp limit to safe range
    const limit = Math.max(MIN_LIMIT, Math.min(MAX_LIMIT, isNaN(limitParam) ? DEFAULT_LIMIT : limitParam));

    const scans = await prisma.securityScan.findMany({
      where: { organizationId: user.organizationId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return NextResponse.json({ success: true, scans });
  } catch (error) {
    logger.error({ err: error, route: "security/scans" }, "GET error");
    return NextResponse.json(
      { success: false, message: "Failed to fetch scans" },
      { status: 500 }
    );
  }
}

// POST /api/security/scans - Run a new security scan
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    // Create organization if needed
    let organizationId = user?.organizationId;
    if (!organizationId) {
      const org = await prisma.organization.create({
        data: {
          name: "Default Organization",
          users: { connect: { id: session.user.id } },
        },
      });
      organizationId = org.id;
    }

    // Check rate limit
    if (!checkRateLimit(organizationId)) {
      return NextResponse.json(
        { success: false, message: "Rate limit exceeded. Maximum 10 scans per minute." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { url } = scanSchema.parse(body);

    // Validate URL before creating scan record (SSRF + DNS rebinding protection)
    const urlValidation = await validateScanUrlWithDNS(url);
    if (!urlValidation.valid) {
      return NextResponse.json(
        { success: false, message: urlValidation.error || "Invalid URL" },
        { status: 400 }
      );
    }

    // Create scan record
    const scan = await prisma.securityScan.create({
      data: {
        organizationId,
        targetUrl: url,
        status: "running",
        startedAt: new Date(),
      },
    });

    // Run the scan (in production, this would be a background job)
    try {
      const result = await runSecurityScan(url);

      // Update scan with results
      const updatedScan = await prisma.securityScan.update({
        where: { id: scan.id },
        data: {
          status: "completed",
          overallScore: result.overallScore,
          sslDetails: JSON.stringify(result.checks.ssl),
          headerDetails: JSON.stringify(result.checks.headers),
          criticalCount: result.vulnerabilities.filter((v) => v.severity === "critical")
            .length,
          highCount: result.vulnerabilities.filter((v) => v.severity === "high").length,
          mediumCount: result.vulnerabilities.filter((v) => v.severity === "medium")
            .length,
          lowCount: result.vulnerabilities.filter((v) => v.severity === "low").length,
          completedAt: new Date(),
        },
      });

      // Create vulnerability records in batch for better performance
      if (result.vulnerabilities.length > 0) {
        await prisma.vulnerability.createMany({
          data: result.vulnerabilities.map((vuln) => ({
            scanId: scan.id,
            category: vuln.category,
            severity: vuln.severity,
            title: vuln.title,
            description: vuln.description,
            remediation: vuln.remediation,
            status: "open",
          })),
        });
      }

      return NextResponse.json(
        { success: true, scan: updatedScan },
        { status: 201 }
      );
    } catch (scanError) {
      logger.error({ err: scanError, route: "security/scans" }, "Scan execution error");
      // Update scan as failed
      await prisma.securityScan.update({
        where: { id: scan.id },
        data: {
          status: "failed",
          completedAt: new Date(),
        },
      });

      throw scanError;
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn({ issues: error.issues, route: "security/scans" }, "Validation error");
      return NextResponse.json(
        { success: false, message: "Invalid URL", errors: error.issues },
        { status: 400 }
      );
    }
    logger.error({ err: error, route: "security/scans" }, "POST error");
    return NextResponse.json(
      { success: false, message: "Failed to run scan" },
      { status: 500 }
    );
  }
}
