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
  Zap,
  ArrowRight,
  Loader2,
  Headset,
  Sparkles,
} from "lucide-react";
import { Header } from "@/components/landing/Header";
import { Footer } from "@/components/landing/Footer";

// Three managed tiers. The "free build" is real — we design and ship the
// first version at no cost. After the 14-day trial the customer either picks
// a managed tier (so we keep running the site) or the live URL is paused.
// We host on our infrastructure either way; nothing about that changes.
const websitePlans = [
  {
    name: "Managed",
    description: "We host, secure, and ship 2 edits a month. The simple plan for most small businesses.",
    price: "$49",
    period: "/month",
    icon: Headset,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    features: [
      "Free custom website build (14-day trial included)",
      "Managed hosting, SSL, and security monitoring",
      "2 change requests per month included",
      "5-business-day turnaround",
      "$25 per extra change request, $49 same-day rush",
      "Email support",
    ],
    cta: "Start Free Build",
    href: "/questionnaire?plan=website_managed",
    planKey: "website_managed",
    popular: false,
  },
  {
    name: "Managed Pro",
    description: "24-hour turnaround on every ticket plus AI-powered features. The plan if you update often.",
    price: "$79",
    period: "/month",
    icon: Zap,
    color: "text-purple-600",
    bgColor: "bg-purple-50",
    features: [
      "Everything in Managed",
      "24-hour turnaround on every change request",
      "4 change requests per month included",
      "AI chatbot integration",
      "Lead capture forms",
      "Advanced analytics",
      "Priority support",
    ],
    cta: "Start with Pro",
    href: "/questionnaire?plan=website_pro",
    planKey: "website_pro",
    popular: true,
  },
  {
    name: "Managed Premium",
    description: "Same-day edits, dedicated account manager, and quarterly custom features. For high-touch businesses.",
    price: "$129",
    period: "/month",
    icon: Sparkles,
    color: "text-amber-600",
    bgColor: "bg-amber-50",
    features: [
      "Everything in Managed Pro",
      "Same-day turnaround on every ticket",
      "10 change requests per month included",
      "Dedicated account manager",
      "Quarterly custom feature credit",
      "Priority phone + Slack support",
      "Industry-specific features (menu mgmt, booking, etc.)",
    ],
    cta: "Start with Premium",
    href: "/questionnaire?plan=website_premium",
    planKey: "website_premium",
    popular: false,
  },
];

function PlanCard({
  plan,
  onCheckout,
  loadingPlan,
}: {
  plan: (typeof websitePlans)[number];
  onCheckout: (planKey: string) => void;
  loadingPlan: string | null;
}) {
  return (
    <Card
      className={`relative flex flex-col ${
        plan.popular ? "border-purple-500 border-2 shadow-lg" : ""
      }`}
    >
      {plan.popular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <Badge className="bg-purple-500">Most Popular</Badge>
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
                ? "bg-purple-500 hover:bg-purple-600 text-white"
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
                  ? "bg-purple-500 hover:bg-purple-600 text-white"
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
              Free Website. Simple Monthly Fee.
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              We build your site for free, then run it for you. Cancel anytime.
            </p>
          </div>
        </section>

        {/* Plans */}
        <section className="py-16 -mt-8">
          <div className="container mx-auto px-4">
            <div className="grid gap-8 md:grid-cols-3 max-w-5xl mx-auto">
              {websitePlans.map((plan) => (
                <PlanCard
                  key={plan.name}
                  plan={plan}
                  onCheckout={handleCheckout}
                  loadingPlan={loadingPlan}
                />
              ))}
            </div>

            <p className="text-center text-sm text-gray-500 mt-10 max-w-xl mx-auto">
              Need a custom funnel, online ordering, or payment processing on your site?
              We offer those as one-time add-ons. Get started with a free build and we&apos;ll
              quote any custom work directly in your customer portal.
            </p>
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
                <h3 className="font-semibold mb-2">Is the website really free?</h3>
                <p className="text-gray-600">
                  Yes — we design and build your first version at no cost during
                  a 14-day trial of the Managed plan. After the trial, you pick
                  the plan that fits and we keep running the site. Cancel during
                  the trial and you&apos;re not charged.
                </p>
              </div>

              <div className="bg-white rounded-lg p-6 shadow-sm">
                <h3 className="font-semibold mb-2">What&apos;s a change request?</h3>
                <p className="text-gray-600">
                  Anything you need updated on your site &mdash; new copy, new images,
                  a new page, a fix. Submit it through your portal, and we handle it.
                  Each plan includes a monthly cap so the system stays sustainable;
                  extra requests are $25 each, and same-day rush is $49 (free on Pro and Premium).
                </p>
              </div>

              <div className="bg-white rounded-lg p-6 shadow-sm">
                <h3 className="font-semibold mb-2">
                  Where does my site live?
                </h3>
                <p className="text-gray-600">
                  We host it on our managed infrastructure (Cloudflare). You get a
                  custom domain or our subdomain, fully secured with SSL. Because we
                  run the hosting, your site stays fast and online whether you
                  submit one edit a month or twenty &mdash; we handle the operations.
                </p>
              </div>

              <div className="bg-white rounded-lg p-6 shadow-sm">
                <h3 className="font-semibold mb-2">
                  Can I add custom features later?
                </h3>
                <p className="text-gray-600">
                  Yes. Online ordering, custom payment funnels, CRM integrations,
                  and bespoke features are quoted per project as one-time add-ons
                  on top of your monthly plan. Premium customers get a quarterly
                  custom-feature credit included.
                </p>
              </div>

              <div className="bg-white rounded-lg p-6 shadow-sm">
                <h3 className="font-semibold mb-2">Can I cancel anytime?</h3>
                <p className="text-gray-600">
                  Absolutely. All plans are month-to-month, no long-term contracts.
                  Cancel from your billing dashboard. If you cancel, your live site
                  is paused at the end of your billing period &mdash; we stop hosting
                  and managing it. If you ever want to take the source code and
                  assets off our infrastructure to self-host, that&apos;s a one-time
                  $499 transfer service that includes a 30-day handoff.
                </p>
              </div>

              <div className="bg-white rounded-lg p-6 shadow-sm">
                <h3 className="font-semibold mb-2">How do I pay?</h3>
                <p className="text-gray-600">
                  All billing &mdash; monthly subscriptions and one-time add-ons &mdash;
                  is handled securely through Square. You&apos;ll get a checkout
                  link by email and from your portal.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 bg-gradient-to-r from-blue-600 via-purple-600 to-violet-600 text-white">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              Ready for a website that just works?
            </h2>
            <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
              Start with a free build today. Add a Managed plan when you&apos;re
              ready to hand off the upkeep.
            </p>
            <Link href="/questionnaire">
              <Button size="lg" variant="secondary" className="text-lg px-8">
                Get My Free Website
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
            <div className="grid gap-8 md:grid-cols-3 max-w-5xl mx-auto">
              {[1, 2, 3].map((i) => (
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
