import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { checkPlaidTransactionsForPayments } from "@/lib/ar-engine/monitor";
import { syncPaymentsFromQuickBooks } from "@/lib/ar-engine/monitor";
import { apiLogger } from "@/lib/logger";

// POST /api/ar-engine/sync-payments
// Cron-triggered: syncs payments from Plaid bank transactions and QuickBooks
// for all organizations with active CFA subscriptions.
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { success: false, message: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    // Find all orgs with an active CFA-related subscription
    const cfaPlans = ["cashflow_ai", "cashflow_ar", "cashflow_pro", "growth_bundle", "full_suite", "enterprise_suite"];
    const activeOrgs = await prisma.subscription.findMany({
      where: {
        plan: { in: cfaPlans },
        status: { in: ["active", "trialing"] },
      },
      select: { organizationId: true },
      distinct: ["organizationId"],
    });

    let totalPlaid = 0;
    let totalQb = 0;
    let errors = 0;

    for (const { organizationId } of activeOrgs) {
      try {
        const plaidMatched = await checkPlaidTransactionsForPayments(organizationId);
        totalPlaid += plaidMatched;
      } catch (err) {
        errors++;
        apiLogger.error({ err, organizationId }, "Plaid payment sync failed for org");
      }

      try {
        const qbMatched = await syncPaymentsFromQuickBooks(organizationId);
        totalQb += qbMatched;
      } catch (err) {
        errors++;
        apiLogger.error({ err, organizationId }, "QuickBooks payment sync failed for org");
      }
    }

    const result = {
      orgsProcessed: activeOrgs.length,
      plaidPaymentsMatched: totalPlaid,
      quickbooksPaymentsMatched: totalQb,
      errors,
    };

    apiLogger.info(result, "Payment sync cron completed");

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    apiLogger.error({ err: error }, "Payment sync cron failed");
    return NextResponse.json(
      { success: false, message: "Payment sync failed" },
      { status: 500 }
    );
  }
}

export const GET = POST;
