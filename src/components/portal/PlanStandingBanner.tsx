"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Portal-wide nudge when a customer's website plan isn't paid (no plan, first payment
 * not made, or a free period that ended). Hidden on the billing page itself, which
 * shows the full explanation next to the plan picker.
 */
export function PlanStandingBanner() {
  const pathname = usePathname();
  const [unpaid, setUnpaid] = useState(false);

  useEffect(() => {
    let live = true;
    fetch("/api/billing/subscriptions")
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (live) setUnpaid(j?.websiteStanding === "unpaid");
      })
      .catch(() => undefined); // no banner beats a wrong banner
    return () => {
      live = false;
    };
  }, []);

  if (!unpaid || pathname?.startsWith("/portal/billing")) return null;
  return (
    <div role="alert" className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-300 bg-red-50 px-4 py-3">
      <p className="text-sm text-red-900">
        <span className="font-semibold">Your plan isn&apos;t active yet.</span> New website changes are paused until you
        start your plan.
      </p>
      <Link
        href="/portal/billing"
        className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
      >
        Start my plan
      </Link>
    </div>
  );
}
