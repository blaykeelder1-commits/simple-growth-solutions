import Link from "next/link";
import { TemplatePreviewRow } from "@/components/preview/TemplatePreview";
import { ArrowRight, Check } from "lucide-react";

export const metadata = {
  title: "Preview: Clean & Modern | SGS",
  robots: { index: false, follow: false },
};

// Option A — Clean & Modern (Linear / Stripe vibe)
// Pure white, single dark accent (slate-900), generous whitespace, tight type.

export default function CleanPreview() {
  return (
    <div className="min-h-screen bg-white text-slate-900 antialiased">
      {/* Internal preview banner */}
      <div className="bg-slate-900 text-white text-xs py-2 px-4 text-center">
        Preview · Option A — Clean &amp; Modern · <Link href="/preview" className="underline">back to chooser</Link>
      </div>

      {/* Header */}
      <header className="border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/preview/clean" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-slate-900 flex items-center justify-center">
              <span className="text-white font-bold text-sm">SG</span>
            </div>
            <span className="font-semibold text-slate-900">Simple Growth</span>
          </Link>
          <nav className="hidden md:flex items-center gap-8 text-sm text-slate-600">
            <Link href="#how" className="hover:text-slate-900">How it works</Link>
            <Link href="#work" className="hover:text-slate-900">Our work</Link>
            <Link href="#pricing" className="hover:text-slate-900">Pricing</Link>
            <Link href="/analyze" className="hover:text-slate-900">Free audit</Link>
          </nav>
          <Link
            href="/questionnaire"
            className="text-sm font-medium px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition"
          >
            Get started
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="py-24 md:py-32">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <p className="text-sm font-medium text-slate-500 mb-6">
            Free build · $49/mo to run it for you
          </p>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-slate-900 mb-6 leading-[1.05]">
            A website that works.
            <br />
            <span className="text-slate-400">So you don&apos;t have to.</span>
          </h1>
          <p className="text-xl text-slate-600 mb-10 max-w-2xl mx-auto leading-relaxed">
            We build your site for free, then host, secure, and update it for a
            simple monthly fee. You send a request — we handle the rest.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
            <Link
              href="/questionnaire"
              className="inline-flex items-center gap-2 bg-slate-900 text-white px-6 py-3.5 rounded-lg font-medium hover:bg-slate-800 transition"
            >
              Get my free website
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/analyze"
              className="inline-flex items-center gap-2 text-slate-700 px-6 py-3.5 rounded-lg font-medium hover:bg-slate-100 transition"
            >
              Audit my current site →
            </Link>
          </div>
          <p className="text-xs text-slate-400 mt-6">
            No credit card · Free build · Cancel anytime
          </p>
        </div>
      </section>

      {/* Trust bar */}
      <section className="border-y border-slate-200 py-8 bg-slate-50/50">
        <div className="max-w-6xl mx-auto px-6">
          <p className="text-xs uppercase tracking-widest text-slate-500 text-center mb-4">
            Built for businesses like
          </p>
          <div className="flex flex-wrap justify-center items-center gap-x-10 gap-y-3 text-slate-600 text-sm font-medium">
            <span>Restaurants</span>
            <span className="text-slate-300">·</span>
            <span>Auto Shops</span>
            <span className="text-slate-300">·</span>
            <span>Healthcare</span>
            <span className="text-slate-300">·</span>
            <span>Retail</span>
            <span className="text-slate-300">·</span>
            <span>Professional Services</span>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="py-24">
        <div className="max-w-4xl mx-auto px-6">
          <p className="text-sm font-medium text-slate-500 mb-3">How it works</p>
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-16 max-w-xl">
            Three steps. We do the work.
          </h2>
          <div className="space-y-12">
            {[
              { n: "01", title: "Tell us about your business", body: "Quick questionnaire, or paste your current site for a free audit." },
              { n: "02", title: "We build it — free", body: "Our team designs and launches your site. You approve the design, we deploy it." },
              { n: "03", title: "We run it for $49/mo", body: "Hosting, security, edits, and updates handled. Standard turnaround is 3–5 business days." },
            ].map((step) => (
              <div key={step.n} className="grid grid-cols-12 gap-6 items-start">
                <div className="col-span-2 text-3xl font-bold text-slate-300 tabular-nums">
                  {step.n}
                </div>
                <div className="col-span-10">
                  <h3 className="text-xl font-semibold text-slate-900 mb-2">{step.title}</h3>
                  <p className="text-slate-600 leading-relaxed">{step.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Portfolio */}
      <section id="work" className="py-24 border-t border-slate-200 bg-slate-50">
        <div className="max-w-6xl mx-auto px-6">
          <p className="text-sm font-medium text-slate-500 mb-3">Our templates</p>
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-3">
            Designed for your industry.
          </h2>
          <p className="text-slate-600 mb-12 max-w-2xl">
            Every site is custom-built on a foundation tuned to your industry —
            so it looks the part from day one.
          </p>
          <TemplatePreviewRow />
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24">
        <div className="max-w-4xl mx-auto px-6">
          <p className="text-sm font-medium text-slate-500 mb-3">Pricing</p>
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-12">
            Simple, monthly, cancel anytime.
          </h2>
          <div className="grid md:grid-cols-3 gap-4">
            {[
              { name: "Free Build", price: "$0", note: "Self-managed", features: ["Custom design", "Mobile responsive", "Basic SEO", "Self-managed after launch"] },
              { name: "Managed", price: "$49", popular: true, note: "/month", features: ["Everything in Free", "We host + secure it", "Submit edits anytime", "3–5 day turnaround", "Same-day rush +$49"] },
              { name: "Pro", price: "$79", note: "/month", features: ["Everything in Managed", "24-hour turnaround", "AI chatbot", "Lead capture forms", "Priority support"] },
            ].map((tier) => (
              <div
                key={tier.name}
                className={`p-6 rounded-xl border ${tier.popular ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white"}`}
              >
                <p className={`text-xs font-semibold uppercase tracking-wider mb-2 ${tier.popular ? "text-slate-300" : "text-slate-500"}`}>
                  {tier.name}
                </p>
                <p className="mb-1">
                  <span className="text-3xl font-bold">{tier.price}</span>
                  <span className={`text-sm ${tier.popular ? "text-slate-400" : "text-slate-500"}`}>{tier.note}</span>
                </p>
                <ul className="space-y-2 mt-6 text-sm">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <Check className={`h-4 w-4 mt-0.5 shrink-0 ${tier.popular ? "text-emerald-400" : "text-slate-900"}`} />
                      <span className={tier.popular ? "text-slate-100" : "text-slate-700"}>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 border-t border-slate-200">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-5xl font-bold text-slate-900 mb-6 tracking-tight">
            Ready when you are.
          </h2>
          <p className="text-slate-600 mb-8 text-lg">
            Free build today. Hand off the upkeep tomorrow.
          </p>
          <Link
            href="/questionnaire"
            className="inline-flex items-center gap-2 bg-slate-900 text-white px-7 py-4 rounded-lg font-medium hover:bg-slate-800 transition"
          >
            Get my free website
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 py-10">
        <div className="max-w-6xl mx-auto px-6 text-center text-sm text-slate-500">
          © {new Date().getFullYear()} Simple Growth Solutions. Built with care.
        </div>
      </footer>
    </div>
  );
}
