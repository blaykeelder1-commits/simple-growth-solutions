"use client";

import Link from "next/link";
import { Globe, TrendingUp, Brain, ArrowRight, Rocket } from "lucide-react";
import { ScrollAnimation } from "@/components/ui/scroll-animation";
import { Button } from "@/components/ui/button";

const products = [
  {
    icon: Globe,
    title: "Free Website + Management",
    subtitle: "Starting at $0 — Free build, $49/mo managed",
    description:
      "We build your professional website for free. Choose a management tier for ongoing edits, AI chatbot, SEO, and priority support — starting at half the cost of typical agencies.",
    highlights: [
      "Free custom website build",
      "Managed plans from $49/mo",
      "AI chatbot & lead capture ($79/mo)",
      "SEO + industry features ($129/mo)",
    ],
    gradient: "from-blue-500 to-cyan-400",
    bgGradient: "from-blue-50 to-cyan-50",
    borderColor: "hover:border-blue-300",
    iconBg: "bg-blue-100 text-blue-600 group-hover:bg-blue-500",
    href: "/pricing",
  },
  {
    icon: TrendingUp,
    title: "Accounts Receivable & Cash Flow",
    subtitle: "8% contingency — only pay when you collect",
    description:
      "Collect past-due invoices at 8% of recovered amount — 2-5x cheaper than any collection agency. Cash flow prediction and dashboard included at no extra cost.",
    highlights: [
      "8% fee (agencies charge 25-40%)",
      "Zero upfront cost",
      "Cash flow dashboard & prediction",
      "QuickBooks/Xero sync",
    ],
    gradient: "from-emerald-500 to-teal-400",
    bgGradient: "from-emerald-50 to-teal-50",
    borderColor: "hover:border-emerald-300",
    iconBg: "bg-emerald-100 text-emerald-600 group-hover:bg-emerald-500",
    href: "/pricing",
  },
  {
    icon: Brain,
    title: "GEO (Geoffrey) — AI Business Mentor",
    subtitle: "From $79/mo — 90% cheaper than a human coach",
    description:
      "24/7 AI business advisor integrated into your actual data. GEO sees your website analytics, cash flow, and operations to make personalized recommendations no generic AI can match.",
    highlights: [
      "24/7 AI business mentor",
      "Integrated with your real data",
      "Personalized action plans",
      "Daily insights & KPI tracking",
    ],
    gradient: "from-violet-500 to-purple-400",
    bgGradient: "from-violet-50 to-purple-50",
    borderColor: "hover:border-violet-300",
    iconBg: "bg-violet-100 text-violet-600 group-hover:bg-violet-500",
    href: "/pricing",
  },
];

export function Services() {
  return (
    <section id="services" className="relative py-20 md:py-28 overflow-hidden">
      {/* Colorful gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50" />

      {/* Decorative shapes */}
      <div className="absolute top-0 left-0 w-72 h-72 bg-gradient-to-br from-blue-400/20 to-cyan-400/20 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute top-1/2 right-0 w-96 h-96 bg-gradient-to-br from-purple-400/20 to-pink-400/20 rounded-full blur-3xl translate-x-1/2" />
      <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-gradient-to-br from-emerald-400/15 to-teal-400/15 rounded-full blur-3xl translate-y-1/2" />

      <div className="container relative mx-auto px-4 md:px-6">
        {/* Section header */}
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <ScrollAnimation animation="fade-scale">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/80 backdrop-blur-sm border border-purple-200 px-4 py-1.5 text-sm font-medium text-purple-700 shadow-lg shadow-purple-500/10">
              Our Products
            </div>
          </ScrollAnimation>
          <ScrollAnimation animation="fade-up" delay={100}>
            <h2 className="mb-4 text-3xl font-bold tracking-tight md:text-4xl bg-gradient-to-r from-gray-900 via-blue-800 to-purple-800 bg-clip-text text-transparent">
              Three Products. One Integrated Suite.
            </h2>
          </ScrollAnimation>
          <ScrollAnimation animation="fade-up" delay={200}>
            <p className="text-lg text-gray-600">
              A free website to get you started, AI-powered cash flow recovery,
              and a business mentor that sees it all. Each product is powerful
              alone — together, they&apos;re unbeatable.
            </p>
          </ScrollAnimation>
        </div>

        {/* Products grid */}
        <div className="grid gap-8 lg:grid-cols-3 max-w-6xl mx-auto">
          {products.map((product, index) => (
            <ScrollAnimation
              key={product.title}
              animation="fade-up"
              delay={index * 150}
            >
              <div
                className={`group relative rounded-2xl border-2 border-white/50 bg-white/70 backdrop-blur-sm p-8 transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl hover:shadow-purple-500/10 hover:bg-white card-animate digital-hover ${product.borderColor} flex flex-col h-full`}
              >
                {/* Gradient overlay on hover */}
                <div
                  className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${product.bgGradient} opacity-50 transition-opacity duration-300 group-hover:opacity-70`}
                />

                <div className="relative flex-1 flex flex-col">
                  <div
                    className={`mb-4 inline-flex rounded-xl p-3 transition-all duration-300 ${product.iconBg} group-hover:text-white group-hover:shadow-lg group-hover:scale-110 w-fit`}
                  >
                    <product.icon className="h-7 w-7" />
                  </div>
                  <h3 className="mb-1 text-xl font-semibold text-gray-900">
                    {product.title}
                  </h3>
                  <p className="mb-3 text-sm font-medium bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    {product.subtitle}
                  </p>
                  <p className="text-gray-600 mb-5">{product.description}</p>

                  <ul className="space-y-2 mb-6 flex-1">
                    {product.highlights.map((highlight) => (
                      <li
                        key={highlight}
                        className="flex items-center gap-2 text-sm text-gray-700"
                      >
                        <div
                          className={`h-1.5 w-1.5 rounded-full bg-gradient-to-r ${product.gradient} flex-shrink-0`}
                        />
                        {highlight}
                      </li>
                    ))}
                  </ul>

                  <Link href={product.href}>
                    <Button
                      variant="outline"
                      className="w-full group/btn border-gray-200 hover:border-purple-300 hover:bg-purple-50"
                    >
                      Learn More
                      <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover/btn:translate-x-1" />
                    </Button>
                  </Link>
                </div>
              </div>
            </ScrollAnimation>
          ))}
        </div>

        {/* Coming soon: NanoClaw */}
        <ScrollAnimation animation="fade-up" delay={500}>
          <div className="mt-12 text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/80 backdrop-blur-sm border border-gray-200 px-5 py-2 text-sm text-gray-600">
              <Rocket className="h-4 w-4 text-orange-500" />
              <span>
                <strong>Coming Soon:</strong> NanoClaw Integration — automation
                for content updates, follow-ups, reminders, and more.
              </span>
            </div>
          </div>
        </ScrollAnimation>
      </div>
    </section>
  );
}
