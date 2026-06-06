import React from "react";
import { AbsoluteFill, useCurrentFrame, spring, useVideoConfig, interpolate } from "remotion";
import { KineticText } from "../components/KineticText";
import { Wordmark } from "../components/Wordmark";
import { useLayout } from "../useLayout";
import { COLORS, FONT, ACCENT_GRADIENT, EASE } from "../theme";

// 62–75s. The founding offer, then the call to action.
export const Offer: React.FC = () => {
  const L = useLayout();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const priceS = spring({ frame: frame - 40, fps, config: { damping: 13, mass: 0.9 } });
  const priceScale = 0.7 + EASE(Math.min(1, priceS)) * 0.3;

  // CTA phase
  const cta = frame >= 165;
  const ctaIntro = spring({ frame: frame - 172, fps, config: { damping: 200 } });
  const pill = spring({ frame: frame - 210, fps, config: { damping: 14 } });

  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", padding: L.pad }}>
      {!cta && (
        <div style={{ textAlign: "center", opacity: interpolate(frame, [150, 164], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) }}>
          <KineticText start={6} fontSize={L.h2} weight={700} align="center" lines={[[{ text: "Founding" }, { text: "members" }, { text: "lock" }, { text: "in" }]]} />
          <div style={{ marginTop: L.h1 * 0.1, fontFamily: FONT, fontWeight: 900, fontSize: L.h1 * 1.6, lineHeight: 1, letterSpacing: "-0.04em", transform: `scale(${priceScale})`, opacity: Math.min(1, Math.max(0, (frame - 36) / 12)), backgroundImage: ACCENT_GRADIENT, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent", textShadow: "0 20px 80px rgba(99,102,241,0.4)" }}>
            $29<span style={{ fontSize: L.h1 * 0.5 }}>/mo</span>
          </div>
          <div style={{ marginTop: L.body * 0.6, fontFamily: FONT, fontSize: L.body, color: COLORS.muted, opacity: Math.min(1, Math.max(0, (frame - 70) / 18)) }}>
            for your first 3 months, then $49. Locked while you&apos;re a founding member.
          </div>
        </div>
      )}

      {cta && (
        <div style={{ textAlign: "center", opacity: ctaIntro }}>
          <div style={{ display: "flex", justifyContent: "center", transform: `translateY(${(1 - ctaIntro) * 20}px)` }}>
            <Wordmark size={L.isPortrait ? 1.1 : 1.3} stacked={L.isPortrait} />
          </div>
          <div style={{ marginTop: L.h2 * 0.5 }}>
            <KineticText start={180} fontSize={L.h2 * 1.05} weight={800} align="center" lines={[[{ text: "Get" }, { text: "your" }, { text: "free", accent: true }, { text: "website." }]]} />
          </div>
          <div
            style={{
              marginTop: L.body * 1.1,
              display: "inline-flex",
              alignItems: "center",
              gap: 12,
              padding: `${L.body * 0.55}px ${L.body * 1.1}px`,
              borderRadius: 999,
              background: ACCENT_GRADIENT,
              color: "#fff",
              fontFamily: FONT,
              fontWeight: 700,
              fontSize: L.body * 1.05,
              transform: `scale(${0.85 + EASE(Math.min(1, pill)) * 0.15})`,
              opacity: Math.min(1, pill * 1.3),
              boxShadow: "0 24px 70px rgba(99,102,241,0.5)",
            }}
          >
            simple-growth-solution.com
          </div>
        </div>
      )}
    </AbsoluteFill>
  );
};
