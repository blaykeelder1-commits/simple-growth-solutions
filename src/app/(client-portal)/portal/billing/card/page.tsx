"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, CreditCard, Loader2 } from "lucide-react";

/**
 * Update the card Square bills each month. The card form is Square's own secure field
 * (Web Payments SDK, an iframe) — card numbers go straight to Square; our server only
 * ever receives Square's single-use token.
 */

interface CardInfo {
  brand: string | null;
  last4: string | null;
  expMonth: number | null;
  expYear: number | null;
}

interface CardState {
  available: boolean;
  sdk?: { applicationId: string; locationId: string; environment: "sandbox" | "production" };
  cardholderName?: string | null;
  card?: CardInfo | null;
  paymentFailedAt?: string | null;
  unpaidInvoice?: { publicUrl: string; amountCents: number | null } | null;
}

interface SquareCard {
  attach: (selector: string) => Promise<void>;
  tokenize: (details?: Record<string, unknown>) => Promise<{ status: string; token?: string; errors?: { message: string }[] }>;
  destroy?: () => Promise<void>;
}
declare global {
  interface Window {
    Square?: { payments: (appId: string, locationId: string) => { card: () => Promise<SquareCard> } };
  }
}

function loadSquare(environment: "sandbox" | "production"): Promise<void> {
  const src =
    environment === "production" ? "https://web.squarecdn.com/v1/square.js" : "https://sandbox.web.squarecdn.com/v1/square.js";
  if (window.Square) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const el = document.createElement("script");
    el.src = src;
    el.async = true;
    el.onload = () => resolve();
    el.onerror = () => reject(new Error("Square's card form didn't load"));
    document.head.appendChild(el);
  });
}

const describe = (c?: CardInfo | null) =>
  c?.last4
    ? `${c.brand ? c.brand.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (m) => m.toUpperCase()) : "Card"} ending ${c.last4}${
        c.expMonth && c.expYear ? ` · expires ${String(c.expMonth).padStart(2, "0")}/${String(c.expYear).slice(-2)}` : ""
      }`
    : "No card on file";

export default function UpdateCardPage() {
  const [state, setState] = useState<CardState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<CardState["unpaidInvoice"] | undefined>(undefined);
  const [formReady, setFormReady] = useState(false);
  const cardRef = useRef<SquareCard | null>(null);

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const res = await fetch("/api/billing/card");
        const j = (await res.json()) as CardState & { success?: boolean };
        if (!live) return;
        setState(j);
        if (!j.available || !j.sdk) return;
        await loadSquare(j.sdk.environment);
        const payments = window.Square!.payments(j.sdk.applicationId, j.sdk.locationId);
        const card = await payments.card();
        await card.attach("#card-container");
        cardRef.current = card;
        if (live) setFormReady(true);
      } catch {
        if (live) setError("The secure card form couldn't load. Please refresh, or message us from Support.");
      }
    })();
    return () => {
      live = false;
      cardRef.current?.destroy?.().catch(() => undefined);
    };
  }, []);

  const save = async () => {
    if (!cardRef.current) return;
    setBusy(true);
    setError(null);
    try {
      const result = await cardRef.current.tokenize({
        intent: "STORE",
        customerInitiated: true,
        sellerKeyedIn: false,
        billingContact: state?.cardholderName ? { givenName: state.cardholderName } : undefined,
      });
      if (result.status !== "OK" || !result.token) {
        setError(result.errors?.[0]?.message || "Please check your card details.");
        return;
      }
      const res = await fetch("/api/billing/card", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceId: result.token }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j.success) {
        setError(j.message || "We couldn't save that card. Please try again.");
        return;
      }
      setState((s) => (s ? { ...s, card: j.card } : s));
      setDone(j.unpaidInvoice ?? null);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <Link href="/portal/billing" className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900">
        <ArrowLeft className="h-4 w-4" /> Back to billing
      </Link>

      <div className="rounded-xl border border-gray-200 bg-white p-6 space-y-5">
        <div className="flex items-center gap-3">
          <CreditCard className="h-6 w-6 text-blue-600" />
          <h1 className="text-xl font-semibold text-gray-900">Update your card</h1>
        </div>

        {!state && (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        )}

        {state && !state.available && (
          <p className="text-gray-700">
            There&apos;s no card-billed plan on this account yet. Once you start your plan in{" "}
            <Link href="/portal/billing" className="text-blue-600 underline">Billing</Link>, you can change the card here any time.
          </p>
        )}

        {state?.available && (
          <>
            <p className="text-sm text-gray-600">
              Card we bill each month: <span className="font-medium text-gray-900">{describe(state.card)}</span>
            </p>

            {state.paymentFailedAt && done === undefined && (
              <div role="alert" className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800">
                Your last payment didn&apos;t go through. Add a working card below
                {state.unpaidInvoice ? ", then pay the outstanding invoice." : "."}
              </div>
            )}

            {done !== undefined ? (
              <div className="space-y-3 rounded-lg border border-green-200 bg-green-50 p-4">
                <p className="flex items-center gap-2 font-semibold text-green-900">
                  <CheckCircle2 className="h-5 w-5" /> Card updated
                </p>
                <p className="text-sm text-green-800">We&apos;ll bill {describe(state.card)} from now on.</p>
                {done && (
                  <a
                    href={done.publicUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
                  >
                    Pay the outstanding invoice{done.amountCents != null ? ` ($${(done.amountCents / 100).toFixed(2)})` : ""}
                  </a>
                )}
              </div>
            ) : (
              <>
                <div id="card-container" className="min-h-[90px]" />
                <button
                  onClick={save}
                  disabled={busy || !formReady}
                  className="w-full rounded-lg bg-blue-600 px-5 py-2.5 font-semibold text-white disabled:opacity-50"
                >
                  {busy ? "Saving…" : "Save this card"}
                </button>
                <p className="text-xs text-gray-500">
                  Your card details go directly to Square, our payment processor. We never see or store your card number.
                </p>
              </>
            )}
          </>
        )}

        {error && <p className="text-sm text-red-700">{error}</p>}
      </div>
    </div>
  );
}
