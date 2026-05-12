import Link from "next/link";
import { TemplatePreviewRow } from "@/components/preview/TemplatePreview";
import { ArrowRight, CheckCircle2, Heart, Star, Shield, Zap, Clock } from "lucide-react";

export const metadata = {
  title: "Preview: Trust-First | SGS",
  robots: { index: false, follow: false },
};

// Option C — Trust-First & Friendly (Squarespace / Mailchimp vibe)
// Warm cream background, sage green + warm orange accents, friendly icons,
// real-feeling testimonials with photos + business names + locations.

const SAGE = "#5b8a72";
const SAGE_LIGHT = "#e8f0e9";
const CORAL = "#e07856";
const CREAM = "#fbf7ee";

export default function TrustPreview() {
  return (
    <div className="min-h-screen antialiased" style={{ backgroundColor: CREAM, color: "#2d2a26" }}>
      {/* Internal preview banner */}
      <div className="text-white text-xs py-2 px-4 text-center" style={{ backgroundColor: SAGE }}>
        Preview · Option C — Trust-First &amp; Friendly · <Link href="/preview" className="underline">back to chooser</Link>
      </div>

      {/* Header */}
      <header className="border-b" style={{ borderColor: "#ebe4d4" }}>
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/preview/trust" className="flex items-center gap-2">
            <div
              className="h-9 w-9 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: SAGE }}
            >
              <Heart className="h-4 w-4 text-white" fill="currentColor" />
            </div>
            <div>
              <p className="font-bold leading-tight">Simple Growth</p>
              <p className="text-[10px] text-stone-500 leading-tight">Websites for small business</p>
            </div>
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm" style={{ color: "#5d574d" }}>
            <Link href="#how" className="hover:text-stone-900">How it works</Link>
            <Link href="#stories" className="hover:text-stone-900">Stories</Link>
            <Link href="#pricing" className="hover:text-stone-900">Pricing</Link>
            <Link href="/analyze" className="hover:text-stone-900">Free audit</Link>
          </nav>
          <Link
            href="/questionnaire"
            className="text-sm font-semibold px-4 py-2 rounded-full text-white transition hover:opacity-90"
            style={{ backgroundColor: CORAL }}
          >
            Get started — free
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="py-20">
        <div className="max-w-5xl mx-auto px-6 text-center">
          <p
            className="inline-flex items-center gap-2 text-sm font-semibold mb-6 px-4 py-1.5 rounded-full"
            style={{ backgroundColor: SAGE_LIGHT, color: SAGE }}
          >
            <Heart className="h-3.5 w-3.5" fill="currentColor" />
            Trusted by independent businesses across the country
          </p>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 leading-tight" style={{ color: "#2d2a26" }}>
            We&apos;ll build your website.
            <br />
            <span style={{ color: SAGE }}>For free.</span>
          </h1>
          <p className="text-xl mb-10 max-w-2xl mx-auto leading-relaxed" style={{ color: "#5d574d" }}>
            You run the business. We&apos;ll handle the website.
            One simple monthly fee covers everything — hosting, edits, security,
            and a real person who picks up.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
            <Link
              href="/questionnaire"
              className="inline-flex items-center gap-2 text-white px-7 py-3.5 rounded-full font-semibold transition hover:opacity-90"
              style={{ backgroundColor: CORAL }}
            >
              Get my free website
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/analyze"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full font-semibold border-2 transition hover:bg-white"
              style={{ borderColor: SAGE, color: SAGE }}
            >
              Audit my current site
            </Link>
          </div>

          {/* Quick benefits row */}
          <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl mx-auto">
            {[
              { icon: Heart, text: "No upfront cost" },
              { icon: Shield, text: "Cancel anytime" },
              { icon: Clock, text: "Live in 7 days" },
            ].map((b) => (
              <div key={b.text} className="flex items-center justify-center gap-2.5">
                <div
                  className="h-9 w-9 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: SAGE_LIGHT }}
                >
                  <b.icon className="h-4 w-4" style={{ color: SAGE }} />
                </div>
                <span className="text-sm font-medium" style={{ color: "#5d574d" }}>{b.text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Before/After audit teaser */}
      <section className="py-16" style={{ backgroundColor: "#f5efe2" }}>
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-10 items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-widest mb-3" style={{ color: CORAL }}>
                Free Website Audit
              </p>
              <h2 className="text-4xl font-bold mb-4 leading-tight">
                Curious what&apos;s holding your current site back?
              </h2>
              <p className="text-lg mb-6 leading-relaxed" style={{ color: "#5d574d" }}>
                Paste your URL and we&apos;ll send back a real report — speed,
                mobile, SEO, security. No sales call required.
              </p>
              <Link
                href="/analyze"
                className="inline-flex items-center gap-2 font-semibold underline-offset-4 hover:underline"
                style={{ color: SAGE }}
              >
                Run my free audit
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="rounded-2xl shadow-lg p-6 bg-white border" style={{ borderColor: "#ebe4d4" }}>
              <p className="text-xs font-medium text-stone-500 mb-2">yourbusiness.com</p>
              <div className="space-y-3">
                <Score label="Speed" score={62} color="#dc8742" />
                <Score label="Mobile" score={88} color={SAGE} />
                <Score label="SEO" score={45} color={CORAL} />
                <Score label="Security" score={91} color={SAGE} />
              </div>
              <div
                className="mt-4 p-3 rounded-lg text-xs"
                style={{ backgroundColor: "#fff5e8", color: "#8a5a1f" }}
              >
                Found 7 issues we could fix for you.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="py-20">
        <div className="max-w-5xl mx-auto px-6">
          <p className="text-sm font-semibold text-center uppercase tracking-widest mb-3" style={{ color: SAGE }}>
            How it works
          </p>
          <h2 className="text-4xl md:text-5xl font-bold text-center mb-16">
            Three steps. We do the heavy lifting.
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { step: "1", title: "Tell us about your business", body: "Quick questionnaire about what you do and who you serve." },
              { step: "2", title: "We build it — free", body: "Our designers craft your site. You approve, we go live." },
              { step: "3", title: "We run it for $49/mo", body: "Edits, hosting, security, support. You focus on customers." },
            ].map((s) => (
              <div
                key={s.step}
                className="p-6 rounded-2xl bg-white border"
                style={{ borderColor: "#ebe4d4" }}
              >
                <div
                  className="h-10 w-10 rounded-full flex items-center justify-center font-bold text-white mb-4"
                  style={{ backgroundColor: SAGE }}
                >
                  {s.step}
                </div>
                <h3 className="text-lg font-bold mb-2">{s.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: "#5d574d" }}>{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Templates / "real work" */}
      <section className="py-20" style={{ backgroundColor: "#f5efe2" }}>
        <div className="max-w-6xl mx-auto px-6">
          <p className="text-sm font-semibold text-center uppercase tracking-widest mb-3" style={{ color: CORAL }}>
            Built for your industry
          </p>
          <h2 className="text-4xl md:text-5xl font-bold text-center mb-3">
            Designs that fit your business.
          </h2>
          <p className="text-center mb-12 max-w-2xl mx-auto" style={{ color: "#5d574d" }}>
            Restaurant? Auto shop? Clinic? We start from a foundation built for
            how YOUR customers actually shop.
          </p>
          <TemplatePreviewRow />
        </div>
      </section>

      {/* Real-feeling testimonials */}
      <section id="stories" className="py-20">
        <div className="max-w-6xl mx-auto px-6">
          <p className="text-sm font-semibold text-center uppercase tracking-widest mb-3" style={{ color: SAGE }}>
            From our customers
          </p>
          <h2 className="text-4xl md:text-5xl font-bold text-center mb-16">
            Real businesses. Real results.
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                quote: "I haven't touched my website in 6 months. Whenever I need a change, I send a quick note and it's done by morning.",
                name: "Maria S.",
                business: "Authentic Eats",
                location: "Austin, TX",
                color: "#fde2cf",
              },
              {
                quote: "The free build was actually free. I expected a catch. There wasn't one. Just a great site and an honest monthly fee.",
                name: "Derek M.",
                business: "Derek's Auto Repair",
                location: "Charlotte, NC",
                color: SAGE_LIGHT,
              },
              {
                quote: "Our patient bookings tripled in 3 months. They actually understand what a small clinic needs.",
                name: "Dr. Priya K.",
                business: "Hillside Family Care",
                location: "Boulder, CO",
                color: "#fff1d9",
              },
            ].map((t) => (
              <div
                key={t.name}
                className="p-6 rounded-2xl bg-white border"
                style={{ borderColor: "#ebe4d4" }}
              >
                <div className="flex gap-1 mb-3">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-base leading-relaxed mb-5" style={{ color: "#3d3a35" }}>
                  &ldquo;{t.quote}&rdquo;
                </p>
                <div className="flex items-center gap-3 pt-4 border-t" style={{ borderColor: "#ebe4d4" }}>
                  <div
                    className="h-11 w-11 rounded-full flex items-center justify-center font-bold text-stone-700"
                    style={{ backgroundColor: t.color }}
                  >
                    {t.name.split(" ").map((n) => n[0]).join("")}
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{t.name}</p>
                    <p className="text-xs text-stone-500">{t.business} · {t.location}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing — inline + friendly */}
      <section id="pricing" className="py-20" style={{ backgroundColor: "#f5efe2" }}>
        <div className="max-w-5xl mx-auto px-6">
          <p className="text-sm font-semibold text-center uppercase tracking-widest mb-3" style={{ color: CORAL }}>
            Pricing
          </p>
          <h2 className="text-4xl md:text-5xl font-bold text-center mb-3">Simple. Honest. Monthly.</h2>
          <p className="text-center mb-12" style={{ color: "#5d574d" }}>
            No setup fees. No long contracts. Cancel any time.
          </p>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { name: "Free Build", price: "$0", note: "One-time", features: ["Custom design", "Mobile responsive", "Basic SEO", "You manage it after launch"] },
              { name: "Managed", price: "$49", note: "/month", popular: true, features: ["Everything in Free, plus:", "We host & secure your site", "Submit edits anytime", "3–5 day turnaround", "Same-day rush available"] },
              { name: "Pro", price: "$79", note: "/month", features: ["Everything in Managed, plus:", "24-hour edit turnaround", "AI chatbot built in", "Lead capture forms", "Priority support"] },
            ].map((tier) => (
              <div
                key={tier.name}
                className={`p-6 rounded-2xl bg-white border-2 relative`}
                style={{
                  borderColor: tier.popular ? SAGE : "#ebe4d4",
                }}
              >
                {tier.popular && (
                  <div
                    className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs font-bold px-3 py-1 rounded-full text-white"
                    style={{ backgroundColor: SAGE }}
                  >
                    Most popular
                  </div>
                )}
                <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: CORAL }}>
                  {tier.name}
                </p>
                <p className="mb-5">
                  <span className="text-4xl font-bold">{tier.price}</span>
                  <span className="text-sm" style={{ color: "#5d574d" }}>{tier.note}</span>
                </p>
                <ul className="space-y-2.5 mb-6 text-sm">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" style={{ color: SAGE }} />
                      <span style={{ color: "#3d3a35" }}>{f}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href="/questionnaire"
                  className="block text-center font-semibold py-3 rounded-full transition text-white hover:opacity-90"
                  style={{ backgroundColor: tier.popular ? SAGE : CORAL }}
                >
                  Get started
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Let&apos;s build something you&apos;re proud to share.
          </h2>
          <p className="mb-8 text-lg" style={{ color: "#5d574d" }}>
            Free build, friendly team, no surprises. We&apos;ll have your new site
            live in a week.
          </p>
          <Link
            href="/questionnaire"
            className="inline-flex items-center gap-2 text-white px-8 py-4 rounded-full font-semibold transition hover:opacity-90"
            style={{ backgroundColor: CORAL }}
          >
            Get my free website
            <ArrowRight className="h-4 w-4" />
          </Link>
          <p className="mt-4 text-sm" style={{ color: "#8a8278" }}>
            <Zap className="h-3 w-3 inline mr-1" />
            Free build · Cancel anytime · Real humans on support
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-10" style={{ borderColor: "#ebe4d4" }}>
        <div className="max-w-6xl mx-auto px-6 text-center text-sm" style={{ color: "#8a8278" }}>
          © {new Date().getFullYear()} Simple Growth Solutions. Made for small business, by small business.
        </div>
      </footer>
    </div>
  );
}

// Helper used in the audit teaser
function Score({ label, score, color }: { label: string; score: number; color: string }) {
  return (
    <div>
      <div className="flex justify-between text-xs font-medium mb-1">
        <span style={{ color: "#5d574d" }}>{label}</span>
        <span style={{ color }}>{score}</span>
      </div>
      <div className="h-2 rounded-full bg-stone-100 overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${score}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}
