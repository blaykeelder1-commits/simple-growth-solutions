"use client";

import { useEffect, useState } from "react";
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
  CreditCard,
  CheckCircle2,
  ExternalLink,
  Shield,
  Zap,
  BarChart3,
  Loader2,
  Sparkles,
  AlertCircle,
} from "lucide-react";

interface Subscription {
  id: string;
  plan: string;
  status: string;
  priceMonthly: number;
  currentPeriodEnd: string | null;
  trialEndDate: string | null;
}

const planInfo: Record<string, { name: string; icon: React.ElementType; color: string }> = {
  // Website tiers
  website_managed: { name: "Managed Website", icon: Zap, color: "from-blue-500 to-indigo-600" },
  website_pro: { name: "Managed Pro", icon: Zap, color: "from-purple-500 to-indigo-600" },
  website_premium: { name: "Managed Premium", icon: Zap, color: "from-amber-500 to-orange-600" },
  // AR
  cashflow_ai: { name: "AR Collection (8%)", icon: BarChart3, color: "from-emerald-500 to-teal-600" },
  ar_proactive: { name: "Proactive AR", icon: BarChart3, color: "from-emerald-500 to-green-600" },
  // GEO
  geo_starter: { name: "GEO Starter", icon: BarChart3, color: "from-violet-500 to-purple-600" },
  geo_pro: { name: "GEO Pro", icon: BarChart3, color: "from-violet-500 to-pink-600" },
  geo_enterprise: { name: "GEO Enterprise", icon: BarChart3, color: "from-violet-500 to-rose-600" },
  // Bundles
  starter_bundle: { name: "Starter Bundle", icon: Sparkles, color: "from-blue-500 to-purple-600" },
  growth_bundle: { name: "Growth Bundle", icon: Sparkles, color: "from-purple-500 to-pink-600" },
  full_suite: { name: "Full Suite", icon: Sparkles, color: "from-amber-500 to-rose-600" },
  enterprise_suite: { name: "Enterprise Suite", icon: Sparkles, color: "from-rose-500 to-red-600" },
  // Legacy (for existing subscriptions)
  website_management: { name: "Website Management", icon: Zap, color: "from-blue-500 to-indigo-600" },
  cybersecurity: { name: "Cybersecurity Shield", icon: Shield, color: "from-emerald-500 to-teal-600" },
  chauffeur: { name: "Business Chauffeur", icon: BarChart3, color: "from-purple-500 to-pink-600" },
};

const statusColors: Record<string, { color: string; bgColor: string; label?: string }> = {
  active: { color: "text-emerald-700", bgColor: "bg-emerald-100 border border-emerald-200" },
  trialing: { color: "text-blue-700", bgColor: "bg-blue-100 border border-blue-200" },
  past_due: { color: "text-red-700", bgColor: "bg-red-100 border border-red-200" },
  canceled: { color: "text-gray-700", bgColor: "bg-gray-100 border border-gray-200" },
  pending: { color: "text-amber-700", bgColor: "bg-amber-100 border border-amber-200" },
  awaiting_payment: { color: "text-amber-700", bgColor: "bg-amber-100 border border-amber-200", label: "Awaiting Payment" },
  expired: { color: "text-red-700", bgColor: "bg-red-100 border border-red-200", label: "Trial Expired" },
};

