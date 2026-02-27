"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  Globe,
  Zap,
  TrendingUp,
  Brain,
  ArrowRight,
  Loader2,
  Package,
  Star,
  Sparkles,
} from "lucide-react";
import { Header } from "@/components/landing/Header";
import { Footer } from "@/components/landing/Footer";

// ─── WEBSITE MANAGEMENT PLANS ───────────────────────────────────────────────
const websitePlans = [
  {
    name: "Free Website",
    description: "Professional site built for you at no cost",
    price: "$0",
    period: "",
    icon: Globe,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    features: [
      "Custom-designed website",
      "Mobile responsive",
      "Basic SEO optimization",
      "Contact form integration",
      "Fast loading speeds",
      "Self-managed after launch",
    ],
    cta: "Get Started Free",
    href: "/questionnaire",
    planKey: null,
    popular: false,
  },
  {
    name: "Managed",
    description: "We handle your site so you can focus on business",
    price: "$49",
    period: "/month",
    icon: Globe,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    features: [
      "Managed hosting & SSL",
      "Content edits & updates",
      "Security monitoring",
      "Performance optimization",
      "Analytics dashboard",
      "Email support",
    ],
    cta: "Get Started",
    href: "/portal",
    planKey: "website_managed",
    popular: false,
  },
  {
    name: "Managed Pro",
    description: "AI chatbot and faster turnaround included",
    price: "$79",
    period: "/month",
    icon: Zap,
    color: "text-purple-600",
    bgColor: "bg-purple-50",
    features: [
      "Everything in Managed",
      "AI chatbot integration",
      "24-hour edit turnaround",
      "Lead capture forms",
      "Advanced analytics",
      "Priority support",
    ],
    cta: "Start Pro",
    href: "/portal",
    planKey: "website_pro",
    popular: true,
  },
  {
    name: "Managed Premium",
    description: "Full-service with SEO and industry features",
    price: "$129",
    period: "/month",
    icon: Star,
    color: "text-amber-600",
    bgColor: "bg-amber-50",
    features: [
      "Everything in Managed Pro",
      "Monthly SEO report & optimization",
      "Google Business integration",
      "Industry-specific features",
      "Menu management (restaurants)",
      "Same-day priority support",
    ],
    cta: "Go Premium",
    href: "/portal",
    planKey: "website_premium",
    popular: false,
  },
];

// ─── ACCOUNTS RECEIVABLE & CASH FLOW ────────────────────────────────────────
const arPlans = [
  {
    name: "AR Collection",
    description: "We collect your past-due invoices on contingency",
    price: "8%",
    period: " of recovered",
    icon: TrendingUp,
    color: "text-emerald-600",
    bgColor: "bg-emerald-50",
    features: [
      "Invoice recovery automation",
      "Zero upfront cost — pay only when you collect",
      "Cash flow dashboard & prediction",
      "QuickBooks/Xero sync",
      "AI-powered recovery strategies",
      "Client payment scoring",
      "2-5x cheaper than collection agencies",
    ],
    cta: "Start Recovering",
    href: "/questionnaire",
    planKey: null,
    popular: true,
  },
  {
    name: "Proactive AR",
    description: "Prevent invoices from going past due",
    price: "+$49",
    period: "/month",
    icon: TrendingUp,
    color: "text-emerald-600",
    bgColor: "bg-emerald-50",
    features: [
      "Everything in AR Collection",
      "Automated payment reminders",
      "Aging reports & tracking",
      "Payment tracking before overdue",
      "Custom reminder sequences",
      "Proactive risk alerts",
    ],
    cta: "Add Proactive AR",
    href: "/portal",
    planKey: "ar_proactive",
    popular: false,
  },
];

