import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { withAdmin } from "@/lib/api/with-auth";
import { apiError } from "@/lib/api/errors";
import { z } from "zod";

// Andy-only endpoints (authenticated by the ANDY_SERVICE_TOKEN → admin). This is
// how Andy on the VPS sees BRAND-NEW build requests (new_build projects a customer
// submitted in the portal) and surfaces them to Blayke on WhatsApp — exactly once.
//
// Mirrors /api/leads/agent. The "set-once" guard is websiteProject.andySeenAt: a
// project is pending only while status='submitted' AND projectType='new_build' AND
// andySeenAt is null. Andy stamps andySeenAt (POST mark-seen) the moment he
// surfaces it, so a later sweep never re-fires.
//
// maxAge guard (30d): defense-in-depth against a first-deploy fan-out of historical
// projects. The migration also backfills every existing project's andy_seen_at, so
// only genuinely new submissions surface — this window just bounds the blast radius.

const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

// GET /api/projects/agent — new_build requests Andy has not surfaced yet.
export const GET = withAdmin(async (_req, _ctx, _session) => {
  try {
    const since = new Date(Date.now() - MAX_AGE_MS);

    const projects = await prisma.websiteProject.findMany({
      where: {
        status: "submitted",
        projectType: "new_build",
        andySeenAt: null,
        createdAt: { gte: since },
      },
      orderBy: { createdAt: "asc" },
      take: 25,
      select: {
        id: true,
        projectName: true,
        projectType: true,
        desiredFeatures: true,
        designPreferences: true,
        targetAudience: true,
        existingUrl: true,
        createdAt: true,
        organizationId: true,
        organization: {
          select: {
            name: true,
            industry: true,
            sourceLeadId: true,
            users: { select: { name: true, email: true } },
          },
        },
      },
    });

    // Pull the originating lead's phone/contact (User has no phone — it lives on
    // the Lead the org was created from) so Andy's WhatsApp ping can include it.
    const leadIds = projects
      .map((p) => p.organization?.sourceLeadId)
      .filter((v): v is string => Boolean(v));
    const leads = leadIds.length
      ? await prisma.lead.findMany({
          where: { id: { in: leadIds } },
          select: { id: true, phone: true, contactName: true },
        })
      : [];
    const leadById = new Map(leads.map((l) => [l.id, l]));

    return NextResponse.json({
      pendingCount: projects.length,
      projects: projects.map((p) => {
        const lead = p.organization?.sourceLeadId
          ? leadById.get(p.organization.sourceLeadId)
          : undefined;
        const primaryUser = p.organization?.users[0];
        return {
          id: p.id,
          projectName: p.projectName,
          projectType: p.projectType,
          organizationId: p.organizationId,
          businessName: p.organization?.name ?? null,
          industry: p.organization?.industry ?? null,
          contactName: primaryUser?.name ?? lead?.contactName ?? null,
          email: primaryUser?.email ?? null,
          phone: lead?.phone ?? null,
          desiredFeatures: p.desiredFeatures,
          designPreferences: p.designPreferences,
          targetAudience: p.targetAudience,
          existingUrl: p.existingUrl,
          createdAt: p.createdAt.toISOString(),
        };
      }),
    });
  } catch (error) {
    return apiError(error, "Failed to load new-build requests");
  }
});

const seenSchema = z.object({
  projectId: z.string().min(1),
});

// POST /api/projects/agent — Andy marks a new_build request as surfaced (set-once).
export const POST = withAdmin(async (req, _ctx, _session) => {
  try {
    const { projectId } = seenSchema.parse(await req.json());

    // Stamp only if not already stamped — idempotent, so a retry can't double-fire
    // and a concurrent sweep can't both "win".
    const result = await prisma.websiteProject.updateMany({
      where: { id: projectId, andySeenAt: null },
      data: { andySeenAt: new Date() },
    });

    return NextResponse.json({ success: true, marked: result.count > 0 });
  } catch (error) {
    return apiError(error, "Failed to mark new-build request seen");
  }
});
