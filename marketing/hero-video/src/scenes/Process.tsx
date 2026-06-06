import React from "react";
import { AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { BrowserFrame } from "../components/BrowserFrame";
import { KineticText } from "../components/KineticText";
import { useLayout } from "../useLayout";
import { COLORS, FONT, ACCENT_GRADIENT, EASE } from "../theme";

const STEP_DUR = 280;

// ── Motifs ─────────────────────────────────────────────────────────────────

// Step 1 — a questionnaire whose fields fill themselves in.
const FormMotif: React.FC<{ w: number }> = ({ w }) => {
  const frame = useCurrentFrame();
  const rows = [
    { label: "Business name", value: "Cedar & Co. Landscaping" },
    { label: "What you do", value: "Lawn care · design · cleanup" },
    { label: "Your customers", value: "Homeowners near the coast" },
  ];
  return (
    <div style={{ width: w, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 18, padding: w * 0.06, boxShadow: "0 40px 120px rgba(0,0,0,0.5)" }}>
      {rows.map((r, i) => {
        const t = EASE(Math.min(1, Math.max(0, (frame - 30 - i * 40) / 30)));
        const chars = Math.floor(r.value.length * t);
        return (
          <div key={i} style={{ marginBottom: w * 0.045 }}>
            <div style={{ fontFamily: FONT, fontSize: w * 0.032, color: COLORS.muted, marginBottom: 8 }}>{r.label}</div>
            <div style={{ fontFamily: FONT, fontSize: w * 0.045, color: COLORS.white, fontWeight: 600, height: w * 0.058, borderBottom: "2px solid rgba(255,255,255,0.12)", paddingBottom: 6 }}>
              {r.value.slice(0, chars)}
              <span style={{ opacity: t < 1 ? 0.8 : 0, color: COLORS.violet }}>|</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// Step 2 — a site assembling inside a browser frame.
const BuildMotif: React.FC<{ w: number; domain: string }> = ({ w, domain }) => {
  const frame = useCurrentFrame();
  const blk = (delay: number) => EASE(Math.min(1, Math.max(0, (frame - delay) / 22)));
  return (
    <BrowserFrame width={w} domain={domain} glow={blk(40)}>
      <div style={{ position: "absolute", inset: 0, background: `linear-gradient(160deg, ${COLORS.bg2}, ${COLORS.bg0})`, padding: w * 0.05 }}>
        {/* nav */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", opacity: blk(20), transform: `translateY(${(1 - blk(20)) * -12}px)` }}>
          <div style={{ width: w * 0.16, height: w * 0.03, borderRadius: 99, background: ACCENT_GRADIENT }} />
          <div style={{ display: "flex", gap: w * 0.02 }}>
            {[0, 1, 2].map((i) => <div key={i} style={{ width: w * 0.06, height: w * 0.022, borderRadius: 99, background: "rgba(255,255,255,0.18)" }} />)}
          </div>
        </div>
        {/* hero block */}
        <div style={{ marginTop: w * 0.05, opacity: blk(55), transform: `scale(${0.96 + blk(55) * 0.04})` }}>
          <div style={{ width: "72%", height: w * 0.05, borderRadius: 8, background: "rgba(255,255,255,0.9)" }} />
          <div style={{ width: "55%", height: w * 0.05, borderRadius: 8, background: ACCENT_GRADIENT, marginTop: 10 }} />
          <div style={{ width: "40%", height: w * 0.024, borderRadius: 8, background: "rgba(255,255,255,0.3)", marginTop: 16 }} />
          <div style={{ width: w * 0.2, height: w * 0.05, borderRadius: 10, background: ACCENT_GRADIENT, marginTop: 20 }} />
        </div>
        {/* cards */}
        <div style={{ display: "flex", gap: w * 0.03, marginTop: w * 0.05, opacity: blk(90), transform: `translateY(${(1 - blk(90)) * 16}px)` }}>
          {[0, 1, 2].map((i) => <div key={i} style={{ flex: 1, height: w * 0.11, borderRadius: 12, background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)" }} />)}
        </div>
      </div>
    </BrowserFrame>
  );
};

// Step 3 — hosting/security/edits handled, status chips light up.
const RunMotif: React.FC<{ w: number }> = ({ w }) => {
  const frame = useCurrentFrame();
  const chips = [
    { label: "Online · 99.9% uptime", c: COLORS.emerald },
    { label: "SSL secured", c: COLORS.blue },
    { label: "Edits handled for you", c: COLORS.violet },
    { label: "Always up to date", c: COLORS.indigo },
  ];
  return (
    <div style={{ width: w, display: "flex", flexDirection: "column", gap: w * 0.035 }}>
      {chips.map((ch, i) => {
        const t = EASE(Math.min(1, Math.max(0, (frame - 24 - i * 28) / 24)));
        return (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: w * 0.03, padding: `${w * 0.035}px ${w * 0.045}px`, borderRadius: 14, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", opacity: t, transform: `translateX(${(1 - t) * 28}px)`, boxShadow: `0 0 ${30 * t}px ${ch.c}22` }}>
            <span style={{ width: w * 0.03, height: w * 0.03, borderRadius: 99, background: ch.c, boxShadow: `0 0 16px ${ch.c}` }} />
            <span style={{ fontFamily: FONT, fontSize: w * 0.042, color: COLORS.white, fontWeight: 600 }}>{ch.label}</span>
          </div>
        );
      })}
    </div>
  );
};

// ── A single step (text + motif), responsive ────────────────────────────────

const Step: React.FC<{ n: string; title: string; accent: string; desc: string; motif: React.ReactNode }> = ({ n, title, accent, desc, motif }) => {
  const L = useLayout();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const intro = spring({ frame, fps, config: { damping: 200 } });
  const outro = interpolate(frame, [STEP_DUR - 22, STEP_DUR - 2], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const op = Math.min(intro, outro);

  const text = (
    <div style={{ flex: L.isPortrait ? "none" : 1, opacity: op }}>
      <div style={{ fontFamily: FONT, fontWeight: 900, fontSize: L.h1 * 1.1, lineHeight: 1, backgroundImage: ACCENT_GRADIENT, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent", letterSpacing: "-0.04em" }}>{n}</div>
      <div style={{ marginTop: L.h2 * 0.2 }}>
        <KineticText start={6} fontSize={L.h2} weight={800} align="left" lines={[[{ text: title }, { text: accent, accent: true }]]} />
      </div>
      <div style={{ marginTop: L.body * 0.7, fontFamily: FONT, fontSize: L.body, color: COLORS.muted, maxWidth: L.isPortrait ? "100%" : L.width * 0.32, lineHeight: 1.4, opacity: interpolate(frame, [18, 36], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) }}>{desc}</div>
    </div>
  );

  const mot = <div style={{ flex: L.isPortrait ? "none" : 1.15, display: "flex", justifyContent: "center", opacity: op }}>{motif}</div>;

  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", padding: L.pad }}>
      <div style={{ width: L.contentWidth, display: "flex", flexDirection: L.isPortrait ? "column" : "row", alignItems: "center", gap: L.isPortrait ? L.h2 * 0.6 : L.width * 0.04 }}>
        {text}
        {mot}
      </div>
    </AbsoluteFill>
  );
};

// ── The process scene ────────────────────────────────────────────────────────

export const Process: React.FC = () => {
  const L = useLayout();
  const motifW = L.isPortrait ? L.contentWidth : L.width * 0.4;
  return (
    <AbsoluteFill>
      <Sequence durationInFrames={STEP_DUR}>
        <Step n="01" title="Tell us about " accent="your business." desc="A two-minute questionnaire. We learn what you do and who you serve — that's the only work on your end." motif={<FormMotif w={motifW} />} />
      </Sequence>
      <Sequence from={STEP_DUR} durationInFrames={STEP_DUR}>
        <Step n="02" title="We design and " accent="build it." desc="Our team creates a professional, mobile-ready website for your business — and you review it before anything goes live." motif={<BuildMotif w={motifW} domain="yourbusiness.com" />} />
      </Sequence>
      <Sequence from={STEP_DUR * 2} durationInFrames={STEP_DUR}>
        <Step n="03" title="We host, secure, and " accent="run it." desc="Hosting, security, updates, and edits — handled forever. Need a change? Send a request; we take care of it." motif={<RunMotif w={motifW} />} />
      </Sequence>
    </AbsoluteFill>
  );
};
