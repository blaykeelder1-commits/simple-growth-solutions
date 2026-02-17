import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { withAdmin } from "@/lib/api/with-auth";
import { apiError } from "@/lib/api/errors";
import { sendProjectNoteEmail } from "@/lib/email";
import { apiLogger } from "@/lib/logger";
import { z } from "zod";

const noteSchema = z.object({
  content: z.string().min(1),
  isInternal: z.boolean().default(true),
});

// POST /api/admin/projects/[id]/notes - Add a project note
export const POST = withAdmin(async (req, ctx, session) => {
  try {
    const { id: projectId } = await ctx.params;
    const body = await req.json();
    const validatedData = noteSchema.parse(body);

    const note = await prisma.projectNote.create({
      data: {
        projectId,
        content: validatedData.content,
        isInternal: validatedData.isInternal,
        authorId: session.user.id,
      },
    });

    // If client-visible note, notify the customer
    if (!validatedData.isInternal) {
      prisma.websiteProject.findUnique({
        where: { id: projectId },
        include: {
          organization: {
            include: { users: { select: { email: true, name: true } } },
          },
        },
      })
        .then((project) => {
          if (!project?.organization?.users.length) return;
          const emails = project.organization.users.map((u) => u.email);
          const primaryName = project.organization.users[0].name || project.organization.users[0].email;
          return sendProjectNoteEmail(
            emails,
            primaryName,
            { id: project.id, projectName: project.projectName },
            validatedData.content
          );
        })
        .catch((e) => apiLogger.warn({ err: e }, "Failed to send project note notification"));
    }

    return NextResponse.json({ success: true, note }, { status: 201 });
  } catch (error) {
    return apiError(error, "Failed to create note");
  }
});
