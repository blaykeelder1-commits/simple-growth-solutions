import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { runSecurityScan } from "@/lib/security/scanner";
import { sendSecurityScanReport, sendSSLExpiryWarning } from "@/lib/email/security-alerts";
import { logger } from "@/lib/logger";

/**
 * POST /api/security/scheduled-scan
 *
 * Cron-triggered endpoint that runs security scans for all organizations
 * with active cybersecurity subscriptions.
 *
 * Protected by CRON_SECRET environment variable (for Vercel Cron).
 */
export async function POST(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      logger.error("CRON_SECRET environment variable is not set");
      return NextResponse.json(
        { success: false, message: "Server configuration error" },
        { status: 500 }
      );
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    // Find all organizations with active cybersecurity subscriptions
    const activeSubscriptions = await prisma.subscription.findMany({
      where: {
        plan: "cybersecurity",
        status: { in: ["active", "trialing"] },
      },
      include: {
        organization: {
          include: {
            users: {
              where: { role: { in: ["admin", "owner"] } },
              select: { email: true },
              take: 1,
            },
          },
        },
      },
    });

    const results: Array<{
      organizationId: string;
      url: string;
      score: number | null;
      status: string;
      error?: string;
    }> = [];

    for (const subscription of activeSubscriptions) {
      const org = subscription.organization;
      if (!org) continue;

      // Get the most recent completed scan's target URL for this org
      const lastScan = await prisma.securityScan.findFirst({
        where: {
          organizationId: org.id,
          status: "completed",
          targetUrl: { not: "" },
        },
        orderBy: { createdAt: "desc" },
        select: { targetUrl: true, overallScore: true },
      });

      if (!lastScan?.targetUrl) {
        results.push({
          organizationId: org.id,
          url: "",
          score: null,
          status: "skipped",
          error: "No previous scan URL found",
        });
        continue;
      }

      const targetUrl = lastScan.targetUrl;
      const previousScore = lastScan.overallScore;

      try {
        // Create a scan record
        const scan = await prisma.securityScan.create({
          data: {
            organizationId: org.id,
            targetUrl,
            scanType: "full",
            status: "running",
            startedAt: new Date(),
          },
        });

        // Run the scan
        const result = await runSecurityScan(targetUrl);

        // Update scan with results
        await prisma.securityScan.update({
          where: { id: scan.id },
          data: {
            status: "completed",
            overallScore: result.overallScore,
            sslDetails: JSON.stringify(result.checks.ssl),
            headerDetails: JSON.stringify(result.checks.headers),
            criticalCount: result.vulnerabilities.filter((v) => v.severity === "critical").length,
            highCount: result.vulnerabilities.filter((v) => v.severity === "high").length,
            mediumCount: result.vulnerabilities.filter((v) => v.severity === "medium").length,
            lowCount: result.vulnerabilities.filter((v) => v.severity === "low").length,
            completedAt: new Date(),
          },
        });

        // Create vulnerability records
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

        // Send email report to org admin
        const adminEmail = org.users[0]?.email;
        if (adminEmail) {
          try {
            await sendSecurityScanReport(adminEmail, {
              url: targetUrl,
              score: result.overallScore,
              previousScore: previousScore,
              vulnerabilities: result.vulnerabilities.map((v) => ({
                title: v.title,
                severity: v.severity,
                remediation: v.remediation,
              })),
              sslExpiresIn: result.sslExpiration?.daysUntilExpiry ?? null,
            });

            // Send SSL expiry warning if within 30 days
            if (
              result.sslExpiration &&
              result.sslExpiration.daysUntilExpiry > 0 &&
              result.sslExpiration.daysUntilExpiry <= 30 &&
              result.sslExpiration.expiresAt
            ) {
              await sendSSLExpiryWarning(adminEmail, {
                url: targetUrl,
                daysUntilExpiry: result.sslExpiration.daysUntilExpiry,
                expiresAt: result.sslExpiration.expiresAt,
              });
            }
          } catch (emailError) {
            logger.error(
              { err: emailError, orgId: org.id },
              "Failed to send security scan email"
            );
          }
        }

        results.push({
          organizationId: org.id,
          url: targetUrl,
          score: result.overallScore,
          status: "completed",
        });
      } catch (scanError) {
        logger.error(
          { err: scanError, orgId: org.id, url: targetUrl },
          "Scheduled scan failed for organization"
        );

        results.push({
          organizationId: org.id,
          url: targetUrl,
          score: null,
          status: "failed",
          error: scanError instanceof Error ? scanError.message : "Unknown error",
        });
      }
    }

    const completed = results.filter((r) => r.status === "completed").length;
    const failed = results.filter((r) => r.status === "failed").length;
    const skipped = results.filter((r) => r.status === "skipped").length;

    logger.info(
      { completed, failed, skipped, total: results.length },
      "Scheduled security scans completed"
    );

    return NextResponse.json({
      success: true,
      summary: { completed, failed, skipped, total: results.length },
      results,
    });
  } catch (error) {
    logger.error({ err: error }, "Scheduled scan endpoint error");
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
