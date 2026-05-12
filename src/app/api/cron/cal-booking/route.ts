import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { createHmac, timingSafeEqual } from "crypto";
import { prisma } from "@/lib/db/prisma";
import { apiLogger } from "@/lib/logger";

// Cal.com webhook handler.
// Configure in Cal.com dashboard → Webhooks: subscribe to BOOKING_CREATED
// (and optionally BOOKING_RESCHEDULED, BOOKING_CANCELLED).
//
// Signature: Cal.com signs payloads with HMAC-SHA256 over the raw body using
// the shared secret. Set CAL_WEBHOOK_SECRET to enable verification.
//
// What we do on BOOKING_CREATED:
//   1. Look up the lead by email.
//   2. If a WebsiteProject exists for the lead's converted org, set
//      demoScheduledAt and flip status to demo_scheduled.
//   3. Otherwise just update the Lead record so admins can see they booked.

interface CalAttendee {
  email?: string;
  name?: string;
}

interface CalBookingPayload {
  triggerEvent?: string;
  payload?: {
    title?: string;
    startTime?: string;
    endTime?: string;
    attendees?: CalAttendee[];
    metadata?: Record<string, unknown>;
    uid?: string;
  };
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const headersList = await headers();
  const signature = headersList.get("x-cal-signature-256");
  const secret = process.env.CAL_WEBHOOK_SECRET;

  if (secret) {
    if (!signature) {
      return NextResponse.json({ error: "Missing signature" }, { status: 401 });
    }
    const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
    const a = Buffer.from(expected);
    const b = Buffer.from(signature);
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      apiLogger.warn("Cal.com webhook signature mismatch");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
  }

  let event: CalBookingPayload;
  try {
    event = JSON.parse(rawBody) as CalBookingPayload;
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  if (event.triggerEvent !== "BOOKING_CREATED" && event.triggerEvent !== "BOOKING_RESCHEDULED") {
    // Quietly accept other events (cancellation handled separately if needed).
    return NextResponse.json({ received: true });
  }

  const startTime = event.payload?.startTime;
  const attendee = event.payload?.attendees?.[0];
  const email = attendee?.email?.toLowerCase();
  const leadIdMeta = event.payload?.metadata?.leadId as string | undefined;

  if (!startTime || (!email && !leadIdMeta)) {
    return NextResponse.json({ received: true });
  }

  try {
    // Resolve the Lead — prefer explicit metadata, fall back to email match.
    const lead = leadIdMeta
      ? await prisma.lead.findUnique({ where: { id: leadIdMeta } })
      : await prisma.lead.findFirst({
          where: { email: { equals: email!, mode: "insensitive" } },
          orderBy: { createdAt: "desc" },
        });

    if (!lead) {
      apiLogger.warn({ email, leadIdMeta }, "Cal.com booking — no matching lead");
      return NextResponse.json({ received: true });
    }

    const scheduledAt = new Date(startTime);

    // Find the project (if any) tied to this lead's converted org.
    let project = null;
    if (lead.convertedToOrgId) {
      project = await prisma.websiteProject.findFirst({
        where: {
          organizationId: lead.convertedToOrgId,
          isFreeuild: true,
        },
        orderBy: { createdAt: "desc" },
      });
    }

    if (project) {
      await prisma.websiteProject.update({
        where: { id: project.id },
        data: {
          demoScheduledAt: scheduledAt,
          status:
            project.status === "queued" || project.status === "in_progress"
              ? "demo_scheduled"
              : project.status,
        },
      });
    }

    // Always note the booking on the lead so admins can see it.
    await prisma.lead.update({
      where: { id: lead.id },
      data: {
        notes: `${lead.notes ? lead.notes + "\n" : ""}Booked demo: ${scheduledAt.toISOString()}`,
      },
    });

    return NextResponse.json({ received: true, leadId: lead.id, projectId: project?.id });
  } catch (err) {
    apiLogger.error({ err }, "Cal.com webhook handler failed");
    // Always 200 so Cal doesn't retry endlessly; we log and reconcile manually.
    return NextResponse.json({ received: true });
  }
}
