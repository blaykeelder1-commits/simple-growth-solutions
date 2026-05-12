import Link from "next/link";
import { TemplatePreview } from "@/components/preview/TemplatePreview";
import { TEMPLATES } from "@/lib/templates";
import { ArrowRight, ArrowUpRight, Star } from "lucide-react";

export const metadata = {
  title: "Preview: Bold & Design-Forward | SGS",
  robots: { index: false, follow: false },
};

// Option B — Bold & Design-Forward (Framer / Webflow vibe)
// Cream background, near-black text, single vibrant orange accent,
// editorial type, oversized headlines, asymmetric layouts, big device mockup.

export default function BoldPreview() {
  return (
    <div className="min-h-screen bg-[#fefdf8] text-zinc-950 antialiased">
      {/* Internal preview banner */}
      <div className="bg-zinc-950 text-amber-100 text-xs py-2 px-4 text-center">
        Preview · Option B — Bold &amp; Design-Forward · <Link href="/preview" className="underline">back to chooser</Link>
      </div>

      {/* Header */}
      <header className="border-b border-zinc-200">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/preview/bold" className="text-2xl font-black tracking-tight">
            simple<span className="text-orange-600">·</span>growth
          </Link>
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium">
            <Link href="#work">Work</Link>
            <Link href="#how">Process</Link>
            <Link href="#pricing">Pricing</Link>
            <Link href="/analyze">Free audit</Link>
          </nav>
          <Link
            href="/questionnaire"
            className="text-sm font-semibold px-5 py-2.5 bg-zinc-950 text-amber-50 rounded-full hover:bg-orange-600 transition"
          >
            Start →
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-7">
              <p className="inline-flex items-center gap-2 text-sm font-semibold text-orange-600 mb-6 px-3 py-1 bg-orange-100 rounded-full">
                <span className="h-1.5 w-1.5 rounded-full bg-orange-600 animate-pulse" />
                Free build · We run it for $49/mo
              </p>
              <h1 className="text-6xl md:text-8xl font-black tracking-tighter leading-[0.95] mb-8">
                Your website,
                <br />
                <span className="italic font-serif text-orange-600">but actually good.</span>
              </h1>
              <p className="text-xl text-zinc-700 mb-10 max-w-xl leading-relaxed">
                We design, build, and run beautiful websites for businesses that
                are too busy running their business. Free build. Simple monthly fee.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/questionnaire"
                  className="inline-flex items-center gap-2 bg-zinc-950 text-amber-50 px-7 py-4 rounded-full font-semibold text-base hover:bg-orange-600 transition"
                >
                  Get my free website
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/analyze"
                  className="inline-flex items-center gap-2 border-2 border-zinc-950 text-zinc-950 px-7 py-4 rounded-full font-semibold hover:bg-zinc-950 hover:text-amber-50 transition"
                >
                  Audit my site
                </Link>
              </div>
            </div>

            {/* Big device mockup using a template */}
            <div className="lg:col-span-5 relative">
              <div className="absolute -top-6 -right-6 h-32 w-32 rounded-full bg-orange-200 blur-2xl opacity-60" />
              <div className="relative">
                <TemplatePreview template={TEMPLATES[0]} variant="card" />
              </div>
              <div className="absolute -bottom-6 -left-6 z-10 bg-white rounded-2xl shadow-xl p-4 max-w-xs border border-zinc-200">
                <div className="flex gap-1 mb-2">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-sm text-zinc-700 italic">
                  &ldquo;They built our site in a week. It&apos;s gorgeous and we
                  haven&apos;t had to touch it.&rdquo;
                </p>
                <p className="text-xs text-zinc-500 mt-2">— Maria, Authentic Eats</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Marquee-style trust bar */}
      <section className="border-y-2 border-zinc-950 py-6 overflow-hidden bg-zinc-950 text-amber-50">
        <div className="flex gap-12 text-2xl font-bold tracking-tight whitespace-nowrap animate-pulse">
          <span>Restaurants ✦</span>
          <span>Auto Shops ✦</span>
          <span>Healthcare ✦</span>
          <span>Retail ✦</span>
          <span>Pro Services ✦</span>
          <span>Restaurants ✦</span>
          <span>Auto Shops ✦</span>
          <span>Healthcare ✦</span>
        </div>
      </section>

      {/* Process — asymmetric */}
      <section id="how" className="py-28">
        <div className="max-w-7xl mx-auto px-6">
          <p className="text-sm font-semibold text-orange-600 uppercase tracking-widest mb-3">The Process</p>
          <h2 className="text-5xl md:text-6xl font-black tracking-tighter mb-20 max-w-3xl">
            Three steps from
            <br />
            <span className="italic font-serif">zero to live.</span>
          </h2>
          <div className="space-y-20">
            {[
              { n: "01", title: "Tell us about you", body: "A 5-minute questionnaire — or paste your current site for a free audit. No credit card. No catch." },
              { n: "02", title: "We design + build it", body: "Our team designs a site tuned to your industry. You approve, we deploy. Free." },
              { n: "03", title: "We run it forever", body: "$49/mo. Send a request anytime — edits, content updates, fixes. Same-day rush available." },
            ].map((step, i) => (
              <div
                key={step.n}
                className={`grid md:grid-cols-12 gap-8 items-center ${
                  i % 2 === 1 ? "md:[&>div:first-child]:order-2" : ""
                }`}
              >
                <div className="md:col-span-5">
                  <p className="text-7xl md:text-9xl font-black text-orange-600/20 leading-none">{step.n}</p>
                </div>
                <div className="md:col-span-7">
                  <h3 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">{step.title}</h3>
                  <p className="text-lg text-zinc-700 leading-relaxed">{step.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Work / Portfolio */}
      <section id="work" className="py-28 bg-zinc-950 text-amber-50">
        <div className="max-w-7xl mx-auto px-6">
          <p className="text-sm font-semibold text-orange-400 uppercase tracking-widest mb-3">Recent Work</p>
          <h2 className="text-5xl md:text-6xl font-black tracking-tighter mb-4">
            Real templates,
            <br />
            <span className="italic font-serif text-orange-400">tuned to your trade.</span>
          </h2>
          <p className="text-zinc-400 mb-16 max-w-2xl text-lg">
            Each industry gets a starting point built for how its customers
            actually shop, browse, and book.
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {TEMPLATES.map((t) => (
              <div key={t.id} className="group">
                <TemplatePreview template={t} />
                <div className="mt-3 flex items-center justify-between">
                  <p className="font-bold">{t.name}</p>
                  <ArrowUpRight className="h-4 w-4 group-hover:rotate-12 transition" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-28">
        <div className="max-w-6xl mx-auto px-6">
          <p className="text-sm font-semibold text-orange-600 uppercase tracking-widest mb-3">Pricing</p>
          <h2 className="text-5xl md:text-6xl font-black tracking-tighter mb-16">
            One free build.
            <br />
            <span className="italic font-serif">Two simple plans.</span>
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { name: "Free Build", price: "$0", features: ["Custom design", "Mobile responsive", "Basic SEO", "Self-managed"] },
              { name: "Managed", price: "$49", suffix: "/mo", popular: true, features: ["We host + secure", "Submit edits anytime", "3–5 day turnaround", "Same-day rush +$49"] },
              { name: "Pro", price: "$79", suffix: "/mo", features: ["Everything in Managed", "24-hour turnaround", "AI chatbot", "Lead capture", "Priority support"] },
            ].map((tier) => (
              <div
                key={tier.name}
                className={`p-8 rounded-3xl border-2 ${
                  tier.popular
                    ? "bg-orange-600 text-white border-orange-600"
                    : "bg-white border-zinc-950"
                }`}
              >
                <p className={`text-xs font-bold uppercase tracking-widest mb-3 ${tier.popular ? "text-orange-100" : "text-orange-600"}`}>
                  {tier.name}
                </p>
                <p className="mb-6">
                  <span className="text-5xl font-black tracking-tighter">{tier.price}</span>
                  {tier.suffix && <span className="text-lg">{tier.suffix}</span>}
                </p>
                <ul className="space-y-3 mb-8">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm font-medium">
                      <span className={tier.popular ? "text-orange-200" : "text-orange-600"}>✦</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/questionnaire"
                  className={`block text-center font-semibold py-3 rounded-full transition ${
                    tier.popular
                      ? "bg-zinc-950 text-amber-50 hover:bg-zinc-800"
                      : "bg-zinc-950 text-amber-50 hover:bg-orange-600"
                  }`}
                >
                  Start →
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-32 bg-orange-600 text-white">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-6xl md:text-8xl font-black tracking-tighter mb-8 leading-[0.95]">
            Let&apos;s build
            <br />
            <span className="italic font-serif">something good.</span>
          </h2>
          <Link
            href="/questionnaire"
            className="inline-flex items-center gap-2 bg-zinc-950 text-amber-50 px-10 py-5 rounded-full font-bold text-lg hover:bg-white hover:text-orange-600 transition"
          >
            Get my free website
            <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </section>

      <footer className="bg-zinc-950 text-zinc-500 py-10">
        <div className="max-w-7xl mx-auto px-6 flex flex-wrap items-center justify-between gap-3 text-sm">
          <span>© {new Date().getFullYear()} Simple Growth</span>
          <span>Built loud, run quiet.</span>
        </div>
      </footer>
    </div>
  );
}
