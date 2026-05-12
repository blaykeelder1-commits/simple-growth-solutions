"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, ArrowRight } from "lucide-react";

interface SubRow {
  plan: string;
  status: string;
  createdAt?: string;
}

const MANAGED_PLANS = new Set([
  "website_managed",
  "website_pro",
  "website_premium",
  "starter_bundle",
  "growth_bundle",
  "full_suite",
  "enterprise_suite",
]);

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Renders an "Available add-ons" banner once the org has been on a managed
 * subscription for at least 30 days. Hidden otherwise — we earn the upsell
 * before showing it.
 */
export function UpgradesBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/billing/subscriptions");
        if (!res.ok) return;
        const data = await res.json();
        const subs: SubRow[] = data.subscriptions || [];
        const managed = subs.find(
          (s) =>
            MANAGED_PLANS.has(s.plan) &&
            (s.status === "active" || s.status === "trialing")
        );
        if (!managed?.createdAt) return;
        const ageMs = Date.now() - new Date(managed.createdAt).getTime();
        if (ageMs >= THIRTY_DAYS_MS) {
          setShow(true);
        }
      } catch {
        // silent
      }
    })();
  }, []);

  if (!show) return null;

  return (
    <Card className="border-purple-200 bg-gradient-to-r from-purple-50 via-pink-50 to-blue-50">
      <CardContent className="py-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-xl bg-purple-100 flex items-center justify-center shrink-0">
            <Sparkles className="h-5 w-5 text-purple-600" />
          </div>
          <div>
            <p className="font-semibold text-gray-900">Ready to grow further?</p>
            <p className="text-sm text-gray-600 mt-0.5">
              SEO, marketing, business intelligence, and more — see what you can
              add to your plan.
            </p>
          </div>
        </div>
        <Link href="/portal/upgrades">
          <Button className="bg-purple-600 hover:bg-purple-700 text-white shrink-0">
            View Add-Ons
            <ArrowRight className="h-4 w-4 ml-1.5" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