// ─── GEO (GEOFFREY) — AI BUSINESS MENTOR ────────────────────────────────────
const geoPlans = [
  {
    name: "GEO Starter",
    description: "AI business mentor with basic integrations",
    price: "$79",
    period: "/month",
    icon: Brain,
    color: "text-violet-600",
    bgColor: "bg-violet-50",
    features: [
      "24/7 AI business mentor",
      "Website analytics integration",
      "General business Q&A",
      "Weekly insight reports",
      "Industry benchmarks",
      "Action recommendations",
    ],
    cta: "Meet Geoffrey",
    href: "/portal",
    planKey: "geo_starter",
    popular: false,
  },
  {
    name: "GEO Pro",
    description: "Full data integration with daily insights",
    price: "$149",
    period: "/month",
    icon: Brain,
    color: "text-violet-600",
    bgColor: "bg-violet-50",
    features: [
      "Everything in GEO Starter",
      "AR & cash flow integration",
      "Custom KPI tracking",
      "Daily AI insights",
      "Personalized action plans",
      "Revenue optimization advice",
    ],
    cta: "Get GEO Pro",
    href: "/portal",
    planKey: "geo_pro",
    popular: true,
  },
  {
    name: "GEO Enterprise",
    description: "Automation, multi-location, and team access",
    price: "$249",
    period: "/month",
    icon: Brain,
    color: "text-violet-600",
    bgColor: "bg-violet-50",
    features: [
      "Everything in GEO Pro",
      "NanoClaw automation (coming soon)",
      "Multi-location support",
      "Team member access",
      "Custom integrations",
      "Dedicated account support",
    ],
    cta: "Go Enterprise",
    href: "/portal",
    planKey: "geo_enterprise",
    popular: false,
  },
];

// ─── BUNDLES ────────────────────────────────────────────────────────────────
const bundles = [
  {
    name: "Starter Bundle",
    components: "Managed Website + GEO Starter",
    alaCarte: "$128",
    price: "$99",
    period: "/month",
    savings: "Save 23%",
    icon: Package,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    features: [
      "Managed website ($49 value)",
      "GEO Starter AI mentor ($79 value)",
      "Website analytics in GEO",
      "Weekly insight reports",
    ],
    planKey: "starter_bundle",
    popular: false,
  },
  {
    name: "Growth Bundle",
    components: "Managed Pro + AR (8%) + GEO Pro",
    alaCarte: "$228 + AR",
    price: "$179",
    period: "/month + AR fees",
    savings: "Save 21%",
    icon: Package,
    color: "text-purple-600",
    bgColor: "bg-purple-50",
    borderColor: "border-purple-200",
    features: [
      "Managed Pro website ($79 value)",
      "AR Collection at 8%",
      "GEO Pro AI mentor ($149 value)",
      "Full data integration across all products",
      "AI chatbot + daily insights",
    ],
    planKey: "growth_bundle",
    popular: true,
  },
  {
    name: "Full Suite",
    components: "Managed Premium + AR (8%) + GEO Pro",
    alaCarte: "$278 + AR",
    price: "$229",
    period: "/month + AR fees",
    savings: "Save 18%",
    icon: Package,
    color: "text-amber-600",
    bgColor: "bg-amber-50",
    borderColor: "border-amber-200",
    features: [
      "Managed Premium website ($129 value)",
      "AR Collection at 8%",
      "GEO Pro AI mentor ($149 value)",
      "SEO + Google Business integration",
      "Industry-specific features",
    ],
    planKey: "full_suite",
    popular: false,
  },
  {
    name: "Enterprise Suite",
    components: "Managed Premium + AR + GEO Enterprise",
    alaCarte: "$378 + AR",
    price: "$299",
    period: "/month + AR fees",
    savings: "Save 21%",
    icon: Sparkles,
    color: "text-rose-600",
    bgColor: "bg-rose-50",
    borderColor: "border-rose-200",
    features: [
      "Managed Premium website ($129 value)",
      "AR Collection at 8%",
      "GEO Enterprise AI mentor ($249 value)",
      "NanoClaw automation (coming soon)",
      "Multi-location + team access",
      "Dedicated account support",
    ],
    planKey: "enterprise_suite",
    popular: false,
  },
];

