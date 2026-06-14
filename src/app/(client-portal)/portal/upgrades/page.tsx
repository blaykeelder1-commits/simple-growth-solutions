"use client";

import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Search,
  Megaphone,
  Shield,
  Sparkles,
  Lock,
} from "lucide-react";

// In-portal upsells. These are the "back-half" services that aren't shown on
// the public marketing site. We surface them here once a customer is paying
// for management — earned upsell.

interface UpgradeCard {
  id: string;
  name: string;
  pitch: string;
  pricing: string;
  bullets: string[];
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  status: "available" | "coming_soon";
  // null = no checkout yet (interest only); else a plan key for /api/billing/checkout
  planKey: string | null;
}

const upgrades: UpgradeCard[] = [
  {
    id: "seo",
    name: "Monthly SEO",
    pitch: "Get found by people searching for what you do.",
    pricing: "From $79/mo",
    bullets: [
      "Monthly keyword rank report",
      "Google Business Profile monitoring",
      "On-page SEO recommendations",
      "Content + backlink suggestions",
    ],
    icon: Search,
    iconBg: "bg-blue-50",
    iconColor: "text-blue-600",
    status: "coming_soon",
    planKey: null,
  },
  {
    id: "marketing",
    name: "Marketing Engine",
    pitch: "Email campaigns, social posts, and review-gen done for you.",
    pricing: "From $149/mo",
    bullets: [
      "Monthly email campaigns",
      "Social media scheduling",
      "Review request automation",
      "Lead-magnet landing pages",
    ],
    icon: Megaphone,
    iconBg: "bg-pink-50",
    iconColor: "text-pink-600",
    status: "coming_soon",
    planKey: null,
  },
  {
    id: "cybersecurity",
    name: "Security Shield",
    pitch: "Continuous SSL, header, and email security monitoring.",
    pricing: "$39/mo",
    bullets: [
      "Weekly security scans",
      "SSL + header monitoring",
      "Vulnerability alerts",
      "Remediation guidance",
    ],
    icon: Shield,
    iconBg: "bg-emerald-50",
    iconColor: "text-emerald-600",
    status: "available",
    planKey: null, // Stripe-side; checkout API still works
  },
];

export default function UpgradesPage() {
  return (
    <div className="space-y-8 max-w-5xl">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Available Add-Ons</h1>
        <p className="text-gray-500 mt-1">
          Layer on more value once your site is up and running. Cancel any add-on
          anytime from billing.
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        {upgrades.map((upgrade) => {
          const Icon = upgrade.icon;
          return (
            <Card key={upgrade.id} variant="professional" hover="lift" className="flex flex-col">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className={`h-12 w-12 rounded-xl ${upgrade.iconBg} flex items-center justify-center`}>
                    <Icon className={`h-6 w-6 ${upgrade.iconColor}`} />
                  </div>
                  {upgrade.status === "coming_soon" && (
                    <Badge className="bg-gray-100 text-gray-600 border-gray-200">
                      Coming Soon
                    </Badge>
                  )}
                </div>
                <CardTitle className="mt-4 text-xl">{upgrade.name}</CardTitle>
                <CardDescription>{upgrade.pitch}</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col">
                <p className="text-sm font-semibold text-gray-700 mb-3">{upgrade.pricing}</p>
                <ul className="space-y-2 mb-6 flex-1">
                  {upgrade.bullets.map((b) => (
                    <li key={b} className="flex items-start gap-2 text-sm text-gray-600">
                      <Sparkles className="h-3.5 w-3.5 text-purple-500 shrink-0 mt-0.5" />
                      {b}
                    </li>
                  ))}
                </ul>
                {upgrade.status === "coming_soon" ? (
                  <Button variant="outline" className="w-full" disabled>
                    <Lock className="h-3.5 w-3.5 mr-1.5" />
                    Notify Me When Live
                  </Button>
                ) : (
                  <Link href="/portal/billing">
                    <Button variant="outline" className="w-full">
                      Contact Us
                    </Button>
                  </Link>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
