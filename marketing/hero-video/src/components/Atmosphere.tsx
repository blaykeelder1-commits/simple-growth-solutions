import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { COLORS } from "../theme";

// The cinematic backdrop behind every scene: deep gradient, two slowly drifting
// brand-colored glows, fine film grain, and a vignette. Gives the whole piece a
// premium, unified atmosphere.
export const Atmosphere: React.FC<{ intensity?: number }> = ({ intensity = 1 }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  const driftA = interpolate(frame, [0, 2250], [0, 1]);
  const ax = width * (0.25 + Math.sin(driftA * Math.PI * 2) * 0.12);
  const ay = height * (0.3 + Math.cos(driftA * Math.PI * 2) * 0.1);
  const bx = width * (0.75 + Math.cos(driftA * Math.PI * 2) * 0.1);
  const by = height * (0.7 + Math.sin(driftA * Math.PI * 2) * 0.12);

  return (
    <AbsoluteFill>
      <AbsoluteFill
        style={{
          background: `radial-gradient(1200px 900px at 50% -10%, ${COLORS.bg2}, ${COLORS.bg1} 45%, ${COLORS.bg0} 100%)`,
        }}
      />
      {/* Drifting brand glows */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(600px 600px at ${ax}px ${ay}px, rgba(59,130,246,${0.22 * intensity}), transparent 70%)`,
          filter: "blur(20px)",
        }}
      />
      <AbsoluteFill
        style={{
          background: `radial-gradient(640px 640px at ${bx}px ${by}px, rgba(139,92,246,${0.2 * intensity}), transparent 70%)`,
          filter: "blur(24px)",
        }}
      />
      {/* Subtle top sheen */}
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.05), transparent 22%)",
        }}
      />
      {/* Grain */}
      <AbsoluteFill style={{ opacity: 0.06, mixBlendMode: "overlay" }}>
        <svg width="100%" height="100%">
          <filter id="grain">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" />
          </filter>
          <rect width="100%" height="100%" filter="url(#grain)" />
        </svg>
      </AbsoluteFill>
      {/* Vignette */}
      <AbsoluteFill
        style={{
          boxShadow: "inset 0 0 320px 80px rgba(0,0,0,0.85)",
        }}
      />
    </AbsoluteFill>
  );
};
