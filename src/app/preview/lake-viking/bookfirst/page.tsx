import { CheckCircle2, Calendar, Star, MapPin, Phone, ArrowRight } from "lucide-react";

// Lake Viking Gym "The Egg" — Option B: "Book-First"
// Clean & conversion-led: booking is the hero, sticky CTA, local-SEO copy.
// Noindex internal mockup the customer previews from their portal.
export const metadata = {
  title: 'Preview B · Book-First — Lake Viking Gym "The Egg"',
  robots: { index: false, follow: false },
};

const BLUE = "#1f4e79";
const ORANGE = "#f47a20";

export default function BookFirstPreview() {
  return (
    <div className="min-h-screen bg-white text-slate-800">
      <div className="bg-slate-900 text-white text-center text-xs py-2 px-4">
        Design Preview B · “Book-First” — a sample direction for Lake Viking Gym. Final site uses your real photos & details.
      </div>

      {/* Sticky CTA nav */}
      <header className="sticky top-0 z-20 bg-white border-b border-slate-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg grid place-items-center text-white font-bold" style={{ background: BLUE }}>🥚</div>
            <span className="font-extrabold" style={{ color: BLUE }}>Lake Viking Gym <span className="text-slate-400 font-medium">· The Egg</span></span>
          </div>
          <a href="#book" className="rounded-lg px-5 py-2 text-sm font-bold text-white shadow" style={{ background: ORANGE }}>
            Book a Free Visit
          </a>
        </div>
      </header>

      {/* Hero with inline booking */}
      <section className="bg-slate-50 border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-6 py-16 grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <div className="inline-flex items-center gap-1 text-amber-500 mb-4">
              {[...Array(5)].map((_, i) => <Star key={i} className="h-4 w-4 fill-current" />)}
              <span className="text-slate-500 text-sm ml-2">Loved by Lake Viking locals</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold leading-tight text-slate-900">
              The gym near Lake Viking — <span style={{ color: ORANGE }}>your first visit&apos;s on us.</span>
            </h1>
            <p className="mt-5 text-lg text-slate-600 max-w-md">
              Pick a time, walk in, and try everything free. No pressure, no contracts — just a friendly gym built for families in Gallatin & the lake.
            </p>
            <ul className="mt-6 grid sm:grid-cols-2 gap-2 max-w-md">
              {["Free first visit", "Month-to-month", "Classes included", "Open early & late"].map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm text-slate-700"><CheckCircle2 className="h-4 w-4" style={{ color: ORANGE }} /> {f}</li>
              ))}
            </ul>
          </div>

          {/* Booking card */}
          <div id="book" className="bg-white rounded-3xl border border-slate-200 shadow-xl p-7">
            <div className="flex items-center gap-2 mb-1">
              <Calendar className="h-5 w-5" style={{ color: ORANGE }} />
              <h2 className="font-bold text-lg text-slate-900">Book your free visit</h2>
            </div>
            <p className="text-sm text-slate-500 mb-5">Takes 30 seconds. We&apos;ll confirm by text.</p>
            <div className="space-y-3">
              <input className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm" placeholder="Full name" />
              <input className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm" placeholder="Mobile number" />
              <div className="grid grid-cols-2 gap-3">
                <input className="rounded-xl border border-slate-200 px-4 py-3 text-sm" placeholder="Preferred day" />
                <select className="rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-500">
                  <option>Morning</option><option>Afternoon</option><option>Evening</option>
                </select>
              </div>
              <button type="button" className="w-full rounded-xl py-3.5 font-bold text-white shadow" style={{ background: ORANGE }}>
                Reserve my free visit <ArrowRight className="inline h-4 w-4 ml-1" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Value props */}
      <section className="max-w-6xl mx-auto px-6 py-16 grid md:grid-cols-3 gap-6 text-center">
        {[
          { t: "Walk in today", d: "Same-day visits welcome. Show up and we'll get you started." },
          { t: "One simple price", d: "No sign-up fees, no contracts, no surprises on your card." },
          { t: "Right in the neighborhood", d: "Minutes from the lake — skip the drive into town." },
        ].map((v) => (
          <div key={v.t} className="rounded-2xl border border-slate-100 p-7 shadow-sm">
            <h3 className="font-bold text-lg" style={{ color: BLUE }}>{v.t}</h3>
            <p className="mt-2 text-slate-500 text-sm">{v.d}</p>
          </div>
        ))}
      </section>

      {/* Pricing */}
      <section className="bg-slate-50 py-16 border-y border-slate-100">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="text-3xl font-extrabold text-center mb-10" style={{ color: BLUE }}>Join in under a minute</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { name: "Monthly", price: "$39", perks: ["Unlimited gym", "All classes"] },
              { name: "Annual", price: "$33", note: "/mo billed yearly", perks: ["2 months free", "Priority class booking"], featured: true },
              { name: "Family", price: "$89", perks: ["Up to 4 members", "Kids programs"] },
            ].map((p) => (
              <div key={p.name} className={`rounded-3xl bg-white p-7 border ${p.featured ? "border-orange-300 ring-2 ring-orange-100 shadow-lg" : "border-slate-200 shadow-sm"}`}>
                <h3 className="font-bold text-xl text-slate-900">{p.name}</h3>
                <div className="mt-3 mb-1"><span className="text-4xl font-extrabold" style={{ color: ORANGE }}>{p.price}</span></div>
                <div className="text-xs text-slate-400 mb-5">{p.note || "/month"}</div>
                <ul className="space-y-2 mb-6">
                  {p.perks.map((x) => <li key={x} className="flex items-center gap-2 text-sm text-slate-600"><CheckCircle2 className="h-4 w-4" style={{ color: ORANGE }} /> {x}</li>)}
                </ul>
                <a href="#book" className="block text-center rounded-xl py-3 font-bold text-white" style={{ background: BLUE }}>Join now</a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Classes booking list */}
      <section className="max-w-4xl mx-auto px-6 py-16">
        <h2 className="text-3xl font-extrabold text-center mb-8" style={{ color: BLUE }}>Book a class</h2>
        <div className="divide-y divide-slate-100 rounded-2xl border border-slate-100 overflow-hidden">
          {[
            { c: "Spin", t: "Mon 6:00 AM", spots: "4 spots left" },
            { c: "Yoga Flow", t: "Tue 9:00 AM", spots: "Open" },
            { c: "HIIT", t: "Wed 5:30 PM", spots: "2 spots left" },
            { c: "Strength 101", t: "Thu 6:00 PM", spots: "Open" },
          ].map((s) => (
            <div key={s.c} className="flex items-center justify-between px-6 py-4 bg-white">
              <div><div className="font-semibold text-slate-900">{s.c}</div><div className="text-sm text-slate-500">{s.t}</div></div>
              <div className="flex items-center gap-4">
                <span className="text-xs font-medium text-slate-400">{s.spots}</span>
                <a href="#book" className="rounded-lg px-4 py-2 text-sm font-semibold text-white" style={{ background: ORANGE }}>Book</a>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonial + local SEO copy */}
      <section className="bg-slate-900 text-white py-16">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <div className="flex justify-center gap-1 text-amber-400 mb-4">{[...Array(5)].map((_, i) => <Star key={i} className="h-5 w-5 fill-current" />)}</div>
          <p className="text-xl font-medium">“Closest gym to the lake and the friendliest one around. My whole family goes.”</p>
          <p className="mt-3 text-slate-400 text-sm">— A Lake Viking member</p>
          <p className="mt-10 text-slate-500 text-sm max-w-2xl mx-auto">
            Looking for a gym near Lake Viking, Gallatin, or Daviess County, MO? The Egg offers strength
            equipment, cardio, and group fitness classes for all ages — with month-to-month memberships and
            a free first visit.
          </p>
        </div>
      </section>

      <footer className="bg-white border-t border-slate-100 py-10">
        <div className="max-w-6xl mx-auto px-6 flex flex-wrap items-center justify-between gap-4 text-sm text-slate-500">
          <div className="font-bold" style={{ color: BLUE }}>Lake Viking Gym · The Egg</div>
          <div className="flex items-center gap-5">
            <span className="flex items-center gap-1"><MapPin className="h-4 w-4" /> Lake Viking, Gallatin, MO</span>
            <span className="flex items-center gap-1"><Phone className="h-4 w-4" /> (816) 617-5423</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
