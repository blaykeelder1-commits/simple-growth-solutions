import { CheckCircle2, MapPin, Phone, Clock, Heart, Users, Dumbbell, Baby } from "lucide-react";

// Lake Viking Gym "The Egg" — Option A: "Community Hub"
// Warm, photo-first, family-forward. Orange accents on a friendly blue base.
// Noindex internal mockup the customer previews from their portal.
export const metadata = {
  title: 'Preview A · Community Hub — Lake Viking Gym "The Egg"',
  robots: { index: false, follow: false },
};

const BLUE = "#1f4e79";
const ORANGE = "#f47a20";

export default function CommunityHubPreview() {
  return (
    <div className="min-h-screen bg-white text-slate-800">
      {/* Preview ribbon */}
      <div className="bg-slate-900 text-white text-center text-xs py-2 px-4">
        Design Preview A · “Community Hub” — a sample direction for Lake Viking Gym. Final site uses your real photos & details.
      </div>

      {/* Nav */}
      <header className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-full grid place-items-center text-white font-bold" style={{ background: ORANGE }}>🥚</div>
            <div className="leading-tight">
              <div className="font-extrabold" style={{ color: BLUE }}>Lake Viking Gym</div>
              <div className="text-[11px] tracking-widest text-slate-400 uppercase">The Egg</div>
            </div>
          </div>
          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600">
            <a href="#offer" className="hover:text-slate-900">What We Offer</a>
            <a href="#plans" className="hover:text-slate-900">Membership</a>
            <a href="#schedule" className="hover:text-slate-900">Classes</a>
            <a href="#visit" className="hover:text-slate-900">Visit</a>
          </nav>
          <a href="#visit" className="rounded-full px-5 py-2 text-sm font-semibold text-white shadow-sm" style={{ background: ORANGE }}>
            Book a Tour
          </a>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${BLUE} 0%, #2b6cb0 100%)` }}>
        <div className="max-w-6xl mx-auto px-6 py-20 grid md:grid-cols-2 gap-10 items-center">
          <div className="text-white">
            <span className="inline-block rounded-full bg-white/15 px-3 py-1 text-xs font-medium mb-5">Your neighborhood gym at Lake Viking</span>
            <h1 className="text-4xl md:text-5xl font-extrabold leading-tight">
              Where lake families <span style={{ color: "#ffd29c" }}>get strong together.</span>
            </h1>
            <p className="mt-5 text-white/85 text-lg max-w-md">
              Friendly faces, room to move, and classes for every age — all just minutes from the water. Come see why “The Egg” feels like home.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="#visit" className="rounded-full px-6 py-3 font-semibold text-white shadow-lg" style={{ background: ORANGE }}>Book a Free Tour</a>
              <a href="#plans" className="rounded-full px-6 py-3 font-semibold bg-white/10 text-white border border-white/30">See Membership</a>
            </div>
          </div>
          {/* Photo placeholder collage */}
          <div className="grid grid-cols-2 gap-3">
            {["Gym floor", "Group class", "Free weights", "The lake"].map((label, i) => (
              <div key={label} className={`rounded-2xl h-40 grid place-items-center text-white/70 text-sm font-medium ${i % 2 ? "bg-white/15" : "bg-white/10"} border border-white/15`}>
                📷 {label}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust strip */}
      <div className="border-y border-slate-100 bg-orange-50/40">
        <div className="max-w-6xl mx-auto px-6 py-5 flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-sm text-slate-600">
          <span className="flex items-center gap-2"><Heart className="h-4 w-4" style={{ color: ORANGE }} /> Family-owned</span>
          <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4" style={{ color: ORANGE }} /> All fitness levels welcome</span>
          <span className="flex items-center gap-2"><Clock className="h-4 w-4" style={{ color: ORANGE }} /> Open early & late</span>
          <span className="flex items-center gap-2"><Baby className="h-4 w-4" style={{ color: ORANGE }} /> Kids & teens programs</span>
        </div>
      </div>

      {/* Offer */}
      <section id="offer" className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-3xl font-extrabold" style={{ color: BLUE }}>Everything you need under one roof</h2>
          <p className="mt-3 text-slate-500">From your first push-up to your strongest year yet.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { icon: Dumbbell, t: "Strength & Cardio", d: "Full free-weight area, machines, and cardio with a view." },
            { icon: Users, t: "Group Classes", d: "Spin, HIIT, yoga and more — beginner-friendly, always." },
            { icon: Baby, t: "Family & Kids", d: "Youth strength, summer programs, and family memberships." },
          ].map(({ icon: Icon, t, d }) => (
            <div key={t} className="rounded-3xl border border-slate-100 p-7 shadow-sm hover:shadow-md transition-shadow">
              <div className="h-12 w-12 rounded-2xl grid place-items-center mb-4" style={{ background: "#eaf1f8" }}>
                <Icon className="h-6 w-6" style={{ color: BLUE }} />
              </div>
              <h3 className="font-bold text-lg text-slate-900">{t}</h3>
              <p className="mt-2 text-slate-500 text-sm">{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Membership */}
      <section id="plans" className="bg-slate-50 py-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-extrabold" style={{ color: BLUE }}>Simple membership</h2>
            <p className="mt-3 text-slate-500">No contracts. Cancel anytime. Family rates available.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { name: "Day Pass", price: "$10", note: "/visit", perks: ["Full gym access", "Try any class", "No commitment"] },
              { name: "Monthly", price: "$39", note: "/month", perks: ["Unlimited access", "All group classes", "Bring a guest 1×/mo"], featured: true },
              { name: "Family", price: "$89", note: "/month", perks: ["Up to 4 members", "Kids programs included", "Best value"] },
            ].map((p) => (
              <div key={p.name} className={`rounded-3xl bg-white p-7 border ${p.featured ? "border-orange-300 ring-2 ring-orange-100 shadow-lg" : "border-slate-100 shadow-sm"}`}>
                {p.featured && <div className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: ORANGE }}>Most popular</div>}
                <h3 className="font-bold text-xl text-slate-900">{p.name}</h3>
                <div className="mt-3 mb-5"><span className="text-4xl font-extrabold" style={{ color: BLUE }}>{p.price}</span><span className="text-slate-400">{p.note}</span></div>
                <ul className="space-y-2 mb-6">
                  {p.perks.map((perk) => (
                    <li key={perk} className="flex items-center gap-2 text-sm text-slate-600"><CheckCircle2 className="h-4 w-4" style={{ color: ORANGE }} /> {perk}</li>
                  ))}
                </ul>
                <a href="#visit" className={`block text-center rounded-full py-3 font-semibold ${p.featured ? "text-white" : "border"}`} style={p.featured ? { background: ORANGE } : { color: BLUE, borderColor: BLUE }}>Get started</a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Schedule strip */}
      <section id="schedule" className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-extrabold" style={{ color: BLUE }}>This week at The Egg</h2>
          <p className="mt-3 text-slate-500">Reserve your spot online — classes fill up fast.</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { d: "Mon", c: "Spin", t: "6:00 AM" },
            { d: "Tue", c: "Yoga Flow", t: "9:00 AM" },
            { d: "Wed", c: "HIIT", t: "5:30 PM" },
            { d: "Thu", c: "Strength 101", t: "6:00 PM" },
          ].map((s) => (
            <div key={s.d} className="rounded-2xl border border-slate-100 p-5 text-center shadow-sm">
              <div className="text-xs font-bold uppercase tracking-widest text-slate-400">{s.d}</div>
              <div className="mt-1 font-bold text-slate-900">{s.c}</div>
              <div className="text-sm text-slate-500">{s.t}</div>
              <a href="#visit" className="mt-3 inline-block text-sm font-semibold" style={{ color: ORANGE }}>Reserve →</a>
            </div>
          ))}
        </div>
      </section>

      {/* Visit + contact */}
      <section id="visit" className="py-20" style={{ background: `linear-gradient(135deg, ${BLUE} 0%, #2b6cb0 100%)` }}>
        <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-2 gap-10">
          <div className="text-white">
            <h2 className="text-3xl font-extrabold">Come see The Egg</h2>
            <p className="mt-3 text-white/80 max-w-sm">Book a free tour or just stop by. We&apos;ll show you around and find the right fit for you and your family.</p>
            <div className="mt-8 space-y-4 text-white/90">
              <div className="flex items-center gap-3"><MapPin className="h-5 w-5" style={{ color: "#ffd29c" }} /> Lake Viking, Gallatin, MO</div>
              <div className="flex items-center gap-3"><Phone className="h-5 w-5" style={{ color: "#ffd29c" }} /> (816) 617-5423</div>
              <div className="flex items-center gap-3"><Clock className="h-5 w-5" style={{ color: "#ffd29c" }} /> Mon–Fri 5a–9p · Sat–Sun 7a–7p</div>
            </div>
          </div>
          <form className="bg-white rounded-3xl p-7 shadow-xl space-y-4">
            <h3 className="font-bold text-lg text-slate-900">Book a free tour</h3>
            <input className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm" placeholder="Your name" />
            <input className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm" placeholder="Phone or email" />
            <input className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm" placeholder="Best day/time to visit" />
            <textarea className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm" rows={3} placeholder="Anything we should know?" />
            <button type="button" className="w-full rounded-full py-3 font-semibold text-white" style={{ background: ORANGE }}>Request my tour</button>
            <p className="text-xs text-slate-400 text-center">We&apos;ll reach out within one business day.</p>
          </form>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-10 text-center text-sm">
        <div className="font-bold text-white">Lake Viking Gym · The Egg</div>
        <p className="mt-2">Lake Viking, Gallatin, MO · (816) 617-5423</p>
        <p className="mt-1 text-slate-500">Find us on Facebook: Lake Viking Gym / The Egg</p>
      </footer>
    </div>
  );
}
