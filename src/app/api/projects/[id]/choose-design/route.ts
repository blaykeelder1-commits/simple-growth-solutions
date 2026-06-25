import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { withAuth } from "@/lib/api/with-auth";
import { apiError } from "@/lib/api/errors";
import { getAdminEmails, sendEmail, emailLayout, escapeHtml } from "@/lib/email";
import { apiLogger } from "@/lib/logger";
import { z } from "zod";

const chooseSchema = z.object({ key: z.string().min(1) });

// One design direction the admin attached to the project. Stored as a JSON-array
// string in website_projects.design_options (same JSON-as-text convention as
// desired_features). previewUrl points at the in-app noindex mockup page.
interface DesignOption {
  key: string;
  label: string;
  blurb?: string;
  previewUrl: string;
}

// Once the project has moved into the build itself, the direction is locked —
// a customer can pick/repick only while it's still in the proposal stage.
const PICKABLE_STATUSES = new Set(["submitted", "reviewing", "approved"]);

// POST /api/projects/[id]/choose-design — customer picks one of the design
// directions the admin attached. The entire choose-a-direction loop lives in the
// portal (no email to the customer); staff get an internal heads-up.
export const POST = withAuth(async (req, ctx, session) => {
  try {
    const { id: projectId } = await ctx.params;
    const { key } = chooseSchema.parse(await req.json());

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

    let options: DesignOption[] = [];
    if (project.designOptions) {
      try {
        const parsed = JSON.parse(project.designOptions);
        if (Array.isArray(parsed)) options = parsed as DesignOption[];
      } catch {
        // Malformed design_options — treat as none so we 400 below rather than throw.
      }
    }

    if (options.length === 0) {
      return NextResponse.json(
        { success: false, message: "This project has no design options to choose from." },
        { status: 400 }
      );
    }

    const chosen = options.find((o) => o.key === key);
    if (!chosen) {
      return NextResponse.json(
        { success: false, message: "That design option isn't available on this project." },
        { status: 400 }
      );
    }

    // Lock once the build is underway (admins can still override via PATCH).
    if (user?.role !== "admin" && !PICKABLE_STATUSES.has(project.status)) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Your build is already underway, so the design direction is locked. Use Request Changes if you need an adjustment.",
          code: "design_locked",
        },
        { status: 409 }
      );
    }

    const updated = await prisma.websiteProject.update({
      where: { id: projectId },
      data: {
        selectedDesignOption: key,
        // Stamp the first time only, so a repick doesn't reset the "they decided" clock.
        ...(project.designSelectedAt ? {} : { designSelectedAt: new Date() }),
        // Nudge the timeline forward off "submitted" once they've chosen a direction.
        ...(project.status === "submitted" ? { status: "reviewing" } : {}),
      },
    });

    // Internal heads-up to staff (NOT the customer) — so Blayke can start the
    // build promptly even before the Andy new-build sweep surfaces it on WhatsApp.
    getAdminEmails({ exclude: session.user.email })
      .then((emails) => {
        if (!emails.length) return;
        const html = emailLayout(
          `
          <h2 style="color: #2563eb;">A customer picked a design 🎨</h2>
          <p><strong>${escapeHtml(project.projectName)}</strong> — the customer chose
          the <strong>${escapeHtml(chosen.label)}</strong> direction.</p>
          <p style="color:#6b7280;">Picked by ${escapeHtml(session.user.name || session.user.email || "the customer")}.
          Time to build it out and move the project to review.</p>
          ${`<p><a href="${process.env.NEXTAUTH_URL || ""}/admin/projects/${project.id}">Open in Admin</a></p>`}
        `,
          "Design selected"
        );
        return sendEmail({
          to: emails,
          subject: `🎨 Design picked: ${chosen.label} — ${project.projectName}`,
          html,
        });
      })
      .catch((e) =>
        apiLogger.warn({ err: e }, "Failed to send design-selected notification")
      );

    // Null actor for the headless service account (not a real User row).
    await prisma.auditLog.create({
      data: {
        userId: session.user.id === "andy-service" ? null : session.user.id,
        organizationId: project.organizationId,
        action: "design_option_selected",
        entityType: "website_project",
        entityId: projectId,
        oldValues: { selectedDesignOption: project.selectedDesignOption },
        newValues: { selectedDesignOption: key },
      },
    });

    return NextResponse.json({ success: true, project: updated });
  } catch (error) {
    return apiError(error, "Failed to record design choice");
  }
});
