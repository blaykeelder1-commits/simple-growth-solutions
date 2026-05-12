"use client";

import { useState } from "react";
import { Shield, X, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface UpsellBannerProps {
  title: string;
  description: string;
  ctaText: string;
  ctaHref: string;
  icon?: React.ReactNode;
  dismissKey: string;
}

export function UpsellBanner({
  title,
  description,
  ctaText,
  ctaHref,
  icon,
  dismissKey,
}: UpsellBannerProps) {
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(`upsell-dismissed-${dismissKey}`) === "true";
  });

  if (dismissed) return null;

  const handleDismiss = () => {
    localStorage.setItem(`upsell-dismissed-${dismissKey}`, "true");
    setDismissed(true);
  };

  return (
    <div className="relative rounded-xl border border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-4 mb-6">
      <button
        onClick={handleDismiss}
        className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
      >
        <X className="h-4 w-4" />
      </button>
      <div className="flex items-start gap-4">
        <div className="p-2 rounded-lg bg-white shadow-sm">
          {icon || <Shield className="h-6 w-6 text-blue-600" />}
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900">{title}</h3>
          <p className="text-sm text-gray-600 mt-1">{description}</p>
          <Link href={ctaHref}>
            <Button size="sm" className="mt-3 group">
              {ctaText}
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

export function CybersecurityUpsell() {
  return (
    <UpsellBanner
      title="Protect Your Website with Security Monitoring"
      description="We built your website — now let us keep it secure. Get SSL monitoring, vulnerability scanning, and real-time security alerts."
      ctaText="Add Cybersecurity"
      ctaHref="/portal/billing?plan=cybersecurity"
      icon={<Shield className="h-6 w-6 text-blue-600" />}
      dismissKey="cybersecurity"
    />
  );
}
