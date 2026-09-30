import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { apiError } from "@/lib/api/errors";
import { withRateLimit } from "@/lib/rate-limit";
import { recordWorkEvent } from "@/lib/work/events";
import { DESIRED_ACTIONS, LEAD_SOURCES, scoreLead, TRADES } from "@/lib/qualify/score";
import { verifyQualifyToken } from "@/lib/qualify/token";

const keys = <T extends object>(o: T) => Object.keys(o) as [keyof T & string, ...(keyof T & string)[]];

const qualifySchema = z.object({
  leadId: z.string().min(1),
  token: z.string().min(1),
  trade: z.enum(keys(TRADES)),
  desiredAction: z.enum(keys(DESIRED_ACTIONS)),
  currentLeadSource: z.enum(keys(LEAD_SOURCES)),
  readyThisWeek: z.boolean(),
});

// POST /api/leads/qualify — public second step after the free-audit capture. Only the
// visitor holding the token from their own create call can answer for that lead.
export async function POST(req: NextRequest) {
  const rateLimited = await withRateLimit(req, "api");
  if (rateLimited) return rateLimited;

  try {
    const input = qualifySchema.parse(await req.json());
    if (!verifyQualifyToken(input.leadId, input.token)) {
      return NextResponse.json({ success: false, message: "Invalid request" }, { status: 403 });
    }
    const lead = await prisma.lead.findUnique({
      where: { id: input.leadId },
      select: { id: true, hasWebsite: true, analysisScore: true, qualifiedAt: true },
    });
    if (!lead) return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });

    const fit = scoreLead({ ...input, hasWebsite: lead.hasWebsite, siteScore: lead.analysisScore });
    await prisma.lead.update({
      where: { id: lead.id },
      data: {
        trade: input.trade,
        desiredAction: input.desiredAction,
        currentLeadSource: input.currentLeadSource,
        readyThisWeek: input.readyThisWeek,
        fitScore: fit.score,
        fitStatus: fit.status,
        fitReasons: JSON.stringify(fit.reasons),
        qualifiedAt: new Date(),
      },
    });
    if (!lead.qualifiedAt) {
      await recordWorkEvent({
        entityType: "lead",
        entityId: lead.id,
        event: "qualified",
        actor: "customer",
        note: `${fit.status} (${fit.score}/8): ${fit.reasons.join("; ")}`,
      });
    }
    // The visitor sees the outcome, not the internal reasons.
    return NextResponse.json({ success: true, status: fit.status });
  } catch (error) {
    return apiError(error, "Failed to save answers");
  }
}
