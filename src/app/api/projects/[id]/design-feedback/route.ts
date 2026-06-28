import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { withAuth } from "@/lib/api/with-auth";
import { apiError } from "@/lib/api/errors";
import { getAdminEmails, sendEmail, emailLayout, escapeHtml } from "@/lib/email";
import { apiLogger } from "@/lib/logger";
import { z } from "zod";

// Customer-side mirror of the admin design feedback loop. When the customer
// doesn't like the released options, or likes one but wants a tweak, they leave
// feedback here from their portal. It lands in the SAME [DESIGN] thread the admin
// side uses (a client-visible ProjectNote), so Andy's feedback sweep surfaces it
// to Blayke on WhatsApp and Claude/Andy revise — and the rejected direction is on
// record so we never re-send it. No new DB column (reuses ProjectNote.andySeenAt).

const feedbackSchema = z.object({
  // "none" = none of these feel right (reject all). "edit" = like one, change it.
  decision: z.enum(["none", "edit"]),
  feedback: z.string().min(1).max(4000),
  // For "edit": which option key they're reacting to (optional but encouraged).
  optionKey: z.string().optional(),
});

interface DesignOption {
  key: string;
  label: string;
  blurb?: string;
  previewUrl: string;
}

export const POST = withAuth(async (req, ctx, session) => {
  try {
    const { id: projectId } = await ctx.params;
    const { decision, feedback, optionKey } = feedbackSchema.parse(await req.json());

    const user = await prisma.user.findUnique({ where: { id: session.user.id } });
    const project = await prisma.websiteProject.findUnique({ where: { id: projectId } });
    if (!project) {
      return NextResponse.json({ success: false, message: "Project not found" }, { status: 404 });
    }
    if (user?.role !== "admin" && project.organizationId !== user?.organizationId) {
      return NextResponse.json({ success: false, message: "Access denied" }, { status: 403 });
    }

    // Resolve the option label for "edit" feedback so the thread reads cleanly.
    let optionLabel: string | null = null;
    if (optionKey && project.designOptions) {
      try {
        const opts = JSON.parse(project.designOptions) as DesignOption[];
        optionLabel = Array.isArray(opts) ? opts.find((o) => o.key === optionKey)?.label ?? null : null;
      } catch {
        // ignore malformed
      }
    }

    // Same [DESIGN] convention the admin card + feedback-agent already parse:
    // keyword (DENIED / EDITS REQUESTED) immediately after the tag, source + context
    // embedded in the visible feedback. No parser/regex changes needed.
    const keyword = decision === "none" ? "DENIED" : "EDITS REQUESTED";
    const context =
      decision === "edit" && optionLabel ? `[customer · re: ${optionLabel}] ` : "[customer] ";
    const content = `[DESIGN] ${keyword}: ${context}${feedback.trim()}`;

    // Client-visible so it lives in the shared thread (both portal + admin see it).
    const note = await prisma.projectNote.create({
      data: { projectId, content, isInternal: false, authorId: session.user.id },
    });

    // Email heads-up to staff (the WhatsApp sweep also surfaces it independently).
    getAdminEmails({ exclude: session.user.email })
      .then((emails) => {
        if (!emails.length) return;
        const verb = decision === "none" ? "didn't love any direction" : "asked for an edit";
        const html = emailLayout(
          `
          <h2 style="color:#ea580c;">Design feedback from the customer ✍️</h2>
          <p><strong>${escapeHtml(project.projectName)}</strong> — the customer ${verb}.</p>
          ${optionLabel ? `<p>Re: <strong>${escapeHtml(optionLabel)}</strong></p>` : ""}
          <blockquote style="border-left:3px solid #ea580c;padding-left:12px;color:#374151;">${escapeHtml(feedback.trim())}</blockquote>
          <p><a href="${process.env.NEXTAUTH_URL || ""}/admin/projects/${project.id}">Open in Admin</a></p>
        `,
          "Design feedback"
        );
        return sendEmail({
          to: emails,
          subject: `✍️ Design feedback — ${project.projectName}`,
          html,
        });
      })
      .catch((e) => apiLogger.warn({ err: e }, "Failed to send design-feedback notification"));

    return NextResponse.json({ success: true, note }, { status: 201 });
  } catch (error) {
    return apiError(error, "Failed to record design feedback");
  }
});
