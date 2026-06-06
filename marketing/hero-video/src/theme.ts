// Brand system for the SGS hero video. Cinematic-premium: near-black base,
// confident SGS blue→indigo→violet accents, heavy tight-tracked typography.
import { loadFont } from "@remotion/google-fonts/Inter";

// Only the weights the video uses — keeps rendering fast.
const { fontFamily } = loadFont("normal", {
  weights: ["500", "600", "700", "800", "900"],
  subsets: ["latin"],
  ignoreTooManyRequestsWarning: true,
});

export const FONT = fontFamily;

export const COLORS = {
  bg0: "#06060b",
  bg1: "#0b0d18",
  bg2: "#10142a",
  white: "#ffffff",
  text: "#e7e9f3",
  muted: "#8a90ad",
  faint: "#565c7a",
  blue: "#3b82f6",
  indigo: "#6366f1",
  violet: "#8b5cf6",
  emerald: "#34d399",
};

// The signature accent gradient (left→right).
export const ACCENT_GRADIENT = `linear-gradient(100deg, ${COLORS.blue}, ${COLORS.indigo} 55%, ${COLORS.violet})`;

// Premium easing — slow, confident.
export const EASE = (t: number) => 1 - Math.pow(1 - t, 3); // easeOutCubic
export const EASE_IO = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; // easeInOutCubic

export const SCENE = {
  hook: { start: 0, dur: 210 },
  promise: { start: 210, dur: 390 },
  process: { start: 600, dur: 840 },
  proof: { start: 1440, dur: 420 },
  offer: { start: 1860, dur: 390 },
};
export const TOTAL = 2250; // 75s @ 30fps
