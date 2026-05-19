import { prisma } from "@/lib/db/prisma";
import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api/with-auth";
import { apiError } from "@/lib/api/errors";
import {
  getAdminEmails,
  sendNewChangeRequestNotification,
  sendChangeRequestReceivedEmail,
} from "@/lib/email";
import { apiLogger } from "@/lib/logger";
import { z } from "zod";
import { computeSlaDueAt, RUSH_FEE_CENTS } from "@/lib/billing/sla";
import {
  resolvePlanCaps,
  getPeriodWindow,
  rollManualPeriodIfExpired,
  OVERAGE_CR_FEE_CENTS,
} from "@/lib/billing/plan-caps";
import {
  getSgsSquareConfig,
  findOrCreateCustomer,
  createPaymentLink,
} from "@/lib/billing/square";

const createChangeRequestSchema = z.object({
  title: z.string().min(5),
  description: z.string().min(20),
  type: z.enum(["feature", "bug", "content", "design"]),
  priority: z.enum(["low", "normal", "high", "urgent"]),
  rushDelivery: z.boolean().optional().default(false),
  // Customer explicitly accepting the $25 overage fee for going over their
  // included CR cap. UI shows this as "Pay $25 for this extra request" once
  // the included quota is exhausted.
  acceptOverageFee: z.boolean().optional().default(false),
});

// Plans whose customers can submit change requests.
const MANAGED_PLAN_KEYS = new Set([
  "website_managed",
  "website_pro",
  "website_premium",
  "starter_bundle",
  "growth_bundle",
  "full_suite",
  "enterprise_suite",
]);
const ACTIVE_SUB_STATUSES = new Set(["active", "trialing"]);

