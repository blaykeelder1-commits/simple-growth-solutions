"use client";

import { useEffect, useState } from "react";
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
  website_management: { name: "Website Management + Automation", icon: Zap, color: "from-blue-500 to-indigo-600" },
  cybersecurity: { name: "Cybersecurity Shield", icon: Shield, color: "from-emerald-500 to-teal-600" },
  chauffeur: { name: "Business Chauffeur", icon: BarChart3, color: "from-purple-500 to-pink-600" },
  cashflow_ai: { name: "Cash Flow AI", icon: BarChart3, color: "from-orange-500 to-red-500" },
};

const statusColors: Record<string, { color: string; bgColor: string }> = {
  active: { color: "text-emerald-700", bgColor: "bg-emerald-100 border border-emerald-200" },
  trialing: { color: "text-blue-700", bgColor: "bg-blue-100 border border-blue-200" },
  past_due: { color: "text-red-700", bgColor: "bg-red-100 border border-red-200" },
  canceled: { color: "text-gray-700", bgColor: "bg-gray-100 border border-gray-200" },
  pending: { color: "text-amber-700", bgColor: "bg-amber-100 border border-amber-200" },
};

export default function BillingPage() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);

  useEffect(() => {
    async function fetchSubscriptions() {
      try {
        const res = await fetch("/api/billing/subscriptions");
        if (res.ok) {
          const data = await res.json();
          setSubscriptions(data.subscriptions || []);
        }
      } catch {
        // Error handled silently - UI shows empty state
      } finally {
        setLoading(false);
      }
    }

    fetchSubscriptions();
  }, []);

  const handleManageBilling = async () => {
    setPortalLoading(true);
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        window.location.href = data.url;
      }
    } catch {
      // Error handled silently - no redirect occurs
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

  const activeSubscriptions = subscriptions.filter(
    (s) => s.status === "active" || s.status === "trialing"
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
                      {subscription.status === "trialing"
                        ? "Trial"
                        : subscription.status}
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
      ) : (
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
            <a href="/pricing">
              <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-500/25">
                View Plans
              </Button>
            </a>
          </CardContent>
        </Card>
      )}

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
          <div className="grid gap-5 md:grid-cols-3">
            {/* Website Management */}
            <div className="p-5 rounded-xl border border-gray-100 bg-white hover:shadow-lg transition-all">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mb-4 shadow-lg shadow-blue-500/25">
                <Zap className="h-6 w-6 text-white" />
              </div>
              <h4 className="font-semibold text-gray-900 mb-1">Website Management</h4>
              <p className="text-2xl font-bold text-gray-900 mb-3">
                $79<span className="text-sm font-normal text-gray-500">/mo</span>
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
              <Button variant="outline" className="w-full bg-white/50 hover:bg-white">
                Subscribe
              </Button>
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
              <Button variant="outline" className="w-full bg-white/50 hover:bg-white">
                Subscribe
              </Button>
            </div>

            {/* Cash Flow AI */}
            <div className="p-5 rounded-xl border-2 border-blue-500 bg-gradient-to-br from-blue-50 to-indigo-50 relative hover:shadow-lg transition-all">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white text-xs font-semibold px-3 py-1 rounded-full shadow-lg">
                Popular
              </div>
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center mb-4 shadow-lg shadow-purple-500/25">
                <BarChart3 className="h-6 w-6 text-white" />
              </div>
              <h4 className="font-semibold text-gray-900 mb-1">Cash Flow AI</h4>
              <p className="text-2xl font-bold text-gray-900 mb-3">
                8%<span className="text-sm font-normal text-gray-500"> of recovered</span>
              </p>
              <ul className="space-y-2 text-sm text-gray-600 mb-5">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  Invoice recovery
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  Cash flow forecasting
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  QuickBooks/Xero sync
                </li>
              </ul>
              <Button className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-500/25">
                Get Started
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
