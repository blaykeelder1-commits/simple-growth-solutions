/* eslint-disable @next/next/no-img-element -- intentional: next/image optimizer 502s on Render; Unsplash URLs are pre-sized */
import { CheckCircle2, Calendar, Star, MapPin, Phone, ArrowRight, Dumbbell, Clock, Search, Camera } from "lucide-react";
import { RevealStyles, CrowdMeter, TourGallery } from "../_shared";

// Lake Viking Gym "The Egg" — Option 3: "Join The Egg"
// Conversion / booking-first direction. Clean, bright, sharp orange CTAs.
// Free-week offer + transparent pricing + 3-step join + local-SEO copy —
// built to turn "gym near Lake Viking" searches into members.
// Colors sampled from the customer's flag (4-pass pixel analysis).
export const metadata = {
  title: 'Preview 3 · Join The Egg — Lake Viking Gym "The Egg"',
  robots: { index: false, follow: false },
};

const ORANGE = "#F0603C";
const BLUE = "#1F468F";
const NAVY = "#0E2350";
const PHONE = "660.240.2314";
const img = (id: string, w = 1200) =>
  `https://images.unsplash.com/photo-${id}?w=${w}&q=80&auto=format&fit=crop`;

export default function JoinTheEggPreview() {
  return (
    <div className="min-h-screen bg-white text-slate-800">
      <RevealStyles />
      {/* Preview ribbon */}
      <div className="bg-slate-900 text-white text-center text-xs py-2 px-4">
        Design Preview 3 · “Join The Egg” — a sample direction for Lake Viking Gym. Final site uses your real photos &amp; details.
      </div>

      {/* Sticky offer bar */}
      <div className="text-center text-sm font-bold text-white py-2 px-4" style={{ background: ORANGE }}>
        🎟️ Your first week at The Egg is free — no card, no catch. <a href="#claim" className="underline underline-offset-2">Claim it →</a>
      </div>

      {/* Nav */}
      <header className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-xl grid place-items-center" style={{ background: ORANGE }}>
              <Dumbbell className="h-5 w-5 text-white" />
            </div>
            <div className="leading-none">
              <div className="font-black tracking-tight text-lg" style={{ color: BLUE }}>LAKE VIKING GYM</div>
              <div className="text-[10px] font-bold tracking-[0.3em] uppercase" style={{ color: ORANGE }}>The Egg</div>
            </div>
          </div>
          <nav className="hidden md:flex items-center gap-7 text-sm font-semibold text-slate-600">
            <a href="#pricing" className="hover:text-slate-900">Pricing</a>
            <a href="#how" className="hover:text-slate-900">How it works</a>
            <a href="#schedule" className="hover:text-slate-900">Schedule</a>
          </nav>
          <a href="#claim" className="rounded-full px-5 py-2.5 text-sm font-bold text-white" style={{ background: ORANGE }}>Claim Free Week</a>
        </div>
      </header>

      {/* Hero — full-bleed cinematic with floating claim card */}
      <section className="relative min-h-[88vh] flex items-center">
        <img src={img("1593079831268-3381b0db4a77", 1600)} alt="The Egg training floor" className="absolute inset-0 h-full w-full object-cover" loading="eager" fetchPriority="high" />
        <div className="absolute inset-0" style={{ background: "linear-gradient(105deg, rgba(14,35,80,0.95) 0%, rgba(14,35,80,0.82) 45%, rgba(14,35,80,0.45) 75%, rgba(14,35,80,0.2) 100%)" }} />
        <div className="relative max-w-6xl mx-auto px-6 w-full py-20 grid md:grid-cols-2 gap-10 items-center">
          <div className="text-white lv-up">
            <div className="flex items-center gap-2 text-sm text-white/80">
              <div className="flex" style={{ color: ORANGE }}>{[...Array(5)].map((_, i) => <Star key={i} className="h-4 w-4 fill-current" />)}</div>
              4.9 from Lake Viking members
            </div>
            <h1 className="mt-4 text-5xl md:text-7xl font-black leading-[0.98]">
              The gym near Lake Viking <span style={{ color: ORANGE }}>worth driving to.</span>
            </h1>
            <p className="mt-6 text-lg md:text-xl text-white/85 max-w-md">
              Modern equipment, real coaching, and classes that fit your day. Try the whole place free for 7 days — then join in under a minute.
            </p>
            <ul className="mt-7 space-y-2.5 text-white/90 text-sm">
              {["No contracts, cancel anytime", "Book classes from your phone", "Minutes from the lake"].map((x) => (
                <li key={x} className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4" style={{ color: ORANGE }} /> {x}</li>
              ))}
            </ul>
          </div>
          <form id="claim" className="bg-white rounded-3xl p-7 shadow-2xl lv-fade">
            <h3 className="font-black text-xl" style={{ color: NAVY }}>Start your free week</h3>
            <p className="text-sm text-slate-500 mt-1 mb-5">Takes 30 seconds. We&apos;ll have your pass ready.</p>
            <div className="space-y-3">
              <input className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm" placeholder="First name" />
              <input className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm" placeholder="Mobile number" />
              <input className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm" placeholder="Email" />
              <button type="button" className="w-full inline-flex items-center justify-center gap-2 rounded-xl py-3.5 font-bold text-white" style={{ background: ORANGE }}>
                Get my free week <ArrowRight className="h-5 w-5" />
              </button>
            </div>
            <p className="text-xs text-slate-400 text-center mt-3">No credit card required.</p>
          </form>
        </div>
      </section>

      {/* Quick value props */}
      <section className="max-w-6xl mx-auto px-6 py-14 grid sm:grid-cols-3 gap-6">
        {[
          { icon: Dumbbell, t: "Everything in one place", d: "Free weights, machines, cardio, and classes — no add-on fees." },
          { icon: Calendar, t: "Book in 3 taps", d: "See the schedule and reserve your spot right from your phone." },
          { icon: MapPin, t: "Right by the lake", d: "Easy to get to, easy parking, open early and late." },
        ].map(({ icon: Icon, t, d }) => (
          <div key={t} className="rounded-2xl border border-slate-100 p-6 shadow-sm">
            <div className="h-11 w-11 rounded-xl grid place-items-center mb-3" style={{ background: "#FCE8E0", color: ORANGE }}><Icon className="h-6 w-6" /></div>
            <h3 className="font-bold" style={{ color: NAVY }}>{t}</h3>
            <p className="mt-1 text-sm text-slate-500">{d}</p>
          </div>
        ))}
      </section>

      {/* Step inside — tour gallery + live-busy nudge to claim (immersion + conversion) */}
      <section className="max-w-6xl mx-auto px-6 pb-4">
        <div className="mb-8">
          <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest" style={{ color: ORANGE }}>
            <Camera className="h-4 w-4" /> Step inside
          </span>
          <h2 className="mt-2 text-3xl md:text-4xl font-black" style={{ color: NAVY }}>Take a look around</h2>
        </div>
        <div className="grid lg:grid-cols-3 gap-6 items-start">
          <div className="lg:col-span-2">
            <TourGallery
              ids={["1593079831268-3381b0db4a77", "1540497077202-7c8a3999166f", "1534438327276-14e5300c3a48", "1571902943202-507ec2618e8f", "1538805060514-97d9cc17730c"]}
              captions={["Training floor", "Cardio deck", "Free weights", "Class studio", "Easy parking"]}
            />
          </div>
          <div className="space-y-4">
            <CrowdMeter orange={ORANGE} />
            <a href="#claim" className="flex items-center justify-center gap-2 rounded-xl py-3.5 font-bold text-white" style={{ background: ORANGE }}>
              Claim your free week <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </div>
      </section>

      {/* Pricing — transparent, the star of this direction */}
      <section id="pricing" className="py-20" style={{ background: "#F7F9FC" }}>
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-black" style={{ color: NAVY }}>Straightforward pricing</h2>
            <p className="mt-3 text-slate-500">Every plan starts with a free week. No sign-up fees, ever.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {[
              { name: "Month-to-Month", price: "$39", note: "/mo", perks: ["Full gym access", "All group classes", "Cancel anytime"] },
              { name: "Annual", price: "$32", note: "/mo", perks: ["Everything monthly", "2 months free", "Guest passes"], featured: true },
              { name: "Family", price: "$89", note: "/mo", perks: ["Up to 4 members", "Kids programs", "Best per-person value"] },
            ].map((p) => (
              <div key={p.name} className={`rounded-3xl bg-white p-7 border ${p.featured ? "ring-2" : "border-slate-100 shadow-sm"}`} style={p.featured ? { borderColor: ORANGE, boxShadow: "0 20px 40px -20px rgba(240,96,60,0.5)" } : {}}>
                {p.featured && <div className="text-xs font-black uppercase tracking-wide mb-2" style={{ color: ORANGE }}>Best value</div>}
                <h3 className="font-bold text-xl" style={{ color: NAVY }}>{p.name}</h3>
                <div className="mt-3 mb-5"><span className="text-4xl font-black" style={{ color: BLUE }}>{p.price}</span><span className="text-slate-400">{p.note}</span></div>
                <ul className="space-y-2 mb-6">
                  {p.perks.map((perk) => (
                    <li key={perk} className="flex items-center gap-2 text-sm text-slate-600"><CheckCircle2 className="h-4 w-4" style={{ color: ORANGE }} /> {perk}</li>
                  ))}
                </ul>
                <a href="#claim" className={`block text-center rounded-full py-3 font-bold ${p.featured ? "text-white" : "border-2"}`} style={p.featured ? { background: ORANGE } : { color: BLUE, borderColor: BLUE }}>Start free week</a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works — 3 steps */}
      <section id="how" className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-black" style={{ color: NAVY }}>Joining is easy</h2>
          <p className="mt-3 text-slate-500">From curious to crushing it in three steps.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { n: "1", t: "Claim your free week", d: "Fill the form — we'll have your pass ready when you walk in." },
            { n: "2", t: "Come train", d: "Use the whole gym and try any class. Coaches will show you around." },
            { n: "3", t: "Join in a minute", d: "Love it? Pick a plan on your phone and you're in. No paperwork." },
          ].map((s) => (
            <div key={s.n} className="rounded-3xl border border-slate-100 p-7 shadow-sm relative">
              <div className="h-10 w-10 rounded-full grid place-items-center font-black text-white mb-4" style={{ background: ORANGE }}>{s.n}</div>
              <h3 className="font-bold text-lg" style={{ color: NAVY }}>{s.t}</h3>
              <p className="mt-2 text-sm text-slate-500">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Schedule preview */}
      <section id="schedule" className="py-20" style={{ background: NAVY }}>
        <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-2 gap-10 items-center">
          <img src={img("1593079831268-3381b0db4a77", 900)} alt="The Egg training floor" className="rounded-3xl h-[360px] w-full object-cover shadow-2xl" loading="lazy" />
          <div className="text-white">
            <h2 className="text-3xl md:text-4xl font-black">Classes that fit your week</h2>
            <p className="mt-3 text-white/75 max-w-sm">Spin, HIIT, yoga, strength and more — morning to night. Reserve from your phone in seconds.</p>
            <div className="mt-6 grid grid-cols-2 gap-3">
              {[
                { d: "Mon", c: "Spin", t: "6:00 AM" },
                { d: "Tue", c: "Yoga", t: "9:00 AM" },
                { d: "Wed", c: "HIIT", t: "5:30 PM" },
                { d: "Thu", c: "Strength", t: "6:00 PM" },
              ].map((s) => (
                <div key={s.d} className="rounded-xl px-4 py-3 bg-white/5 border border-white/10">
                  <div className="text-xs font-bold uppercase tracking-widest" style={{ color: ORANGE }}>{s.d}</div>
                  <div className="font-bold text-white">{s.c}</div>
                  <div className="text-xs text-white/60">{s.t}</div>
                </div>
              ))}
            </div>
            <a href="#claim" className="mt-7 inline-flex items-center gap-2 rounded-full px-6 py-3 font-bold text-white" style={{ background: ORANGE }}>Start free week <ArrowRight className="h-4 w-4" /></a>
          </div>
        </div>
      </section>

      {/* Local SEO block */}
      <section className="max-w-4xl mx-auto px-6 py-16 text-center">
        <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest mb-3" style={{ color: ORANGE }}>
          <Search className="h-4 w-4" /> Searching “gym near Lake Viking”?
        </div>
        <h2 className="text-2xl md:text-3xl font-black" style={{ color: NAVY }}>The closest full gym to Lake Viking &amp; Gallatin, MO</h2>
        <p className="mt-4 text-slate-500">
          Lake Viking Gym — “The Egg” — serves the Lake Viking community and greater Gallatin area with a full
          free-weight floor, cardio, machines, and daily group classes. Whether you live on the lake year-round or
          come up for the season, you&apos;ve got a real gym minutes away. Open early, open late, no contracts.
        </p>
        <div className="mt-6 flex items-center justify-center gap-3 text-sm text-slate-600">
          <Phone className="h-4 w-4" style={{ color: ORANGE }} /> {PHONE}
          <span className="text-slate-300">·</span>
          <Clock className="h-4 w-4" style={{ color: ORANGE }} /> Open 7 days
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 text-center text-sm" style={{ background: NAVY, color: "rgba(255,255,255,0.6)" }}>
        <div className="font-black text-white tracking-tight">LAKE VIKING GYM · THE EGG</div>
        <p className="mt-2">Lake Viking, Gallatin, MO · {PHONE}</p>
        <p className="mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>Find us on Facebook: Lake Viking Gym / The Egg</p>
      </footer>
    </div>
  );
}
