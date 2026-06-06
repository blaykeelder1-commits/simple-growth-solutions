import React from "react";
import { useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { COLORS, FONT, ACCENT_GRADIENT, EASE } from "../theme";

export interface Seg {
  text: string;
  accent?: boolean;
}
export type Line = Seg[];

// Cinematic headline: each word rises in with a blur-clear, staggered. Accent
// segments are filled with the brand gradient. `local` is the frame relative to
// this block's own start (use inside a <Sequence> or pass adjusted frame).
export const KineticText: React.FC<{
  lines: Line[];
  /** frame at which the animation starts (absolute) */
  start?: number;
  fontSize: number;
  weight?: number;
  lineGap?: number;
  align?: "center" | "left";
  out?: number; // frame (absolute) at which to fade the block out
}> = ({ lines, start = 0, fontSize, weight = 800, lineGap = 1.12, align = "center", out }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const local = frame - start;

  const fadeOut = out !== undefined ? interpolate(frame, [out, out + 18], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  }) : 1;

  let wordIndex = 0;
  return (
    <div
      style={{
        fontFamily: FONT,
        fontWeight: weight,
        fontSize,
        lineHeight: lineGap,
        letterSpacing: "-0.03em",
        textAlign: align,
        opacity: fadeOut,
      }}
    >
      {lines.map((line, li) => (
        <div key={li} style={{ display: "block", overflow: "hidden", paddingBottom: "0.08em" }}>
          {line.map((seg, si) => {
            const i = wordIndex++;
            const delay = i * 5;
            const s = spring({ frame: local - delay, fps, config: { damping: 200, mass: 0.7 } });
            const t = EASE(s);
            const y = (1 - t) * fontSize * 0.55;
            const blur = (1 - t) * 14;
            return (
              <span
                key={si}
                style={{
                  display: "inline-block",
                  marginRight: "0.28em",
                  transform: `translateY(${y}px)`,
                  filter: `blur(${blur}px)`,
                  opacity: t,
                  ...(seg.accent
                    ? {
                        backgroundImage: ACCENT_GRADIENT,
                        WebkitBackgroundClip: "text",
                        backgroundClip: "text",
                        color: "transparent",
                      }
                    : { color: COLORS.white }),
                }}
              >
                {seg.text}
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
};
