/* eslint-disable @next/next/no-img-element -- intentional: next/image optimizer 502s on Render; Unsplash URLs are pre-sized */
import { Activity } from "lucide-react";

// Shared immersive pieces for the Lake Viking gym mockups (v3). Server-safe
// (no client hooks) — CSS-only animation so content is always visible (a JS
// failure can never blank the page), per the build blueprint's reliability rule.
// Underscore-prefixed file → a module, not a route.

const photo = (id: string, w = 1200) =>
  `https://images.unsplash.com/photo-${id}?w=${w}&q=80&auto=format&fit=crop`;

// Entrance animations: always-visible, animate in on load; respects reduced-motion.
export function RevealStyles() {
  return (
    <style>{`
      @keyframes lvUp { from { opacity: 0; transform: translateY(26px) } to { opacity: 1; transform: none } }
      @keyframes lvFade { from { opacity: 0 } to { opacity: 1 } }
      .lv-up { animation: lvUp .8s cubic-bezier(.2,.7,.2,1) both }
      .lv-fade { animation: lvFade 1.3s ease both }
      @media (prefers-reduced-motion: reduce) { .lv-up, .lv-fade { animation: none } }
    `}</style>
  );
}

// "How busy right now" — Planet Fitness Crowd Meter method. Visual capacity read
// (mocked for the mockup; real site wires live occupancy). Builds trust + nudges visits.
export function CrowdMeter({ orange, dark = false }: { orange: string; dark?: boolean }) {
  const total = 7;
  const active = 2; // ~low capacity
  return (
    <div className={`rounded-2xl p-5 ${dark ? "bg-white/5 border border-white/10" : "bg-white border border-slate-200 shadow-lg"}`}>
      <div className="flex items-center justify-between mb-3">
        <div className={`flex items-center gap-2 text-sm font-semibold ${dark ? "text-white" : "text-slate-800"}`}>
          <Activity className="h-4 w-4" style={{ color: orange }} /> How busy right now
        </div>
        <span className="text-xs font-bold px-2.5 py-0.5 rounded-full" style={{ background: `${orange}22`, color: orange }}>
          Not busy
        </span>
      </div>
      <div className="flex items-end gap-1.5 h-12">
        {Array.from({ length: total }).map((_, i) => (
          <div
            key={i}
            className="flex-1 rounded-sm lv-up"
            style={{
              height: `${28 + i * 10}%`,
              background: i < active ? orange : dark ? "rgba(255,255,255,0.12)" : "#E8ECF2",
              animationDelay: `${i * 60}ms`,
              transformOrigin: "bottom",
            }}
          />
        ))}
      </div>
      <p className={`mt-2 text-xs ${dark ? "text-white/60" : "text-slate-500"}`}>
        Great time to come in — plenty of open equipment.
      </p>
    </div>
  );
}

// "Step Inside" virtual-tour gallery — Planet Fitness virtual-tour method. A
// mosaic that lets visitors feel the space before they walk in (immersion).
export function TourGallery({
  ids,
  captions,
}: {
  ids: string[];
  captions: string[];
}) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {ids.map((id, i) => (
        <div
          key={id}
          className={`group relative overflow-hidden rounded-2xl ${i === 0 ? "col-span-2 row-span-2" : ""}`}
        >
          <img
            src={photo(id, i === 0 ? 800 : 500)}
            alt={captions[i] || "Inside The Egg"}
            className={`w-full object-cover transition-transform duration-500 group-hover:scale-110 ${i === 0 ? "h-64 md:h-[376px]" : "h-36 md:h-[182px]"}`}
            loading="lazy"
          />
          <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, transparent 45%, rgba(11,26,58,0.82) 100%)" }} />
          <span className="absolute bottom-2.5 left-3 text-xs font-bold text-white drop-shadow">{captions[i]}</span>
        </div>
      ))}
    </div>
  );
}
