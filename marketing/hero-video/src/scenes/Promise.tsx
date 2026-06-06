import React from "react";
import { AbsoluteFill, useCurrentFrame, spring, useVideoConfig } from "remotion";
import { KineticText } from "../components/KineticText";
import { useLayout } from "../useLayout";
import { ACCENT_GRADIENT, COLORS, FONT, EASE } from "../theme";

// 7–20s. Problem → the promise. Lands on "free."
export const Promise: React.FC = () => {
  const L = useLayout();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // "free." punch-in, starts ~frame 215
  const freeS = spring({ frame: frame - 215, fps, config: { damping: 14, mass: 0.9 } });
  const freeScale = 0.6 + EASE(Math.min(1, freeS)) * 0.4;
  const freeOpacity = Math.min(1, (frame - 210) / 12);

  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", padding: L.pad }}>
      {/* Phase 1 */}
      {frame < 165 && (
        <div style={{ width: L.contentWidth }}>
          <KineticText
            start={6}
            fontSize={L.h2}
            weight={700}
            lines={[
              [{ text: "You" }, { text: "don't" }, { text: "have" }, { text: "time" }, { text: "to" }, { text: "build" }, { text: "one." }],
            ]}
            out={150}
          />
          <div style={{ height: L.h2 * 0.2 }} />
          <KineticText
            start={40}
            fontSize={L.h2}
            weight={700}
            lines={[[{ text: "You" }, { text: "shouldn't" }, { text: "have" }, { text: "to." }]]}
            out={150}
          />
        </div>
      )}

      {/* Phase 2 — the promise */}
      {frame >= 160 && (
        <div style={{ width: L.contentWidth, textAlign: "center" }}>
          <KineticText
            start={168}
            fontSize={L.h2}
            weight={700}
            align="center"
            lines={[[{ text: "So" }, { text: "we" }, { text: "build" }, { text: "it" }, { text: "for" }, { text: "you." }]]}
          />
          <div
            style={{
              marginTop: L.h1 * 0.15,
              fontFamily: FONT,
              fontWeight: 900,
              fontSize: L.h1 * 1.5,
              letterSpacing: "-0.04em",
              lineHeight: 1,
              opacity: freeOpacity,
              transform: `scale(${freeScale})`,
              backgroundImage: ACCENT_GRADIENT,
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
              textShadow: "0 20px 80px rgba(99,102,241,0.4)",
            }}
          >
            Free.
          </div>
          <div
            style={{
              marginTop: L.body * 0.6,
              fontFamily: FONT,
              fontWeight: 500,
              fontSize: L.body,
              color: COLORS.muted,
              opacity: Math.min(1, Math.max(0, (frame - 250) / 18)),
            }}
          >
            We design and launch it at no cost. You only pay to keep it running.
          </div>
        </div>
      )}
    </AbsoluteFill>
  );
};
