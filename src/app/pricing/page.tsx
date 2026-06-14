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
    priceCents: 4900,
    period: "/month",
    icon: Headset,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    features: [
      "Free custom website build — no card to start",
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
    priceCents: 7900,
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
    priceCents: 12900,
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

// $1 end-to-end Square test card. Only shown on /pricing?test=1 so real
// customers never see it. Routes through the exact same Square checkout path.
const testPlan: (typeof websitePlans)[number] = {
  name: "Square Test ($1)",
  description: "Internal end-to-end Square checkout test. Charges $1 to verify payments are firing.",
  price: "$1",
  priceCents: 100,
  period: " one-time test",
  icon: Zap,
  color: "text-emerald-600",
  bgColor: "bg-emerald-50",
  features: [
    "Real Square payment link",
    "Verifies checkout → webhook → subscription → emails",
    "Internal testing only — not a customer plan",
  ],
  cta: "Run $1 Test",
  href: "#",
  planKey: "website_test",
  popular: false,
};

function PlanCard({
  plan,
  onCheckout,
  loadingPlan,
  foundingCents,
  introMonths,
}: {
  plan: (typeof websitePlans)[number];
  onCheckout: (planKey: string) => void;
  loadingPlan: string | null;
  foundingCents?: number;
  introMonths?: number;
}) {
  const hasFounding =
    typeof foundingCents === "number" && foundingCents < plan.priceCents;
  const foundingPrice = hasFounding
    ? `$${(foundingCents! / 100).toFixed(foundingCents! % 100 === 0 ? 0 : 2)}`
    : null;
  const months = introMonths ?? 3;
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
          {hasFounding ? (
            <>
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="text-4xl font-bold text-purple-600">{foundingPrice}</span>
                <span className="text-gray-500">{plan.period}</span>
                <span className="text-lg text-gray-400 line-through">{plan.price}</span>
                <Badge className="bg-purple-100 text-purple-700 border-purple-200">
                  Founding rate
                </Badge>
              </div>
              <p className="mt-2 text-sm text-purple-700">
                {foundingPrice}/mo for your first {months} month{months === 1 ? "" : "s"}, then{" "}
                {plan.price}/mo. Lock it in before founding spots close.
              </p>
            </>
          ) : (
            <>
              <span className="text-4xl font-bold">{plan.price}</span>
              <span className="text-gray-500">{plan.period}</span>
            </>
          )}
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
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  // Founding-rate promo code.
  const [promoInput, setPromoInput] = useState("");
  const [appliedCode, setAppliedCode] = useState<string | null>(null);
  const [foundingByPlan, setFoundingByPlan] = useState<Record<string, number>>({});
  const [introMonths, setIntroMonths] = useState<number>(3);
  const [promoStatus, setPromoStatus] = useState<
    { ok: boolean; message: string } | null
  >(null);
  const [applyingPromo, setApplyingPromo] = useState(false);

  // Validate a code against every website plan and capture the founding price
  // for each plan it applies to. Returns the normalized code if at least one
  // plan accepted it, else null.
  const applyPromo = useCallback(async (rawCode: string): Promise<string | null> => {
    const code = rawCode.trim();
    if (!code) return null;
    setApplyingPromo(true);
    try {
      const results = await Promise.all(
        websitePlans.map(async (p) => {
          try {
            const res = await fetch("/api/billing/promo/validate", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ code, plan: p.planKey }),
            });
            const data = await res.json();
            return { planKey: p.planKey, data };
          } catch {
            return { planKey: p.planKey, data: { valid: false } };
          }
        })
      );
      const map: Record<string, number> = {};
      let months = 3;
      let lastMessage = "That code isn't valid.";
      for (const r of results) {
        if (r.data?.valid && typeof r.data.foundingCents === "number") {
          map[r.planKey] = r.data.foundingCents;
          if (typeof r.data.introMonths === "number") months = r.data.introMonths;
        } else if (r.data?.message) {
          lastMessage = r.data.message;
        }
      }
      setIntroMonths(months);
      if (Object.keys(map).length > 0) {
        setFoundingByPlan(map);
        setAppliedCode(code.toUpperCase());
        setPromoStatus({ ok: true, message: "Founding rate applied." });
        return code.toUpperCase();
      }
      setFoundingByPlan({});
      setAppliedCode(null);
      setPromoStatus({ ok: false, message: lastMessage });
      return null;
    } finally {
      setApplyingPromo(false);
    }
  }, []);

  const handleCheckout = useCallback(
    async (planKey: string, code?: string | null) => {
      const promo = code ?? appliedCode;
      if (status !== "authenticated") {
        const cb = `/pricing?plan=${planKey}${promo ? `&promo=${encodeURIComponent(promo)}` : ""}`;
        router.push(`/login?callbackUrl=${encodeURIComponent(cb)}`);
        return;
      }

      setLoadingPlan(planKey);
      setCheckoutError(null);

      try {
        const response = await fetch("/api/billing/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(promo ? { plan: planKey, promoCode: promo } : { plan: planKey }),
        });

        const data = await response.json();

        if (data.success && data.url) {
          window.location.href = data.url;
        } else {
          setCheckoutError(data.message || "We couldn't start checkout. Please try again.");
          setLoadingPlan(null);
        }
      } catch (error) {
        console.error("Checkout error:", error);
        setCheckoutError("We couldn't start checkout. Please check your connection and try again.");
        setLoadingPlan(null);
      }
    },
    [status, router, appliedCode]
  );

  useEffect(() => {
    const planFromUrl = searchParams.get("plan");
    const promoFromUrl = searchParams.get("promo");
    if (promoFromUrl && !appliedCode) {
      setPromoInput(promoFromUrl);
      void applyPromo(promoFromUrl);
    }
    if (planFromUrl && status === "authenticated") {
      router.replace("/pricing");
      handleCheckout(planFromUrl, promoFromUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
            {/* Founding-rate promo code */}
            <div className="max-w-md mx-auto mb-10">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void applyPromo(promoInput);
                }}
                className="flex gap-2"
              >
                <input
                  type="text"
                  value={promoInput}
                  onChange={(e) => setPromoInput(e.target.value)}
                  placeholder="Founding / promo code"
                  className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm uppercase placeholder:normal-case focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                  aria-label="Promo code"
                />
                <Button type="submit" variant="outline" disabled={applyingPromo || !promoInput.trim()}>
                  {applyingPromo ? <Loader2 className="w-4 h-4 animate-spin" /> : "Apply"}
                </Button>
              </form>
              {promoStatus && (
                <p
                  className={`mt-2 text-sm ${
                    promoStatus.ok ? "text-purple-600" : "text-red-600"
                  }`}
                >
                  {promoStatus.ok && appliedCode
                    ? `Founding rate “${appliedCode}” applied — discounted pricing shown below.`
                    : promoStatus.message}
                </p>
              )}
            </div>

            {checkoutError && (
              <div className="max-w-md mx-auto mb-8 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700 text-center">
                {checkoutError}
              </div>
            )}

            <div className="grid gap-8 md:grid-cols-3 max-w-5xl mx-auto">
              {(searchParams.get("test") === "1"
                ? [...websitePlans, testPlan]
                : websitePlans
              ).map((plan) => (
                <PlanCard
                  key={plan.name}
                  plan={plan}
                  onCheckout={handleCheckout}
                  loadingPlan={loadingPlan}
                  foundingCents={foundingByPlan[plan.planKey]}
                  introMonths={introMonths}
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
                  Yes — we design and build your first version at no cost, with
                  no card required. You only start a plan once you&apos;re happy
                  with it and ready to take the site live. From there we host,
                  secure, and keep it updated for a simple monthly fee.
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
