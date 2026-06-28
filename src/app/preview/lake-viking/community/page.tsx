/* eslint-disable @next/next/no-img-element -- intentional: next/image optimizer 502s on Render; Unsplash URLs are pre-sized */
import { CheckCircle2, MapPin, Phone, Clock, Heart, Users, Dumbbell, Baby, Star } from "lucide-react";

// Lake Viking Gym "The Egg" — Option 1: "Hometown Strong"
// Community / family direction. Warm cream base, the real flag colors:
// blaze orange + royal blue. Photo-first, welcoming, built around belonging.
// Noindex internal mockup the customer previews from their portal.
export const metadata = {
  title: 'Preview 1 · Hometown Strong — Lake Viking Gym "The Egg"',
  robots: { index: false, follow: false },
};

// Brand colors sampled directly from the customer's flag (4-pass pixel analysis).
const ORANGE = "#F0603C"; // blaze orange field
const BLUE = "#1F468F"; // royal wordmark blue
const NAVY = "#0E2350"; // deep contrast navy
const CREAM = "#FFF8F4";
const PHONE = "660.240.2314";
const img = (id: string, w = 1200) =>
  `https://images.unsplash.com/photo-${id}?w=${w}&q=80&auto=format&fit=crop`;

function EggMark({ light = false }: { light?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="h-10 w-10 rounded-xl grid place-items-center shadow-sm" style={{ background: ORANGE }}>
        <Dumbbell className="h-5 w-5 text-white" />
      </div>
      <div className="leading-tight">
        <div className="font-black tracking-tight" style={{ color: light ? "#fff" : BLUE }}>LAKE VIKING GYM</div>
        <div className="text-[10px] font-bold tracking-[0.3em] uppercase" style={{ color: ORANGE }}>The Egg</div>
      </div>
    </div>
  );
}

