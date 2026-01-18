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
  Shield,
  BarChart3,
  TrendingUp,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { Header } from "@/components/landing/Header";
import { Footer } from "@/components/landing/Footer";

const plans = [
  {
    name: "Free Website Build",
    description: "Get a professional website at no cost",
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
      "1 round of revisions",
    ],
    cta: "Get Started Free",
    href: "/questionnaire",
    planKey: null, // Free plan - no checkout
    popular: false,
  },
  {
    name: "Website Management",
    description: "Keep your website updated and automated",
    price: "$79",
    period: "/month",
    icon: Zap,
    color: "text-purple-600",
    bgColor: "bg-purple-50",
    features: [
      "Managed hosting & SSL",
      "Monthly content updates",
      "Security monitoring",
      "Performance optimization",
      "Analytics dashboard",
      "Priority support",
      "Automation tools",
    ],
    cta: "Start 14-Day Trial",
    href: "/portal",
    planKey: "website_management",
    popular: true,
  },
  {
    name: "Cybersecurity Shield",
    description: "Protect your business from threats",
    price: "$39",
    period: "/month",
    icon: Shield,
    color: "text-green-600",
    bgColor: "bg-green-50",
    features: [
      "Weekly security scans",
      "SSL certificate monitoring",
      "Vulnerability detection",
      "Security header checks",
      "Real-time alerts",
      "Remediation guidance",
      "Compliance reports",
    ],
    cta: "Protect My Site",
    href: "/portal",
    planKey: "cybersecurity",
    popular: false,
  },
  {
    name: "Cash Flow AI",
    description: "Get paid faster with AI-powered recovery",
    price: "8%",
    period: " of recovered",
    icon: TrendingUp,
    color: "text-emerald-600",
    bgColor: "bg-emerald-50",
    features: [
      "Invoice recovery automation",
      "Payment predictions",
      "Cash flow forecasting",
      "QuickBooks/Xero sync",
      "AI-powered recommendations",
      "Client payment scoring",
      "Only pay when you recover",
    ],
    cta: "Start Recovering",
    href: "/portal",
    planKey: null, // Special pricing - contact sales
    popular: false,
  },
  {
    name: "Business Chauffeur",
    description: "AI-powered business insights",
    price: "$199",
    period: "/month",
    icon: BarChart3,
    color: "text-orange-600",
    bgColor: "bg-orange-50",
    features: [
      "POS system integration",
      "Accounting sync",
      "Review monitoring",
      "Competitor analysis",
      "AI business insights",
      "Revenue optimization",
      "Custom reporting",
    ],
    cta: "Get Insights",
    href: "/portal",
    planKey: "chauffeur",
    popular: false,
  },
];

function PricingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { status } = useSession();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const handleCheckout = useCallback(async (planKey: string) => {
    // If not logged in, redirect to login with callback
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
  }, [status, router]);

  // Handle plan query parameter (from login redirect)
  useEffect(() => {
    const planFromUrl = searchParams.get("plan");
    if (planFromUrl && status === "authenticated") {
      // Clear the URL parameter and trigger checkout
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
              Choose the Right Plan for Your Business
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Start with a free website, then add powerful tools as you grow.
              No hidden fees, cancel anytime.
            </p>
          </div>
        </section>

        {/* Pricing cards */}
        <section className="py-16 -mt-8">
          <div className="container mx-auto px-4">
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              {plans.map((plan) => (
                <Card
                  key={plan.name}
                  className={`relative flex flex-col ${
                    plan.popular
                      ? "border-purple-500 border-2 shadow-lg"
                      : ""
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
                            ? "bg-purple-600 hover:bg-purple-700"
                            : ""
                        }`}
                        variant={plan.popular ? "default" : "outline"}
                        onClick={() => handleCheckout(plan.planKey!)}
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
                              ? "bg-purple-600 hover:bg-purple-700"
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
                  Yes! We build your website at no cost. You only pay for
                  hosting and optional add-on services like Website Management
                  or Cybersecurity Shield.
                </p>
              </div>

              <div className="bg-white rounded-lg p-6 shadow-sm">
                <h3 className="font-semibold mb-2">
                  How does Cash Flow AI pricing work?
                </h3>
                <p className="text-gray-600">
                  Cash Flow AI operates on a success-fee model. You only pay 8%
                  of the money we help you recover from overdue invoices. If we
                  don&apos;t recover anything, you don&apos;t pay anything.
                </p>
              </div>

              <div className="bg-white rounded-lg p-6 shadow-sm">
                <h3 className="font-semibold mb-2">Can I cancel anytime?</h3>
                <p className="text-gray-600">
                  Absolutely. All our subscription plans are month-to-month with
                  no long-term contracts. Cancel anytime from your billing
                  dashboard.
                </p>
              </div>

              <div className="bg-white rounded-lg p-6 shadow-sm">
                <h3 className="font-semibold mb-2">
                  What integrations do you support?
                </h3>
                <p className="text-gray-600">
                  We integrate with QuickBooks, Xero, Square, and Google
                  Business Profile. More integrations are being added regularly.
                </p>
              </div>

              <div className="bg-white rounded-lg p-6 shadow-sm">
                <h3 className="font-semibold mb-2">
                  Do you offer custom enterprise plans?
                </h3>
                <p className="text-gray-600">
                  Yes! Contact us for custom pricing on Business Chauffeur and
                  multi-location setups. We&apos;ll create a plan that fits your
                  specific needs.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 bg-blue-600 text-white">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              Ready to Grow Your Business?
            </h2>
            <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
              Start with a free website and see the difference professional web
              presence makes for your business.
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
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-96 bg-gray-100 rounded-lg animate-pulse" />
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
