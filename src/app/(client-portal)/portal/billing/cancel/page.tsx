"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";

interface CancelState {
  subscription: {
    plan: string;
    planLabel: string;
    currentPeriodEnd: string | null;
    cancelAt: string | null;
    pendingPlan: string | null;
    pendingPlanLabel: string | null;
  } | null;
  reasons: { key: string; label: string }[];
  offer: {
    toPlan: string;
    toLabel: string;
    price: string;
    forReasons: string[];
    youLose: string[];
  } | null;
}

function fmt(d: string | null | undefined) {
  return d ? new Date(d).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : "the end of your billing period";
}

/**
 * Self-serve cancellation. Cancel is always visible and works in one click (a reason is
 * optional); the one save offer — a cheaper plan — appears only when it answers the reason
 * they picked, and only once per customer.
 */
export default function CancelPage() {
  const [state, setState] = useState<CancelState | null>(null);
  const [reason, setReason] = useState<string>("");
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/portal/cancel");
    const j = await res.json().catch(() => ({}));
    if (!res.ok || !j.success) setError(j.message || "Couldn't load your plan.");
    else setState(j);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const act = async (action: "cancel" | "undo" | "downgrade") => {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/portal/cancel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, reason: reason || (action === "cancel" ? "other" : undefined), comment: comment || undefined }),
    });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok || !j.success) {
      setError(j.message || "Something went wrong — please try again.");
      return;
    }
    setDone(action);
    await load();
  };

  if (error && !state) return <p className="text-red-700">{error}</p>;
  if (!state) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  const sub = state.subscription;
  const showOffer = !!state.offer && state.offer.forReasons.includes(reason);

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <Link href="/portal/billing" className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900">
        <ArrowLeft className="h-4 w-4" /> Back to billing
      </Link>

      {!sub && <p className="text-gray-700">You don&apos;t have an active plan to cancel.</p>}

      {sub?.cancelAt && (
        <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-6">
          <h1 className="text-xl font-semibold text-gray-900">Your plan ends on {fmt(sub.cancelAt)}</h1>
          <p className="text-gray-700">
            {done === "cancel" ? "Your cancellation is confirmed and we've emailed you a copy. " : ""}
            Everything stays as it is until then, and you won&apos;t be charged again. Changed your mind? Keep your plan with one click.
          </p>
          <button
            onClick={() => act("undo")}
            disabled={busy}
            className="rounded-lg bg-blue-600 px-5 py-2.5 font-semibold text-white disabled:opacity-50"
          >
            Keep my {sub.planLabel} plan
          </button>
        </div>
      )}

      {sub?.pendingPlan && !sub.cancelAt && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-6">
          <h1 className="text-xl font-semibold text-gray-900">You&apos;re staying — thank you</h1>
          <p className="mt-2 text-gray-700">
            Your plan switches from {sub.planLabel} to {sub.pendingPlanLabel} on {fmt(sub.currentPeriodEnd)}. We&apos;ve emailed you the details.
          </p>
        </div>
      )}

      {sub && !sub.cancelAt && !sub.pendingPlan && (
        <div className="space-y-5 rounded-lg border border-gray-200 bg-white p-6">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Cancel your {sub.planLabel} plan</h1>
            <p className="mt-1 text-gray-600">
              It ends on {fmt(sub.currentPeriodEnd)}, the end of what you&apos;ve paid for. You can change your mind until then.
            </p>
          </div>

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-gray-900">What made you decide? (optional — it helps us do better)</legend>
            {state.reasons.map((r) => (
              <label key={r.key} className="flex items-center gap-2 text-sm text-gray-700">
                <input type="radio" name="reason" value={r.key} checked={reason === r.key} onChange={() => setReason(r.key)} />
                {r.label}
              </label>
            ))}
          </fieldset>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
            placeholder="Anything you'd like us to know? (optional)"
            className="w-full rounded border border-gray-300 p-2 text-sm"
          />

          {showOffer && state.offer && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
              <p className="font-semibold text-gray-900">
                Would {state.offer.toLabel} at {state.offer.price}/month work better?
              </p>
              <p className="mt-1 text-sm text-gray-700">
                Your website, hosting, security, Google Business Profile care and SEO all stay. On {state.offer.toLabel} you&apos;d no longer have:
              </p>
              <ul className="mt-1 list-disc pl-5 text-sm text-gray-700">
                {state.offer.youLose.map((l) => (
                  <li key={l}>{l}</li>
                ))}
              </ul>
              <p className="mt-1 text-sm text-gray-600">The switch happens at your next billing date — nothing changes before then.</p>
              <button
                onClick={() => act("downgrade")}
                disabled={busy}
                className="mt-3 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                Switch to {state.offer.toLabel} instead
              </button>
            </div>
          )}

          <button
            onClick={() => act("cancel")}
            disabled={busy}
            className="w-full rounded-lg border border-red-300 px-5 py-2.5 font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
          >
            Cancel my subscription
          </button>
        </div>
      )}

      {error && <p className="text-sm text-red-700">{error}</p>}
    </div>
  );
}
