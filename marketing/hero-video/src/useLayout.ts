import { useVideoConfig } from "remotion";

// Responsive sizing so one composition reads well in both 16:9 and 9:16.
export function useLayout() {
  const { width, height } = useVideoConfig();
  const isPortrait = height > width;
  const base = isPortrait ? width * 0.092 : width * 0.058;
  return {
    width,
    height,
    isPortrait,
    h1: base * 1.12,
    h2: base,
    body: base * 0.42,
    eyebrow: base * 0.3,
    pad: isPortrait ? width * 0.08 : width * 0.1,
    contentWidth: isPortrait ? width * 0.84 : width * 0.74,
  };
}
