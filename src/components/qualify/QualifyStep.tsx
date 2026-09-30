"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DESIRED_ACTIONS, LEAD_SOURCES, TRADES, type FitStatus } from "@/lib/qualify/score";

export interface LeadHandle {
  leadId: string;
  qualifyToken: string;
}

const selectClass =
  "mt-1 w-full rounded-lg border bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary";

// Asked AFTER the email is captured, so a visitor who stops here is still a lead.
// Four answers, all tap-to-choose — no typing on a phone.
export function QualifyStep({ lead, onDone }: { lead: LeadHandle; onDone: (status: FitStatus) => void }) {
  const [trade, setTrade] = useState("");
  const [action, setAction] = useState("");
  const [source, setSource] = useState("");
  const [ready, setReady] = useState<"" | "yes" | "no">("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trade || !action || !source || !ready) {
      setError("Please answer all four. It takes a few seconds.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/leads/qualify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId: lead.leadId,
          token: lead.qualifyToken,
          trade,
          desiredAction: action,
          currentLeadSource: source,
          readyThisWeek: ready === "yes",
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j.success) throw new Error(j.message || "failed");
      onDone(j.status as FitStatus);
    } catch {
      setError("Couldn't save that. Please try again.");
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="mx-auto max-w-md space-y-4 text-left">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Got it. Four quick questions</h2>
        <p className="mt-1 text-sm text-gray-600">So we build the right website for your business.</p>
      </div>
      <label className="block text-sm font-medium text-gray-800">
        What kind of business is it?
        <select className={selectClass} value={trade} onChange={(e) => setTrade(e.target.value)}>
          <option value="">Choose one</option>
          {Object.entries(TRADES).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm font-medium text-gray-800">
        What should a visitor do on your website?
        <select className={selectClass} value={action} onChange={(e) => setAction(e.target.value)}>
          <option value="">Choose one</option>
          {Object.entries(DESIRED_ACTIONS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm font-medium text-gray-800">
        Where do most of your customers find you today?
        <select className={selectClass} value={source} onChange={(e) => setSource(e.target.value)}>
          <option value="">Choose one</option>
          {Object.entries(LEAD_SOURCES).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </label>
      <fieldset className="text-sm font-medium text-gray-800">
        <legend>Can you send us your photos, details and approvals within a week?</legend>
        <div className="mt-2 flex gap-3">
          {(["yes", "no"] as const).map((v) => (
            <label
              key={v}
              className={`flex-1 cursor-pointer rounded-lg border px-4 py-3 text-center ${
                ready === v ? "border-primary bg-primary/10" : "bg-white"
              }`}
            >
              <input
                type="radio"
                name="ready"
                value={v}
                className="sr-only"
                checked={ready === v}
                onChange={() => setReady(v)}
              />
              {v === "yes" ? "Yes" : "Not this week"}
            </label>
          ))}
        </div>
      </fieldset>
      {error && <p className="text-sm text-red-700">{error}</p>}
      <Button type="submit" size="lg" className="w-full" disabled={busy}>
        {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : "Continue"}
      </Button>
    </form>
  );
}

/**
 * What the visitor sees after answering. Honest about what happens next: only a fit
 * hears "free website"; everyone else gets a real next step, never a promised build.
 */
export function QualifyOutcome({ status }: { status: FitStatus }) {
  if (status === "fit") {
    return (
      <div className="text-center">
        <div className="mb-3 text-4xl">🎉</div>
        <h2 className="mb-2 text-2xl font-bold text-green-800">You qualify for a free website</h2>
        <p className="text-green-700">We&apos;ll reach out within 24 hours to get started. Keep an eye on your inbox.</p>
      </div>
    );
  }
  if (status === "decline") {
    return (
      <div className="text-center">
        <h2 className="mb-2 text-2xl font-bold text-gray-900">Thanks, we&apos;ll be in touch</h2>
        <p className="text-gray-700">
          Online stores and checkout are outside our free website build. We&apos;ll email you within 1 business day
          about the options for your business.
        </p>
      </div>
    );
  }
  return (
    <div className="text-center">
      <h2 className="mb-2 text-2xl font-bold text-gray-900">Thanks, we&apos;re on it</h2>
      <p className="text-gray-700">We review every request by hand and will email you within 1 business day.</p>
    </div>
  );
}
