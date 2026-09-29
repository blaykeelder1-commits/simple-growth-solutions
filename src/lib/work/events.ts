import { prisma } from "@/lib/db/prisma";
import { apiLogger } from "@/lib/logger";

export type WorkEntity = "cr" | "project" | "support" | "lead" | "rule";
export type WorkActor = "andy" | "blayke" | "customer" | "system";

export interface WorkEventInput {
  entityType: WorkEntity;
  entityId: string;
  event: string;
  actor: WorkActor;
  note?: string | null;
  touch?: string | null;
  minutes?: number | null;
}

/** The actor behind a request: the headless service token is Andy, any admin session is Blayke. */
export function actorFor(session: { user: { id: string; role: string } }): WorkActor {
  if (session.user.id === "andy-service") return "andy";
  return session.user.role === "admin" ? "blayke" : "customer";
}

/**
 * Append one step to the work timeline. Called from route handlers AFTER the
 * work itself succeeded. A timeline write must never undo or block customer
 * work, so a failure is logged loudly (error level, with the full event) rather
 * than thrown — the missing row is recoverable from the audit log; a failed
 * customer request is not.
 */
export async function recordWorkEvent(input: WorkEventInput): Promise<void> {
  try {
    await prisma.workEvent.create({
      data: {
        entityType: input.entityType,
        entityId: input.entityId,
        event: input.event,
        actor: input.actor,
        note: input.note?.trim() || null,
        touch: input.touch?.trim() || null,
        minutes: input.minutes ?? null,
      },
    });
  } catch (err) {
    apiLogger.error({ err, workEvent: input }, "WorkEvent write FAILED — timeline row missing");
  }
}
