import { apiLogger } from "@/lib/logger";
import { recordWorkEvent, type WorkEntity } from "@/lib/work/events";

/**
 * Send one email to a customer and record whether it left: `customer_emailed` (with the
 * provider id) or `customer_email_failed` (with the error) on the work timeline. Never
 * throws — the caller's work already happened — but returns false so the caller can tell
 * Blayke the customer was NOT notified instead of assuming they were.
 */
export async function notifyCustomer(
  entity: { entityType: WorkEntity; entityId: string },
  what: string,
  send: () => Promise<{ id?: string | null } | undefined>
): Promise<boolean> {
  try {
    const res = await send();
    await recordWorkEvent({ ...entity, event: "customer_emailed", actor: "system", note: `${what} (id ${res?.id ?? "unknown"})` });
    return true;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    apiLogger.error({ err, ...entity, what }, "Customer email FAILED");
    await recordWorkEvent({ ...entity, event: "customer_email_failed", actor: "system", note: `${what}: ${message}` });
    return false;
  }
}