// POST /api/projects/[id]/change-requests - Create a change request
export const POST = withAuth(async (req, ctx, session) => {
  try {
    const { id: projectId } = await ctx.params;

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    const project = await prisma.websiteProject.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      return NextResponse.json(
        { success: false, message: "Project not found" },
        { status: 404 }
      );
    }

    if (user?.role !== "admin" && project.organizationId !== user?.organizationId) {
      return NextResponse.json(
        { success: false, message: "Access denied" },
        { status: 403 }
      );
    }

    // Always look up the org's active managed plan so SLA + rush billing logic
    // apply consistently (even when an admin submits on behalf of a customer).
    let activeSub = await prisma.subscription.findFirst({
      where: {
        organizationId: project.organizationId,
        plan: { in: Array.from(MANAGED_PLAN_KEYS) },
        status: { in: Array.from(ACTIVE_SUB_STATUSES) },
      },
      orderBy: { createdAt: "desc" },
    });
    if (activeSub) activeSub = await rollManualPeriodIfExpired(prisma, activeSub);
    const activePlan: string | null = activeSub?.plan ?? null;

    // Subscription gate — customers (not admins) must have an active managed plan.
    if (user?.role !== "admin" && !activeSub) {
      return NextResponse.json(
        {
          success: false,
          message:
            "An active management plan is required to submit change requests. Upgrade at /portal/billing.",
          code: "subscription_required",
        },
        { status: 402 }
      );
    }

    const body = await req.json();
    const validatedData = createChangeRequestSchema.parse(body);

    // ── Per-period CR cap enforcement (anti-loophole + labor protection) ──
    // Count how many CRs this org has opened in the current billing/trial
    // window. If they're at the cap, either (a) they accepted the $25 overage
    // and we'll auto-charge it, or (b) we 402 them with an upgrade prompt.
    let billOverage = false;
    if (user?.role !== "admin" && activeSub) {
      const caps = resolvePlanCaps(activePlan, activeSub.status);
      if (caps.crsPerPeriod === 0) {
        return NextResponse.json(
          {
            success: false,
            message: caps.label
              ? `Your ${caps.label} plan does not include change requests. Upgrade at /portal/billing.`
              : "An active management plan is required.",
            code: "plan_excludes_change_requests",
          },
          { status: 402 }
        );
      }
      const { from, to } = getPeriodWindow({
        status: activeSub.status,
        trialStartDate: activeSub.trialStartDate,
        trialEndDate: activeSub.trialEndDate,
        currentPeriodStart: activeSub.currentPeriodStart,
        currentPeriodEnd: activeSub.currentPeriodEnd,
      });
      const usedThisPeriod = await prisma.changeRequest.count({
        where: {
          project: { organizationId: project.organizationId },
          createdAt: { gte: from, lte: to },
          status: { not: "rejected" },
        },
      });
      if (usedThisPeriod >= caps.crsPerPeriod) {
        if (!validatedData.acceptOverageFee) {
          return NextResponse.json(
            {
              success: false,
              message: `You've used your ${caps.crsPerPeriod} included change request${caps.crsPerPeriod === 1 ? "" : "s"} for this period. Pay $${(OVERAGE_CR_FEE_CENTS / 100).toFixed(0)} for this extra request, or upgrade your plan for more capacity.`,
              code: "cr_cap_reached",
              capDetails: {
                used: usedThisPeriod,
                included: caps.crsPerPeriod,
                periodEndsAt: to,
                overageFeeCents: OVERAGE_CR_FEE_CENTS,
                planLabel: caps.label,
              },
            },
            { status: 402 }
          );
        }
        billOverage = true;
      }
    }

    // SLA: rush flag OR Pro plan = 24h; otherwise 5 business days.
    const slaDueAt = computeSlaDueAt({
      isRush: validatedData.rushDelivery,
      plan: activePlan,
    });

    // Pro customers get same-day on every ticket without paying — don't bill them.
    const billRush =
      validatedData.rushDelivery && activePlan !== "website_pro";

    // Either rush ($49) or overage ($25) hold the ticket in awaiting_payment.
    // If both apply, rush wins (it's the bigger charge).
    const needsPayment = billRush || billOverage;
    const chargeKind: "rush_fee" | "upcharge" = billRush ? "rush_fee" : "upcharge";
    const chargeCents = billRush ? RUSH_FEE_CENTS : OVERAGE_CR_FEE_CENTS;
    const chargeDesc = billRush
      ? `Same-day rush — ${validatedData.title}`
      : `Extra change request — ${validatedData.title}`;

    const changeRequest = await prisma.changeRequest.create({
      data: {
        projectId,
        requesterId: session.user.id,
        title: validatedData.title,
        description: validatedData.description,
        type: validatedData.type,
        priority: validatedData.priority,
        isRush: validatedData.rushDelivery,
        slaDueAt,
        status: needsPayment ? "awaiting_payment" : "pending",
      },
    });

    // ── Charge rush fee or overage fee via Square Payment Link ────────
    let paymentLinkUrl: string | null = null;
    if (needsPayment) {
      const cfg = getSgsSquareConfig();
      if (cfg) {
        try {
          const customer = await findOrCreateCustomer(
            cfg,
            session.user.email || `${session.user.id}@unknown.local`,
            session.user.name || undefined
          );
          const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
          const link = await createPaymentLink(cfg, {
            amountCents: chargeCents,
            description: chargeDesc,
            redirectUrl: `${baseUrl}/portal/requests`,
            buyerEmail: session.user.email || undefined,
            customerId: customer.id,
            metadata: {
              organizationId: project.organizationId,
              changeRequestId: changeRequest.id,
              kind: chargeKind,
            },
          });
          await prisma.oneOffCharge.create({
            data: {
              organizationId: project.organizationId,
              projectId: project.id,
              changeRequestId: changeRequest.id,
              kind: chargeKind,
              description: chargeDesc,
              amountCents: chargeCents,
              squarePaymentLinkId: link.id,
              squarePaymentLinkUrl: link.url,
              squareOrderId: link.orderId,
              status: "pending",
            },
          });
          paymentLinkUrl = link.url;
        } catch (err) {
          apiLogger.error(
            { err, changeRequestId: changeRequest.id },
            "Failed to create payment link — leaving ticket in awaiting_payment"
          );
        }
      } else {
        apiLogger.warn(
          { changeRequestId: changeRequest.id, chargeKind },
          "Payment required but Square not configured — ticket will block on payment"
        );
      }
    }

    // Notify admins (skip if awaiting_payment so we don't poke them about
    // tickets that haven't been paid for yet).
    if (changeRequest.status === "pending") {
      getAdminEmails()
        .then((emails) =>
          sendNewChangeRequestNotification(
            emails,
            {
              title: validatedData.title,
              type: validatedData.type,
              priority: validatedData.priority,
              description: validatedData.description,
            },
            { id: project.id, projectName: project.projectName },
            session.user.name || session.user.email || "A customer"
          )
        )
        .catch((e) =>
          apiLogger.warn({ err: e }, "Failed to send change request notification")
        );

      // Customer-facing acknowledgment — closes the "did it go through?" loop
      // before they have to refresh the portal.
      if (session.user.email) {
        const slaText =
          activePlan === "website_pro"
            ? "Within 24 hours (Pro plan)"
            : activePlan === "website_premium"
              ? "Same business day (Premium plan)"
              : validatedData.rushDelivery
                ? "Same day (rush)"
                : "3–5 business days";
        sendChangeRequestReceivedEmail(
          session.user.email,
          session.user.name || session.user.email,
          {
            title: validatedData.title,
            type: validatedData.type,
            priority: validatedData.priority,
          },
          { id: project.id, projectName: project.projectName },
          slaText
        ).catch((e) =>
          apiLogger.warn({ err: e }, "Failed to send CR receipt to customer")
        );
      }
    }

    return NextResponse.json(
      { success: true, changeRequest, paymentLinkUrl },
      { status: 201 }
    );
  } catch (error) {
    return apiError(error, "Failed to create change request");
  }
});
