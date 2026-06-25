import { CheckCircle2, Flame, Trophy, MapPin, Phone, ArrowRight, Dumbbell } from "lucide-react";

// Lake Viking Gym "The Egg" — Option C: "Bold & Energetic"
// High-energy, high-contrast athletic brand. Bold orange on deep blue/near-black.
// Noindex internal mockup the customer previews from their portal.
export const metadata = {
  title: 'Preview C · Bold & Energetic — Lake Viking Gym "The Egg"',
  robots: { index: false, follow: false },
};

const BLUE = "#0d2a4a";
const ORANGE = "#ff7a18";

export default function BoldPreview() {
  return (
    <div className="min-h-screen text-white" style={{ background: "#08182b" }}>
      <div className="bg-black text-white/70 text-center text-xs py-2 px-4">
        Design Preview C · “Bold &amp; Energetic” — a sample direction for Lake Viking Gym. Final site uses your real photos &amp; details.
      </div>

      {/* Nav */}
      <header className="sticky top-0 z-20 backdrop-blur border-b border-white/10" style={{ background: "rgba(8,24,43,0.85)" }}>
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg grid place-items-center font-black text-black" style={{ background: ORANGE }}>🥚</div>
            <span className="font-black tracking-tight uppercase">Lake Viking Gym</span>
          </div>
          <nav className="hidden md:flex items-center gap-7 text-sm font-bold uppercase tracking-wide text-white/70">
            <a href="#programs" className="hover:text-white">Programs</a>
            <a href="#coaches" className="hover:text-white">Coaches</a>
            <a href="#join" className="hover:text-white">Join</a>
          </nav>
          <a href="#join" className="rounded-lg px-5 py-2 text-sm font-black uppercase text-black" style={{ background: ORANGE }}>Start Now</a>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full blur-3xl opacity-30" style={{ background: ORANGE }} />
        <div className="max-w-6xl mx-auto px-6 py-24 relative">
          <span className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest mb-6" style={{ color: ORANGE }}>
            <Flame className="h-4 w-4" /> The Egg · Lake Viking
          </span>
          <h1 className="text-5xl md:text-7xl font-black uppercase leading-[0.95] max-w-3xl">
            Train hard.<br /><span style={{ color: ORANGE }}>Lake life.</span>
          </h1>
          <p className="mt-6 text-lg text-white/70 max-w-lg">
            The strongest little gym on the water. Real iron, real coaches, real results — for everyone from first-timers to lake-season athletes.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <a href="#join" className="rounded-lg px-7 py-3.5 font-black uppercase text-black shadow-lg" style={{ background: ORANGE }}>
              Claim a free week <ArrowRight className="inline h-4 w-4 ml-1" />
            </a>
            <a href="#programs" className="rounded-lg px-7 py-3.5 font-bold uppercase border border-white/20 text-white/90">See programs</a>
          </div>
          <div className="mt-12 flex flex-wrap gap-x-10 gap-y-3 text-sm font-bold uppercase tracking-wide text-white/50">
            <span>💪 Strength</span><span>🔥 HIIT</span><span>🚴 Spin</span><span>🧘 Yoga</span><span>👨‍👩‍👧 Family</span>
          </div>
        </div>
      </section>

      {/* Programs */}
      <section id="programs" className="py-20" style={{ background: BLUE }}>
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl md:text-4xl font-black uppercase mb-10">Pick your <span style={{ color: ORANGE }}>program</span></h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: Dumbbell, t: "Strength", d: "Barbells, racks, and coaching to actually get stronger." },
              { icon: Flame, t: "Conditioning", d: "HIIT and spin that torch calories and build engine." },
              { icon: Trophy, t: "Youth Athletics", d: "Speed, strength & confidence for lake-area kids and teens." },
            ].map(({ icon: Icon, t, d }) => (
              <div key={t} className="rounded-3xl p-7 border border-white/10 hover:border-white/25 transition-colors" style={{ background: "#0b2138" }}>
                <Icon className="h-8 w-8 mb-4" style={{ color: ORANGE }} />
                <h3 className="font-black uppercase text-xl">{t}</h3>
                <p className="mt-2 text-white/60 text-sm">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Coaches */}
      <section id="coaches" className="max-w-6xl mx-auto px-6 py-20">
        <h2 className="text-3xl md:text-4xl font-black uppercase mb-10">Your <span style={{ color: ORANGE }}>coaches</span></h2>
        <div className="grid sm:grid-cols-3 gap-6">
          {["Coach A", "Coach B", "Coach C"].map((c) => (
            <div key={c} className="rounded-3xl overflow-hidden border border-white/10">
              <div className="h-52 grid place-items-center text-white/40 text-sm" style={{ background: "#0b2138" }}>📷 Coach photo</div>
              <div className="p-5">
                <div className="font-black uppercase">{c}</div>
                <div className="text-sm text-white/50">Strength &amp; conditioning</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Results band */}
      <section className="py-16" style={{ background: ORANGE }}>
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8 text-center text-black">
          {[["300+", "Members strong"], ["20+", "Classes weekly"], ["7", "Days a week"], ["1", "Friendly lake fam"]].map(([n, l]) => (
            <div key={l}><div className="text-4xl font-black">{n}</div><div className="text-sm font-bold uppercase tracking-wide mt-1">{l}</div></div>
          ))}
        </div>
      </section>

      {/* Join / contact */}
      <section id="join" className="py-20" style={{ background: BLUE }}>
        <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-2 gap-10 items-center">
          <div>
            <h2 className="text-3xl md:text-4xl font-black uppercase">Your free week <span style={{ color: ORANGE }}>starts now</span></h2>
            <p className="mt-4 text-white/70 max-w-sm">Drop your info and we&apos;ll get you booked for a no-pressure free week. Come lift, sweat, and meet the crew.</p>
            <ul className="mt-6 space-y-2">
              {["No contracts", "Month-to-month", "Family rates"].map((f) => (
                <li key={f} className="flex items-center gap-2 text-white/80"><CheckCircle2 className="h-4 w-4" style={{ color: ORANGE }} /> {f}</li>
              ))}
            </ul>
            <div className="mt-8 space-y-2 text-white/70 text-sm">
              <div className="flex items-center gap-2"><MapPin className="h-4 w-4" style={{ color: ORANGE }} /> Lake Viking, Gallatin, MO</div>
              <div className="flex items-center gap-2"><Phone className="h-4 w-4" style={{ color: ORANGE }} /> (816) 617-5423</div>
            </div>
          </div>
          <form className="rounded-3xl p-7 border border-white/10" style={{ background: "#0b2138" }}>
            <input className="w-full rounded-lg bg-white/5 border border-white/15 px-4 py-3 text-sm mb-3 placeholder-white/40" placeholder="Name" />
            <input className="w-full rounded-lg bg-white/5 border border-white/15 px-4 py-3 text-sm mb-3 placeholder-white/40" placeholder="Phone" />
            <input className="w-full rounded-lg bg-white/5 border border-white/15 px-4 py-3 text-sm mb-3 placeholder-white/40" placeholder="Email" />
            <textarea rows={3} className="w-full rounded-lg bg-white/5 border border-white/15 px-4 py-3 text-sm mb-4 placeholder-white/40" placeholder="Your goal" />
            <button type="button" className="w-full rounded-lg py-3.5 font-black uppercase text-black" style={{ background: ORANGE }}>Claim my free week</button>
          </form>
        </div>
      </section>

      <footer className="bg-black text-white/50 py-10 text-center text-sm">
        <div className="font-black uppercase text-white">Lake Viking Gym · The Egg</div>
        <p className="mt-2">Lake Viking, Gallatin, MO · (816) 617-5423 · Facebook: Lake Viking Gym / The Egg</p>
      </footer>
    </div>
  );
}