export default function HometownStrongPreview() {
  return (
    <div className="min-h-screen" style={{ background: CREAM, color: "#23262F" }}>
      {/* Preview ribbon */}
      <div className="bg-slate-900 text-white text-center text-xs py-2 px-4">
        Design Preview 1 · “Hometown Strong” — a sample direction for Lake Viking Gym. Final site uses your real photos &amp; details.
      </div>

      {/* Nav */}
      <header className="sticky top-0 z-20 bg-white/90 backdrop-blur border-b border-orange-100">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <EggMark />
          <nav className="hidden md:flex items-center gap-7 text-sm font-semibold text-slate-600">
            <a href="#offer" className="hover:text-slate-900">What We Offer</a>
            <a href="#plans" className="hover:text-slate-900">Membership</a>
            <a href="#schedule" className="hover:text-slate-900">Classes</a>
            <a href="#visit" className="hover:text-slate-900">Visit</a>
          </nav>
          <a href="#visit" className="rounded-full px-5 py-2.5 text-sm font-bold text-white shadow-sm" style={{ background: ORANGE }}>Book a Free Tour</a>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="max-w-6xl mx-auto px-6 py-16 md:py-20 grid md:grid-cols-2 gap-10 items-center">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide" style={{ background: "#FCE8E0", color: ORANGE }}>
              <Heart className="h-3.5 w-3.5" /> Your neighborhood gym at Lake Viking
            </span>
            <h1 className="mt-5 text-4xl md:text-6xl font-black leading-[1.05]" style={{ color: NAVY }}>
              Lake Viking gets <span style={{ color: ORANGE }}>strong together.</span>
            </h1>
            <p className="mt-5 text-lg text-slate-600 max-w-md">
              Real equipment, real neighbors, real results — minutes from the water. No pressure, no judgment. Just a place that feels like home the day you walk in.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="#visit" className="rounded-full px-7 py-3.5 font-bold text-white shadow-lg" style={{ background: ORANGE }}>Book a Free Tour</a>
              <a href="#plans" className="rounded-full px-7 py-3.5 font-bold border-2" style={{ color: BLUE, borderColor: BLUE }}>See Membership</a>
            </div>
            <div className="mt-6 flex items-center gap-2 text-sm text-slate-500">
              <div className="flex" style={{ color: ORANGE }}>{[...Array(5)].map((_, i) => <Star key={i} className="h-4 w-4 fill-current" />)}</div>
              Loved by Lake Viking families
            </div>
          </div>
          <div className="relative">
            <img src={img("1534438327276-14e5300c3a48", 900)} alt="Inside The Egg — the gym floor" className="rounded-3xl w-full h-[420px] object-cover shadow-2xl" loading="eager" fetchPriority="high" />
            <div className="absolute -bottom-5 -left-5 hidden sm:block rounded-2xl bg-white shadow-xl px-5 py-4 border border-orange-100">
              <div className="text-2xl font-black" style={{ color: BLUE }}>200+</div>
              <div className="text-xs text-slate-500 font-medium">members &amp; growing</div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust strip */}
      <div className="border-y border-orange-100" style={{ background: "#FCEFE9" }}>
        <div className="max-w-6xl mx-auto px-6 py-5 flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-sm font-medium text-slate-700">
          <span className="flex items-center gap-2"><Heart className="h-4 w-4" style={{ color: ORANGE }} /> Family-owned</span>
          <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4" style={{ color: ORANGE }} /> All levels welcome</span>
          <span className="flex items-center gap-2"><Clock className="h-4 w-4" style={{ color: ORANGE }} /> Open early &amp; late</span>
          <span className="flex items-center gap-2"><Baby className="h-4 w-4" style={{ color: ORANGE }} /> Kids &amp; teen programs</span>
        </div>
      </div>

      {/* Offer */}
      <section id="offer" className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-3xl md:text-4xl font-black" style={{ color: NAVY }}>Everything you need under one roof</h2>
          <p className="mt-3 text-slate-500">From your first push-up to your strongest year yet.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { icon: Dumbbell, t: "Strength & Cardio", d: "Full free-weight area, machines, and cardio with a view of the lake.", photo: "1534438327276-14e5300c3a48" },
            { icon: Users, t: "Group Classes", d: "Spin, HIIT, yoga and bootcamp — beginner-friendly, every single day.", photo: "1554284126-aa88f22d8b74" },
            { icon: Baby, t: "Family & Kids", d: "Youth strength, summer programs, and family memberships that fit.", photo: "1538805060514-97d9cc17730c" },
          ].map(({ icon: Icon, t, d, photo }) => (
            <div key={t} className="rounded-3xl overflow-hidden bg-white border border-orange-100 shadow-sm hover:shadow-lg transition-shadow">
              <img src={img(photo, 600)} alt={t} className="h-44 w-full object-cover" loading="lazy" />
              <div className="p-7">
                <div className="h-11 w-11 rounded-2xl grid place-items-center mb-4 -mt-12 relative bg-white shadow-md" style={{ color: ORANGE }}>
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="font-bold text-lg" style={{ color: NAVY }}>{t}</h3>
                <p className="mt-2 text-slate-500 text-sm">{d}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Membership */}
      <section id="plans" className="py-20" style={{ background: "#fff" }}>
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-black" style={{ color: NAVY }}>Simple membership, no games</h2>
            <p className="mt-3 text-slate-500">No contracts. Cancel anytime. Family rates available.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { name: "Day Pass", price: "$10", note: "/visit", perks: ["Full gym access", "Try any class", "No commitment"] },
              { name: "Monthly", price: "$39", note: "/month", perks: ["Unlimited access", "All group classes", "Bring a guest 1×/mo"], featured: true },
              { name: "Family", price: "$89", note: "/month", perks: ["Up to 4 members", "Kids programs included", "Best value"] },
            ].map((p) => (
              <div key={p.name} className={`rounded-3xl bg-white p-7 border ${p.featured ? "ring-2" : "border-slate-100 shadow-sm"}`} style={p.featured ? { borderColor: ORANGE, boxShadow: "0 20px 40px -20px rgba(240,96,60,0.5)" } : {}}>
                {p.featured && <div className="text-xs font-black uppercase tracking-wide mb-2" style={{ color: ORANGE }}>Most popular</div>}
                <h3 className="font-bold text-xl" style={{ color: NAVY }}>{p.name}</h3>
                <div className="mt-3 mb-5"><span className="text-4xl font-black" style={{ color: BLUE }}>{p.price}</span><span className="text-slate-400">{p.note}</span></div>
                <ul className="space-y-2 mb-6">
                  {p.perks.map((perk) => (
                    <li key={perk} className="flex items-center gap-2 text-sm text-slate-600"><CheckCircle2 className="h-4 w-4" style={{ color: ORANGE }} /> {perk}</li>
                  ))}
                </ul>
                <a href="#visit" className={`block text-center rounded-full py-3 font-bold ${p.featured ? "text-white" : "border-2"}`} style={p.featured ? { background: ORANGE } : { color: BLUE, borderColor: BLUE }}>Get started</a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Schedule strip */}
      <section id="schedule" className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-black" style={{ color: NAVY }}>This week at The Egg</h2>
          <p className="mt-3 text-slate-500">Reserve your spot online — classes fill up fast.</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { d: "Mon", c: "Spin", t: "6:00 AM" },
            { d: "Tue", c: "Yoga Flow", t: "9:00 AM" },
            { d: "Wed", c: "HIIT", t: "5:30 PM" },
            { d: "Thu", c: "Strength 101", t: "6:00 PM" },
          ].map((s) => (
            <div key={s.d} className="rounded-2xl bg-white border border-slate-100 p-5 text-center shadow-sm">
              <div className="text-xs font-black uppercase tracking-widest" style={{ color: ORANGE }}>{s.d}</div>
              <div className="mt-1 font-bold" style={{ color: NAVY }}>{s.c}</div>
              <div className="text-sm text-slate-500">{s.t}</div>
              <a href="#visit" className="mt-3 inline-block text-sm font-bold" style={{ color: BLUE }}>Reserve →</a>
            </div>
          ))}
        </div>
      </section>

      {/* Visit + contact */}
      <section id="visit" className="py-20" style={{ background: `linear-gradient(135deg, ${NAVY} 0%, ${BLUE} 100%)` }}>
        <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-2 gap-10">
          <div className="text-white">
            <h2 className="text-3xl md:text-4xl font-black">Come see The Egg</h2>
            <p className="mt-3 text-white/80 max-w-sm">Book a free tour or just stop by. We&apos;ll show you around and find the right fit for you and your family.</p>
            <div className="mt-8 space-y-4 text-white/90">
              <div className="flex items-center gap-3"><MapPin className="h-5 w-5" style={{ color: ORANGE }} /> Lake Viking, Gallatin, MO</div>
              <div className="flex items-center gap-3"><Phone className="h-5 w-5" style={{ color: ORANGE }} /> {PHONE}</div>
              <div className="flex items-center gap-3"><Clock className="h-5 w-5" style={{ color: ORANGE }} /> Mon–Fri 5a–9p · Sat–Sun 7a–7p</div>
            </div>
          </div>
          <form className="bg-white rounded-3xl p-7 shadow-2xl space-y-4">
            <h3 className="font-bold text-lg" style={{ color: NAVY }}>Book a free tour</h3>
            <input className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm" placeholder="Your name" />
            <input className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm" placeholder="Phone or email" />
            <input className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm" placeholder="Best day/time to visit" />
            <textarea className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm" rows={3} placeholder="Anything we should know?" />
            <button type="button" className="w-full rounded-full py-3 font-bold text-white" style={{ background: ORANGE }}>Request my tour</button>
            <p className="text-xs text-slate-400 text-center">We&apos;ll reach out within one business day.</p>
          </form>
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
