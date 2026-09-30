import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { withAuth, withAdmin } from "@/lib/api/with-auth";
import { apiError } from "@/lib/api/errors";
import { actorFor, recordWorkEvent } from "@/lib/work/events";
import { sendProjectStatusUpdateEmail } from "@/lib/email";
import { apiLogger } from "@/lib/logger";
import { orgStanding } from "@/lib/billing/standing";
import { z } from "zod";

// Frontend sends `null` to clear optional URL/platform fields; accept both
// `null` and "" as "clear this field" sentinels alongside undefined.
const updateProjectSchema = z.object({
  status: z.string().optional(),
  priority: z.number().optional(),
  deployedUrl: z.string().url().or(z.literal("")).nullable().optional(),
  repositoryUrl: z.string().url().or(z.literal("")).nullable().optional(),
  deploymentPlatform: z.string().nullable().optional(),
  estimatedCompletion: z.string().datetime().optional(),
  // JSON-array string of design directions [{ key, label, blurb, previewUrl }]
  // the customer picks from in-portal. "" / null clears it.
  designOptions: z.string().nullable().optional(),
  selectedDesignOption: z.string().nullable().optional(),
  // Gate 2: true = approve sending options to the customer (stamp now), false =
  // pull them back to staff-only. Controls customer-side picker visibility.
  releaseDesignOptions: z.boolean().optional(),
  // Gate 1: true = Blayke approves Andy to build the design options (stamp now),
  // false = revoke. No options should be built until buildApprovedAt is set.
  approveBuild: z.boolean().optional(),
});

// GET /api/projects/[id] - Get single project
export const GET = withAuth(async (_req, ctx, session) => {
  try {
    const { id } = await ctx.params;

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    const project = await prisma.websiteProject.findUnique({
      where: { id },
      include: {
        changeRequests: {
          orderBy: { createdAt: "desc" },
        },
        projectNotes: {
          where: user?.role === "admin" ? {} : { isInternal: false },
          orderBy: { createdAt: "desc" },
        },
        projectFiles: true,
      },
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

    // Hosting lock: customers on trial don't see the live deployedUrl. They
    // can preview the build inside the portal but the public URL only goes
    // live once they convert to a paid subscription. Admins always see it.
    if (user?.role !== "admin") {
      // Paid or in-date comp only — the same rule as every other gate.
      const { standing } = await orgStanding(project.organizationId);
      if (standing === "unpaid") {
        return NextResponse.json({
          success: true,
          project: { ...project, deployedUrl: null, repositoryUrl: null },
          deployedUrlLocked: true,
        });
      }
    }

    return NextResponse.json({ success: true, project });
  } catch (error) {
    return apiError(error, "Failed to fetch project");
  }
});

// PATCH /api/projects/[id] - Update project (admin only)
export const PATCH = withAdmin(async (req, ctx, session) => {
  try {
    const { id } = await ctx.params;
    const body = await req.json();
    const validatedData = updateProjectSchema.parse(body);

    // Gate 1 (approve build), Gate 2 (release designs to the customer) and project status
    // (which emails the customer) are Blayke's decisions — never Andy's.
    if (
      actorFor(session) === "andy" &&
      (validatedData.approveBuild !== undefined ||
        validatedData.releaseDesignOptions !== undefined ||
        validatedData.status !== undefined)
    ) {
      return NextResponse.json(
        { success: false, message: "Andy cannot approve builds, release designs or change project status — Blayke decides" },
        { status: 403 }
      );
    }

    // Get old values for audit log
    const oldProject = await prisma.websiteProject.findUnique({
      where: { id },
      select: { status: true, priority: true, deployedUrl: true, deploymentPlatform: true },
    });

    const project = await prisma.websiteProject.update({
      where: { id },
      data: {
        ...(validatedData.status && { status: validatedData.status }),
        ...(validatedData.priority !== undefined && { priority: validatedData.priority }),
        ...(validatedData.deployedUrl !== undefined && {
          deployedUrl: validatedData.deployedUrl || null,
        }),
        ...(validatedData.repositoryUrl !== undefined && {
          repositoryUrl: validatedData.repositoryUrl || null,
        }),
        ...(validatedData.deploymentPlatform && {
          deploymentPlatform: validatedData.deploymentPlatform,
        }),
        ...(validatedData.estimatedCompletion && {
          estimatedCompletion: new Date(validatedData.estimatedCompletion),
        }),
        ...(validatedData.status === "completed" && {
          actualCompletion: new Date(),
        }),
        ...(validatedData.designOptions !== undefined && {
          designOptions: validatedData.designOptions || null,
        }),
        ...(validatedData.selectedDesignOption !== undefined && {
          selectedDesignOption: validatedData.selectedDesignOption || null,
        }),
        ...(validatedData.releaseDesignOptions !== undefined && {
          designOptionsReleasedAt: validatedData.releaseDesignOptions ? new Date() : null,
        }),
        ...(validatedData.approveBuild !== undefined && {
          buildApprovedAt: validatedData.approveBuild ? new Date() : null,
        }),
      },
    });

    // Notify customer if status changed
    if (validatedData.status && oldProject?.status !== validatedData.status) {
      prisma.organization.findUnique({
        where: { id: project.organizationId },
        include: { users: { select: { email: true, name: true } } },
      })
        .then((org) => {
          if (!org?.users.length) return;
          const emails = org.users.map((u) => u.email);
          const primaryName = org.users[0].name || org.users[0].email;
          return sendProjectStatusUpdateEmail(
            emails,
            primaryName,
            { id: project.id, projectName: project.projectName },
            oldProject?.status || "submitted",
            validatedData.status!
          );
        })
        .catch((e) => apiLogger.warn({ err: e }, "Failed to send project status notification"));
    }

    // Gate 1 approved from the admin project page closes its WhatsApp approval item too,
    // so the queue never shows a build as still waiting.
    if (validatedData.approveBuild === true) {
      const closed = await prisma.approvalItem.updateMany({
        where: { kind: "build_start", refId: id, status: "awaiting" },
        data: { status: "approved", decidedVia: "portal", decidedAt: new Date() },
      });
      if (closed.count) {
        await recordWorkEvent({ entityType: "project", entityId: id, event: "approved", actor: actorFor(session) });
      }
    }

    // Audit log. The headless service account ("andy-service") isn't a real
    // User row, so record a null actor rather than violating the userId FK.
    await prisma.auditLog.create({
      data: {
        userId: session.user.id === "andy-service" ? null : session.user.id,
        organizationId: project.organizationId,
        action: "project_updated",
        entityType: "website_project",
        entityId: id,
        oldValues: oldProject ? JSON.parse(JSON.stringify(oldProject)) : undefined,
        newValues: JSON.parse(JSON.stringify(validatedData)),
      },
    });

    return NextResponse.json({ success: true, project });
  } catch (error) {
    return apiError(error, "Failed to update project");
  }
});