function PlanCard({
  plan,
  onCheckout,
  loadingPlan,
  accentColor = "purple",
}: {
  plan: (typeof websitePlans)[number];
  onCheckout: (planKey: string) => void;
  loadingPlan: string | null;
  accentColor?: string;
}) {
  const colorMap: Record<string, string> = {
    purple: "border-purple-500 bg-purple-500",
    emerald: "border-emerald-500 bg-emerald-500",
    violet: "border-violet-500 bg-violet-500",
  };
  const accent = colorMap[accentColor] || colorMap.purple;
  const [borderClass, bgClass] = accent.split(" ");

  return (
    <Card
      className={`relative flex flex-col ${
        plan.popular ? `${borderClass} border-2 shadow-lg` : ""
      }`}
    >
      {plan.popular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <Badge className={bgClass}>Most Popular</Badge>
        </div>
      )}

      <CardHeader>
        <div
          className={`w-12 h-12 rounded-lg ${plan.bgColor} flex items-center justify-center mb-4`}
        >
          <plan.icon className={`w-6 h-6 ${plan.color}`} />
        </div>
        <CardTitle>{plan.name}</CardTitle>
        <CardDescription>{plan.description}</CardDescription>
      </CardHeader>

      <CardContent className="flex-1">
        <div className="mb-6">
          <span className="text-4xl font-bold">{plan.price}</span>
          <span className="text-gray-500">{plan.period}</span>
        </div>

        <ul className="space-y-3">
          {plan.features.map((feature) => (
            <li key={feature} className="flex items-start gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
              <span className="text-sm text-gray-600">{feature}</span>
            </li>
          ))}
        </ul>
      </CardContent>

      <CardFooter>
        {plan.planKey ? (
          <Button
            className={`w-full ${
              plan.popular
                ? `${bgClass} hover:opacity-90 text-white`
                : ""
            }`}
            variant={plan.popular ? "default" : "outline"}
            onClick={() => onCheckout(plan.planKey!)}
            disabled={loadingPlan === plan.planKey}
          >
            {loadingPlan === plan.planKey ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Loading...
              </>
            ) : (
              <>
                {plan.cta}
                <ArrowRight className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        ) : (
          <Link href={plan.href} className="w-full">
            <Button
              className={`w-full ${
                plan.popular
                  ? `${bgClass} hover:opacity-90 text-white`
                  : ""
              }`}
              variant={plan.popular ? "default" : "outline"}
            >
              {plan.cta}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        )}
      </CardFooter>
    </Card>
  );
}

function PricingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { status } = useSession();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const handleCheckout = useCallback(
    async (planKey: string) => {
      if (status !== "authenticated") {
        router.push(`/login?callbackUrl=/pricing?plan=${planKey}`);
        return;
      }

      setLoadingPlan(planKey);

      try {
        const response = await fetch("/api/billing/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plan: planKey }),
        });

        const data = await response.json();

        if (data.success && data.url) {
          window.location.href = data.url;
        } else {
          alert(data.message || "Failed to start checkout");
          setLoadingPlan(null);
        }
      } catch (error) {
        console.error("Checkout error:", error);
        alert("Failed to start checkout. Please try again.");
        setLoadingPlan(null);
      }
    },
    [status, router]
  );

  useEffect(() => {
    const planFromUrl = searchParams.get("plan");
    if (planFromUrl && status === "authenticated") {
      router.replace("/pricing");
      handleCheckout(planFromUrl);
    }
  }, [status, searchParams, router, handleCheckout]);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1">
        {/* Hero */}
        <section className="py-20 bg-gradient-to-b from-gray-50 to-white">
          <div className="container mx-auto px-4 text-center">
            <Badge className="mb-4">Simple, Transparent Pricing</Badge>
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Everything Your Business Needs to Grow
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Start with a free website. Add AI-powered cash flow recovery and
              business mentoring as you scale. No hidden fees, cancel anytime.
            </p>
          </div>
        </section>

        {/* ── WEBSITE MANAGEMENT ─────────────────────────────────────── */}
        <section className="py-16 -mt-8">
          <div className="container mx-auto px-4">
            <div className="text-center mb-10">
              <Badge variant="outline" className="mb-3 text-blue-700 border-blue-300 bg-blue-50">
                <Globe className="w-3 h-3 mr-1" /> Website Services
              </Badge>
              <h2 className="text-3xl font-bold text-gray-900">
                Free Website + Managed Services
              </h2>
              <p className="text-gray-600 mt-2 max-w-xl mx-auto">
                We build your website for free. Choose a management tier to keep
                it updated, secure, and working for your business.
              </p>
            </div>

            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4 max-w-6xl mx-auto">
              {websitePlans.map((plan) => (
                <PlanCard
                  key={plan.name}
                  plan={plan}
                  onCheckout={handleCheckout}
                  loadingPlan={loadingPlan}
                  accentColor="purple"
                />
              ))}
            </div>
          </div>
        </section>

        {/* ── ACCOUNTS RECEIVABLE & CASH FLOW ────────────────────────── */}
        <section className="py-16 bg-gradient-to-b from-emerald-50/50 to-white">
          <div className="container mx-auto px-4">
            <div className="text-center mb-10">
              <Badge variant="outline" className="mb-3 text-emerald-700 border-emerald-300 bg-emerald-50">
                <TrendingUp className="w-3 h-3 mr-1" /> Cash Flow
              </Badge>
              <h2 className="text-3xl font-bold text-gray-900">
                Accounts Receivable & Cash Flow
              </h2>
              <p className="text-gray-600 mt-2 max-w-xl mx-auto">
                Collect past-due invoices at 8% — 2-5x cheaper than any
                collection agency. You only pay when you get paid.
              </p>
            </div>

            <div className="grid gap-8 md:grid-cols-2 max-w-3xl mx-auto">
              {arPlans.map((plan) => (
                <PlanCard
                  key={plan.name}
                  plan={plan}
                  onCheckout={handleCheckout}
                  loadingPlan={loadingPlan}
                  accentColor="emerald"
                />
              ))}
            </div>
          </div>
        </section>

        {/* ── GEO (GEOFFREY) — AI BUSINESS MENTOR ────────────────────── */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="text-center mb-10">
              <Badge variant="outline" className="mb-3 text-violet-700 border-violet-300 bg-violet-50">
                <Brain className="w-3 h-3 mr-1" /> AI Mentor
              </Badge>
              <h2 className="text-3xl font-bold text-gray-900">
                GEO (Geoffrey) — AI Business Mentor
              </h2>
              <p className="text-gray-600 mt-2 max-w-xl mx-auto">
                24/7 AI advisor integrated into your actual business data.
                Website analytics, cash flow, and operations — all in one
                mentor. 90% cheaper than a human business coach.
              </p>
            </div>

            <div className="grid gap-8 md:grid-cols-3 max-w-5xl mx-auto">
              {geoPlans.map((plan) => (
                <PlanCard
                  key={plan.name}
                  plan={plan}
                  onCheckout={handleCheckout}
                  loadingPlan={loadingPlan}
                  accentColor="violet"
                />
              ))}
            </div>
          </div>
        </section>

        {/* ── BUNDLES ────────────────────────────────────────────────── */}
        <section className="py-16 bg-gradient-to-b from-gray-50 to-white">
          <div className="container mx-auto px-4">
            <div className="text-center mb-10">
              <Badge variant="outline" className="mb-3 text-rose-700 border-rose-300 bg-rose-50">
                <Package className="w-3 h-3 mr-1" /> Bundles
              </Badge>
              <h2 className="text-3xl font-bold text-gray-900">
                Save More with Bundles
              </h2>
              <p className="text-gray-600 mt-2 max-w-xl mx-auto">
                The real power is integration. When GEO sees your website data
                and cash flow together, it makes smarter recommendations for
                your business.
              </p>
            </div>

            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4 max-w-6xl mx-auto">
              {bundles.map((bundle) => (
                <Card
                  key={bundle.name}
                  className={`relative flex flex-col ${
                    bundle.popular
                      ? "border-purple-500 border-2 shadow-lg"
                      : ""
                  }`}
                >
                  {bundle.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge className="bg-purple-500">Best Value</Badge>
                    </div>
                  )}

                  <CardHeader>
                    <div
                      className={`w-12 h-12 rounded-lg ${bundle.bgColor} flex items-center justify-center mb-4`}
                    >
                      <bundle.icon className={`w-6 h-6 ${bundle.color}`} />
                    </div>
                    <CardTitle className="text-lg">{bundle.name}</CardTitle>
                    <CardDescription className="text-xs">
                      {bundle.components}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="flex-1">
                    <div className="mb-2">
                      <span className="text-4xl font-bold">{bundle.price}</span>
                      <span className="text-gray-500 text-sm">
                        {bundle.period}
                      </span>
                    </div>
                    <div className="mb-4">
                      <span className="text-sm text-gray-400 line-through">
                        {bundle.alaCarte}/mo
                      </span>
                      <Badge
                        variant="secondary"
                        className="ml-2 text-green-700 bg-green-100"
                      >
                        {bundle.savings}
                      </Badge>
                    </div>

                    <ul className="space-y-3">
                      {bundle.features.map((feature) => (
                        <li key={feature} className="flex items-start gap-2">
                          <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                          <span className="text-sm text-gray-600">
                            {feature}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>

                  <CardFooter>
                    <Button
                      className={`w-full ${
                        bundle.popular
                          ? "bg-purple-500 hover:bg-purple-600 text-white"
                          : ""
                      }`}
                      variant={bundle.popular ? "default" : "outline"}
                      onClick={() => handleCheckout(bundle.planKey)}
                      disabled={loadingPlan === bundle.planKey}
                    >
                      {loadingPlan === bundle.planKey ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Loading...
                        </>
                      ) : (
                        <>
                          Get {bundle.name}
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </>
                      )}
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-16 bg-gray-50">
          <div className="container mx-auto px-4 max-w-3xl">
            <h2 className="text-3xl font-bold text-center mb-12">
              Frequently Asked Questions
            </h2>

            <div className="space-y-6">
              <div className="bg-white rounded-lg p-6 shadow-sm">
                <h3 className="font-semibold mb-2">
                  Is the website really free?
                </h3>
                <p className="text-gray-600">
                  Yes! We design and build your website at absolutely no cost.
                  You can self-manage it for free or add a management plan
                  starting at $49/mo for ongoing edits, hosting, and support.
                </p>
              </div>

              <div className="bg-white rounded-lg p-6 shadow-sm">
                <h3 className="font-semibold mb-2">
                  How does the 8% AR collection fee work?
                </h3>
                <p className="text-gray-600">
                  You only pay 8% of the money we actually recover from your
                  past-due invoices. If we don&apos;t collect anything, you
                  don&apos;t pay anything. Collection agencies typically charge
                  25-40% — we&apos;re 2-5x cheaper.
                </p>
              </div>

              <div className="bg-white rounded-lg p-6 shadow-sm">
                <h3 className="font-semibold mb-2">
                  What is GEO (Geoffrey)?
                </h3>
                <p className="text-gray-600">
                  GEO is your 24/7 AI business mentor. Unlike generic AI tools,
                  GEO integrates directly with your website analytics, cash flow
                  data, and business operations to give personalized, actionable
                  advice — for the price of 30 minutes with a human coach.
                </p>
              </div>

              <div className="bg-white rounded-lg p-6 shadow-sm">
                <h3 className="font-semibold mb-2">Can I cancel anytime?</h3>
                <p className="text-gray-600">
                  Absolutely. All subscription plans are month-to-month with no
                  long-term contracts. Cancel anytime from your billing
                  dashboard.
                </p>
              </div>

              <div className="bg-white rounded-lg p-6 shadow-sm">
                <h3 className="font-semibold mb-2">
                  Why should I get a bundle instead of individual products?
                </h3>
                <p className="text-gray-600">
                  Bundles save you 18-23%, but the real value is integration.
                  When GEO can see your website traffic AND your cash flow data
                  together, its recommendations are dramatically better. It can
                  spot trends and opportunities that no single tool can see
                  alone.
                </p>
              </div>

              <div className="bg-white rounded-lg p-6 shadow-sm">
                <h3 className="font-semibold mb-2">
                  What integrations do you support?
                </h3>
                <p className="text-gray-600">
                  We integrate with QuickBooks, Xero, Square, Google Business
                  Profile, and more. GEO Pro and Enterprise tiers include
                  advanced integrations and custom connections.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 bg-gradient-to-r from-blue-600 via-purple-600 to-violet-600 text-white">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              Ready to Grow Your Business?
            </h2>
            <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
              Start with a free website. Add AI-powered tools as you grow. Join
              businesses that are collecting more, spending less, and making
              smarter decisions.
            </p>
            <Link href="/questionnaire">
              <Button size="lg" variant="secondary" className="text-lg px-8">
                Get Your Free Website
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

function PricingLoadingSkeleton() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <section className="py-20 bg-gradient-to-b from-gray-50 to-white">
          <div className="container mx-auto px-4 text-center">
            <div className="h-6 w-48 bg-gray-200 rounded mx-auto mb-4 animate-pulse" />
            <div className="h-12 w-96 bg-gray-200 rounded mx-auto mb-6 animate-pulse" />
            <div className="h-6 w-80 bg-gray-200 rounded mx-auto animate-pulse" />
          </div>
        </section>
        <section className="py-16 -mt-8">
          <div className="container mx-auto px-4">
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-96 bg-gray-100 rounded-lg animate-pulse"
                />
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

export default function PricingPage() {
  return (
    <Suspense fallback={<PricingLoadingSkeleton />}>
      <PricingContent />
    </Suspense>
  );
}