export default function BillingPage() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [portalMessage, setPortalMessage] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSubscriptions() {
      try {
        const res = await fetch("/api/billing/subscriptions");
        if (!res.ok) throw new Error("Failed to load subscriptions");
        const data = await res.json();
        setSubscriptions(data.subscriptions || []);
      } catch {
        setError("Unable to load your billing information. Please try again.");
      } finally {
        setLoading(false);
      }
    }

    fetchSubscriptions();
  }, []);

  const handleManageBilling = async () => {
    setPortalLoading(true);
    setPortalMessage(null);
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      const data = await res.json();

      if (data.url) {
        window.location.href = data.url;
        return;
      }

      if (data.processor === "square") {
        setPortalMessage(data.message);
      } else if (!data.success) {
        setPortalMessage(data.message || "Unable to open billing portal.");
      }
    } catch {
      setPortalMessage("Something went wrong. Please try again or contact support.");
    } finally {
      setPortalLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <AlertCircle className="h-12 w-12 text-amber-500 mb-4" />
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Something went wrong</h2>
        <p className="text-gray-500 mb-4">{error}</p>
        <Button onClick={() => window.location.reload()}>Try Again</Button>
      </div>
    );
  }

  const activeSubscriptions = subscriptions.filter(
    (s) => s.status === "active" || s.status === "trialing"
  );

  const expiredSubscriptions = subscriptions.filter(
    (s) => s.status === "expired"
  );

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Billing</h1>
          <p className="text-gray-500 mt-1">Manage your subscriptions and payments</p>
        </div>
        {subscriptions.length > 0 && (
          <Button
            onClick={handleManageBilling}
            disabled={portalLoading}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-500/25"
          >
            {portalLoading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <ExternalLink className="h-4 w-4 mr-2" />
            )}
            Manage Billing
          </Button>
        )}
      </div>

      {/* Square portal message */}
      {portalMessage && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
          {portalMessage}
        </div>
      )}

      {/* Expired trial banner */}
      {expiredSubscriptions.length > 0 && activeSubscriptions.length === 0 && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-5">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-amber-900">Your trial has ended</h3>
              <p className="text-sm text-amber-800 mt-1">
                Pick a plan to keep your site live and managed. Your project and data are safe.
              </p>
              <Link href="/pricing">
                <Button size="sm" className="mt-3 bg-amber-600 hover:bg-amber-700 text-white">
                  Choose a Plan
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Active subscriptions */}
      {activeSubscriptions.length > 0 ? (
        <div className="grid gap-5">
          {activeSubscriptions.map((subscription) => {
            const plan = planInfo[subscription.plan] || {
              name: subscription.plan,
              icon: CreditCard,
              color: "from-gray-500 to-gray-600",
            };
            const PlanIcon = plan.icon;
            const status = statusColors[subscription.status] || statusColors.pending;

            return (
              <Card key={subscription.id} variant="professional" hover="lift">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`h-14 w-14 rounded-xl bg-gradient-to-br ${plan.color} flex items-center justify-center shadow-lg`}>
                        <PlanIcon className="h-7 w-7 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{plan.name}</CardTitle>
                        <CardDescription className="text-base">
                          ${(subscription.priceMonthly / 100).toFixed(2)}/month
                        </CardDescription>
                      </div>
                    </div>
                    <Badge className={`${status.bgColor} ${status.color}`}>
                      {status.label || (subscription.status === "trialing"
                        ? "Trial"
                        : subscription.status)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-sm">
                    {subscription.trialEndDate && subscription.status === "trialing" ? (
                      <span className="text-gray-500">
                        Trial ends{" "}
                        {new Date(subscription.trialEndDate).toLocaleDateString()}
                      </span>
                    ) : subscription.currentPeriodEnd ? (
                      <span className="text-gray-500">
                        Next billing date:{" "}
                        {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                      </span>
                    ) : (
                      <span />
                    )}
                    <Button variant="outline" size="sm" onClick={handleManageBilling} className="bg-white/50 hover:bg-white">
                      Manage
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : expiredSubscriptions.length === 0 ? (
        <Card variant="professional">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center mb-5">
              <CreditCard className="h-10 w-10 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No active subscriptions
            </h3>
            <p className="text-gray-500 text-center mb-6 max-w-md">
              Upgrade your services with our premium plans to unlock automation,
              security monitoring, and business insights.
            </p>
            <Link href="/pricing">
              <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-500/25">
                View Plans
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : null}

      {/* Available plans */}
      <Card variant="professional">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-500" />
            <CardTitle className="text-lg">Available Plans</CardTitle>
          </div>
          <CardDescription>
            Enhance your business with our premium services
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-5 md:grid-cols-2">
            {/* Website Management */}
            <div className="p-5 rounded-xl border border-gray-100 bg-white hover:shadow-lg transition-all">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mb-4 shadow-lg shadow-blue-500/25">
                <Zap className="h-6 w-6 text-white" />
              </div>
              <h4 className="font-semibold text-gray-900 mb-1">Website Management</h4>
              <p className="text-2xl font-bold text-gray-900 mb-3">
                $49<span className="text-sm font-normal text-gray-500">/mo</span>
              </p>
              <ul className="space-y-2 text-sm text-gray-600 mb-5">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  Managed hosting
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  Monthly updates
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  Priority support
                </li>
              </ul>
              <Link href="/pricing">
                <Button variant="outline" className="w-full bg-white/50 hover:bg-white">
                  View Plans
                </Button>
              </Link>
            </div>

            {/* Cybersecurity */}
            <div className="p-5 rounded-xl border border-gray-100 bg-white hover:shadow-lg transition-all">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mb-4 shadow-lg shadow-emerald-500/25">
                <Shield className="h-6 w-6 text-white" />
              </div>
              <h4 className="font-semibold text-gray-900 mb-1">Cybersecurity Shield</h4>
              <p className="text-2xl font-bold text-gray-900 mb-3">
                $39<span className="text-sm font-normal text-gray-500">/mo</span>
              </p>
              <ul className="space-y-2 text-sm text-gray-600 mb-5">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  Weekly security scans
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  Vulnerability alerts
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  SSL monitoring
                </li>
              </ul>
              <Link href="/pricing">
                <Button variant="outline" className="w-full bg-white/50 hover:bg-white">
                  View Plans
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
