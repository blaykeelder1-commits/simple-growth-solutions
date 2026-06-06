import React from "react";
import { AbsoluteFill, useCurrentFrame, spring, useVideoConfig, interpolate } from "remotion";
import { BrowserFrame } from "../components/BrowserFrame";
import { KineticText } from "../components/KineticText";
import { useLayout } from "../useLayout";
import { COLORS, FONT, EASE } from "../theme";

const SITES = [
  { domain: "wasterescuekc.com", headline: "Rent it. Fill it. We haul it.", grad: "linear-gradient(150deg,#f97316,#ea580c 55%,#292524)" },
  { domain: "rg158-venue.pages.dev", headline: "Live music. Good times.", grad: "linear-gradient(150deg,#7c3aed,#6d28d9 55%,#1e1b4b)" },
  { domain: "tiny-home-wellness…", headline: "Rest. Reset. Restore.", grad: "linear-gradient(150deg,#059669,#0f766e 55%,#0f172a)" },
  { domain: "iddisolutions.net", headline: "Smarter vending. More profit.", grad: "linear-gradient(150deg,#2563eb,#4338ca 55%,#0f172a)" },
];

const SiteCard: React.FC<{ w: number; site: (typeof SITES)[number]; delay: number }> = ({ w, site, delay }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - delay, fps, config: { damping: 200, mass: 0.8 } });
  const t = EASE(s);
  return (
    <div style={{ opacity: t, transform: `translateY(${(1 - t) * 60}px) scale(${0.92 + t * 0.08})` }}>
      <BrowserFrame width={w} domain={site.domain} glow={t}>
        <div style={{ position: "absolute", inset: 0, background: site.grad, display: "flex", alignItems: "center", justifyContent: "center", padding: w * 0.06 }}>
          <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 75% 15%, rgba(255,255,255,0.18), transparent 55%)" }} />
          <div style={{ position: "relative", fontFamily: FONT, fontWeight: 800, fontSize: w * 0.072, color: "#fff", textAlign: "center", letterSpacing: "-0.02em", textShadow: "0 6px 30px rgba(0,0,0,0.4)" }}>
            {site.headline}
          </div>
        </div>
      </BrowserFrame>
    </div>
  );
};

// 48–62s. "Real businesses. Real sites." then a wall of work.
export const Proof: React.FC = () => {
  const L = useLayout();
  const frame = useCurrentFrame();
  const titleOut = interpolate(frame, [70, 90], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const cardW = L.isPortrait ? L.contentWidth * 0.86 : L.width * 0.34;

  return (
    <AbsoluteFill>
      {/* Card grid layer (independent centering) */}
      {frame >= 80 && (
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", padding: L.pad }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: L.isPortrait ? L.width * 0.04 : L.width * 0.03, justifyContent: "center", alignItems: "center", maxWidth: L.isPortrait ? L.contentWidth : L.width * 0.78 }}>
            {SITES.slice(0, L.isPortrait ? 2 : 4).map((site, i) => (
              <SiteCard key={site.domain} w={cardW} site={site} delay={84 + i * 18} />
            ))}
          </div>
        </AbsoluteFill>
      )}
      {/* Title overlay (fades out, doesn't push the grid) */}
      {frame < 92 && (
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", padding: L.pad }}>
          <div style={{ opacity: titleOut, textAlign: "center" }}>
            <KineticText start={6} fontSize={L.h2} weight={800} align="center" lines={[[{ text: "Real" }, { text: "businesses." }], [{ text: "Real" }, { text: "sites.", accent: true }]]} />
          </div>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};
