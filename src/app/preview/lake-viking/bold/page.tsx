/* eslint-disable @next/next/no-img-element -- intentional: next/image optimizer 502s on Render; Unsplash URLs are pre-sized */
import { CheckCircle2, Flame, Trophy, MapPin, Phone, ArrowRight, Dumbbell, Clock, Camera } from "lucide-react";
import { RevealStyles, CrowdMeter, TourGallery } from "../_shared";

// Lake Viking Gym "The Egg" — Option 2: "Built at The Egg"
// Bold athletic direction. Deep navy/black base, blaze orange punch, big
// condensed uppercase type, dramatic real photos. High conviction, motivating.
// Colors sampled from the customer's flag (4-pass pixel analysis).
export const metadata = {
  title: 'Preview 2 · Built at The Egg — Lake Viking Gym "The Egg"',
  robots: { index: false, follow: false },
};

const ORANGE = "#F0603C";
const NAVY = "#0B1A3A";
const INK = "#070D1F";
const PHONE = "660.240.2314";
const img = (id: string, w = 1400) =>
  `https://images.unsplash.com/photo-${id}?w=${w}&q=80&auto=format&fit=crop`;

export default function BuiltAtTheEggPreview() {
  return (
    <div className="min-h-screen" style={{ background: INK, color: "#E8ECF5" }}>
      <RevealStyles />
      {/* Preview ribbon */}
      <div className="bg-black text-white/80 text-center text-xs py-2 px-4 border-b border-white/10">
        Design Preview 2 · “Built at The Egg” — a sample direction for Lake Viking Gym. Final site uses your real photos &amp; details.
      </div>

      {/* Nav */}
      <header className="sticky top-0 z-20 backdrop-blur border-b border-white/10" style={{ background: "rgba(7,13,31,0.85)" }}>
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-xl grid place-items-center" style={{ background: ORANGE }}>
              <Dumbbell className="h-5 w-5 text-white" />
            </div>
            <div className="leading-none">
              <div className="font-black tracking-tight text-white text-lg">LAKE VIKING GYM</div>
              <div className="text-[10px] font-bold tracking-[0.35em] uppercase" style={{ color: ORANGE }}>The Egg</div>
            </div>
          </div>
          <nav className="hidden md:flex items-center gap-7 text-sm font-bold uppercase tracking-wide text-white/70">
            <a href="#programs" className="hover:text-white">Programs</a>
            <a href="#coaches" className="hover:text-white">Coaches</a>
            <a href="#plans" className="hover:text-white">Join</a>
            <a href="#visit" className="hover:text-white">Visit</a>
          </nav>
          <a href="#visit" className="rounded-md px-5 py-2.5 text-sm font-black uppercase tracking-wide text-white" style={{ background: ORANGE }}>Start Free</a>
        </div>
      </header>

      {/* Hero */}
      <section className="relative">
        <img src={img("1605296867304-46d5465a13f1", 1600)} alt="Training at The Egg" className="absolute inset-0 h-full w-full object-cover" loading="eager" fetchPriority="high" />
        <div className="absolute inset-0" style={{ background: `linear-gradient(90deg, ${INK} 8%, rgba(7,13,31,0.78) 55%, rgba(7,13,31,0.35) 100%)` }} />
        <div className="relative max-w-6xl mx-auto px-6 py-24 md:py-32 lv-up">
          <span className="inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-black uppercase tracking-widest" style={{ background: ORANGE, color: "#fff" }}>
            <Flame className="h-3.5 w-3.5" /> Lake Viking · The Egg
          </span>
          <h1 className="mt-6 text-5xl md:text-7xl font-black uppercase leading-[0.95] tracking-tight text-white max-w-3xl">
            Strength is <span style={{ color: ORANGE }}>built here.</span>
          </h1>
          <p className="mt-6 text-lg text-white/75 max-w-xl">
            No fluff. No intimidation. Just iron, coaching, and a crew that shows up — the gym Lake Viking trains at when they&apos;re serious about getting stronger.
          </p>
          <div className="mt-9 flex flex-wrap gap-4">
            <a href="#visit" className="inline-flex items-center gap-2 rounded-md px-8 py-4 font-black uppercase tracking-wide text-white shadow-lg" style={{ background: ORANGE }}>
              Start Training <ArrowRight className="h-5 w-5" />
            </a>
            <a href="#plans" className="rounded-md px-8 py-4 font-black uppercase tracking-wide text-white border border-white/30 hover:bg-white/10">See Plans</a>
          </div>
        </div>
      </section>

      {/* Stat band */}
      <div style={{ background: ORANGE }}>
        <div className="max-w-6xl mx-auto px-6 py-7 grid grid-cols-3 gap-4 text-center text-white">
          {[
            { n: "5 AM", l: "Doors open" },
            { n: "20+", l: "Classes / week" },
            { n: "All", l: "Levels coached" },
          ].map((s) => (
            <div key={s.l}>
              <div className="text-3xl md:text-4xl font-black">{s.n}</div>
              <div className="text-xs font-bold uppercase tracking-widest text-white/80">{s.l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Programs */}
      <section id="programs" className="max-w-6xl mx-auto px-6 py-20">
        <h2 className="text-3xl md:text-5xl font-black uppercase text-white text-center">Pick your <span style={{ color: ORANGE }}>fight.</span></h2>
        <p className="text-center text-white/60 mt-3">Three ways to train. One crew behind you.</p>
        <div className="grid md:grid-cols-3 gap-6 mt-12">
          {[
            { t: "Strength", d: "Barbells, racks, and a program that actually adds weight to the bar.", photo: "1534438327276-14e5300c3a48", icon: Dumbbell },
            { t: "Conditioning", d: "HIIT and metcons that torch fat and build a motor — scaled to you.", photo: "1517836357463-d25dfeac3438", icon: Flame },
            { t: "Coaching", d: "Real coaches on the floor. Every rep, every session, dialed in.", photo: "1574680096145-d05b474e2155", icon: Trophy },
          ].map(({ t, d, photo, icon: Icon }) => (
            <div key={t} className="group relative rounded-2xl overflow-hidden border border-white/10">
              <img src={img(photo, 700)} alt={t} className="h-72 w-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
              <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, transparent 30%, rgba(7,13,31,0.95) 100%)" }} />
              <div className="absolute bottom-0 left-0 right-0 p-6">
                <Icon className="h-7 w-7 mb-2" style={{ color: ORANGE }} />
                <h3 className="text-xl font-black uppercase text-white">{t}</h3>
                <p className="text-sm text-white/70 mt-1">{d}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Coaches / proof */}
      <section id="coaches" className="py-20" style={{ background: NAVY }}>
        <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-2 gap-10 items-center">
          <img src={img("1581009146145-b5ef050c2e1e", 900)} alt="Coaching at The Egg" className="rounded-2xl h-[380px] w-full object-cover shadow-2xl" loading="lazy" />
          <div>
            <h2 className="text-3xl md:text-4xl font-black uppercase text-white">Coached, not just <span style={{ color: ORANGE }}>watched.</span></h2>
            <p className="mt-4 text-white/70">Walk in green or walk in strong — our coaches meet you where you are and push you past where you thought you&apos;d stop. That&apos;s the difference between a gym and The Egg.</p>
            <ul className="mt-6 space-y-3">
              {["Form checks on every lift", "Programs that progress with you", "A crew that knows your name"].map((x) => (
                <li key={x} className="flex items-center gap-3 text-white/85"><CheckCircle2 className="h-5 w-5" style={{ color: ORANGE }} /> {x}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Step inside — tour gallery + live crowd meter (immersion) */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="mb-8">
          <span className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest" style={{ color: ORANGE }}>
            <Camera className="h-4 w-4" /> Step inside
          </span>
          <h2 className="mt-2 text-3xl md:text-5xl font-black uppercase text-white">See where you&apos;ll <span style={{ color: ORANGE }}>train.</span></h2>
        </div>
        <div className="grid lg:grid-cols-3 gap-6 items-start">
          <div className="lg:col-span-2">
            <TourGallery
              ids={["1517836357463-d25dfeac3438", "1574680096145-d05b474e2155", "1581009146145-b5ef050c2e1e", "1554284126-aa88f22d8b74", "1571902943202-507ec2618e8f"]}
              captions={["The platform", "Squat racks", "Coaching floor", "Class space", "Open 5a–10p"]}
            />
          </div>
          <CrowdMeter orange={ORANGE} dark />
        </div>
      </section>

      {/* Plans */}
      <section id="plans" className="max-w-6xl mx-auto px-6 py-20">
        <h2 className="text-3xl md:text-5xl font-black uppercase text-white text-center">Lock in your <span style={{ color: ORANGE }}>spot.</span></h2>
        <p className="text-center text-white/60 mt-3">No contracts. Cancel anytime. First session&apos;s on us.</p>
        <div className="grid md:grid-cols-3 gap-6 mt-12">
          {[
            { name: "Drop-In", price: "$15", note: "/session", perks: ["Any class", "Full floor access", "Zero commitment"] },
            { name: "Unlimited", price: "$59", note: "/month", perks: ["Unlimited classes + floor", "Coaching included", "Open gym 5a–10p"], featured: true },
            { name: "Crew", price: "$99", note: "/month", perks: ["2 members", "Everything in Unlimited", "Best value"] },
          ].map((p) => (
            <div key={p.name} className="rounded-2xl p-7 border" style={p.featured ? { background: "#0E1B3D", borderColor: ORANGE, boxShadow: "0 24px 50px -24px rgba(240,96,60,0.6)" } : { background: NAVY, borderColor: "rgba(255,255,255,0.1)" }}>
              {p.featured && <div className="text-xs font-black uppercase tracking-widest mb-2" style={{ color: ORANGE }}>Most popular</div>}
              <h3 className="text-xl font-black uppercase text-white">{p.name}</h3>
              <div className="mt-3 mb-5"><span className="text-4xl font-black text-white">{p.price}</span><span className="text-white/50">{p.note}</span></div>
              <ul className="space-y-2 mb-6">
                {p.perks.map((perk) => (
                  <li key={perk} className="flex items-center gap-2 text-sm text-white/75"><CheckCircle2 className="h-4 w-4" style={{ color: ORANGE }} /> {perk}</li>
                ))}
              </ul>
              <a href="#visit" className={`block text-center rounded-md py-3 font-black uppercase tracking-wide ${p.featured ? "text-white" : "text-white border border-white/30"}`} style={p.featured ? { background: ORANGE } : {}}>Get started</a>
            </div>
          ))}
        </div>
      </section>

      {/* CTA / visit */}
      <section id="visit" className="relative">
        <img src={img("1554284126-aa88f22d8b74", 1500)} alt="The Egg crew" className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
        <div className="absolute inset-0" style={{ background: "rgba(7,13,31,0.86)" }} />
        <div className="relative max-w-6xl mx-auto px-6 py-20 grid md:grid-cols-2 gap-10">
          <div>
            <h2 className="text-3xl md:text-5xl font-black uppercase text-white">Your first session is <span style={{ color: ORANGE }}>free.</span></h2>
            <p className="mt-4 text-white/75 max-w-sm">Come throw down with us. No commitment — just show up and see why The Egg hits different.</p>
            <div className="mt-8 space-y-4 text-white/85">
              <div className="flex items-center gap-3"><MapPin className="h-5 w-5" style={{ color: ORANGE }} /> Lake Viking, Gallatin, MO</div>
              <div className="flex items-center gap-3"><Phone className="h-5 w-5" style={{ color: ORANGE }} /> {PHONE}</div>
              <div className="flex items-center gap-3"><Clock className="h-5 w-5" style={{ color: ORANGE }} /> Mon–Fri 5a–10p · Sat–Sun 7a–7p</div>
            </div>
          </div>
          <form className="rounded-2xl p-7 space-y-4 border border-white/15" style={{ background: "rgba(11,26,58,0.9)" }}>
            <h3 className="font-black uppercase text-white text-lg">Claim your free session</h3>
            <input className="w-full rounded-md px-4 py-3 text-sm text-white placeholder-white/40 border border-white/20 bg-white/5" placeholder="Your name" />
            <input className="w-full rounded-md px-4 py-3 text-sm text-white placeholder-white/40 border border-white/20 bg-white/5" placeholder="Phone or email" />
            <input className="w-full rounded-md px-4 py-3 text-sm text-white placeholder-white/40 border border-white/20 bg-white/5" placeholder="Best day to come in" />
            <button type="button" className="w-full rounded-md py-3 font-black uppercase tracking-wide text-white" style={{ background: ORANGE }}>Book my free session</button>
            <p className="text-xs text-white/50 text-center">We&apos;ll text you back within the hour.</p>
          </form>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 text-center text-sm" style={{ background: INK, color: "rgba(255,255,255,0.5)" }}>
        <div className="font-black text-white tracking-tight uppercase">Lake Viking Gym · The Egg</div>
        <p className="mt-2">Lake Viking, Gallatin, MO · {PHONE}</p>
        <p className="mt-1" style={{ color: "rgba(255,255,255,0.35)" }}>Find us on Facebook: Lake Viking Gym / The Egg</p>
      </footer>
    </div>
  );
}
