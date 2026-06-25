import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { withAdmin } from "@/lib/api/with-auth";
import { apiError } from "@/lib/api/errors";
import { z } from "zod";

// Andy-only endpoints (authenticated by the ANDY_SERVICE_TOKEN → admin). This is
// how Andy on the VPS sees BRAND-NEW public inquiries (lead-form / URL-analyzer
// submissions) and surfaces them to Blayke on WhatsApp — exactly once.
//
// Mirrors /api/support/agent. The "set-once" guard is leads.andySeenAt: a lead is
// pending only while status='new' AND andySeenAt is null. Andy stamps andySeenAt
// (POST mark-seen) the moment he surfaces it, so a later poll never re-fires.

// GET /api/leads/agent — new inquiries Andy has not surfaced yet.
export const GET = withAdmin(async (_req, _ctx, _session) => {
  try {
    const leads = await prisma.lead.findMany({
      where: { status: "new", andySeenAt: null },
      orderBy: { createdAt: "asc" },
      take: 25,
      select: {
        id: true,
        businessName: true,
        contactName: true,
        email: true,
        phone: true,
        hasWebsite: true,
        websiteUrl: true,
        industry: true,
        challenges: true,
        analysisScore: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      pendingCount: leads.length,
      leads: leads.map((l) => ({
        ...l,
        createdAt: l.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    return apiError(error, "Failed to load new inquiries");
  }
});

const seenSchema = z.object({
  leadId: z.string().min(1),
});

// POST /api/leads/agent — Andy marks an inquiry as surfaced (set-once guard).
export const POST = withAdmin(async (req, _ctx, _session) => {
  try {
    const { leadId } = seenSchema.parse(await req.json());

    // Stamp only if not already stamped — idempotent, so a retry can't double-fire
    // and a concurrent sweep can't both "win".
    const result = await prisma.lead.updateMany({
      where: { id: leadId, andySeenAt: null },
      data: { andySeenAt: new Date() },
    });

    return NextResponse.json({ success: true, marked: result.count > 0 });
  } catch (error) {
    return apiError(error, "Failed to mark inquiry seen");
  }
});
