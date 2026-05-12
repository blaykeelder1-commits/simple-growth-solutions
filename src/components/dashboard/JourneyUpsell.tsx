"use client";

import { useEffect, useState } from "react";
import { ArrowRight, X, Shield, BarChart3, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface UpsellData {
  shouldPrompt: boolean;
  nextStage?: string;
  nextStageLabel?: string;
  reason?: string;
}

const STAGE_CONFIG: Record<string, { icon: React.ReactNode; href: string; color: string }> = {
  cybersecurity: {
    icon: <Shield className="h-6 w-6 text-red-500" />,
    href: "/dashboard/security",
    color: "from-red-50 to-orange-50 border-red-200",
  },
  cashflow: {
    icon: <BarChart3 className="h-6 w-6 text-emerald-500" />,
    href: "/dashboard/cashflow",
    color: "from-emerald-50 to-green-50 border-emerald-200",
  },
  chauffeur: {
    icon: <TrendingUp className="h-6 w-6 text-purple-500" />,
    href: "/dashboard/chauffeur",
    color: "from-purple-50 to-indigo-50 border-purple-200",
  },
};

export function JourneyUpsell() {
  const [data, setData] = useState<UpsellData | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    fetch("/api/journey/upsell")
      .then((res) => res.json())
      .then(setData)
      .catch(() => {});
  }, []);

  if (!data?.shouldPrompt || dismissed || !data.nextStage) return null;

  const config = STAGE_CONFIG[data.nextStage] || STAGE_CONFIG.cashflow;

  const handleDismiss = () => {
    setDismissed(true);
    fetch("/api/journey/upsell", { method: "POST" }).catch(() => {});
  };

  return (
    <div className={`relative rounded-xl border bg-gradient-to-r ${config.color} p-4 mb-6`}>
      <button
        onClick={handleDismiss}
        className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
      >
        <X className="h-4 w-4" />
      </button>
      <div className="flex items-start gap-4">
        <div className="p-2 rounded-lg bg-white shadow-sm">{config.icon}</div>
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900">
            Unlock {data.nextStageLabel}
          </h3>
          <p className="text-sm text-gray-600 mt-1">{data.reason}</p>
          <Link href={config.href}>
            <Button size="sm" className="mt-3 group">
              Get Started
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
