import React from "react";
import { AbsoluteFill, Sequence } from "remotion";
import { Atmosphere } from "./components/Atmosphere";
import { Hook } from "./scenes/Hook";
import { Promise as PromiseScene } from "./scenes/Promise";
import { Process } from "./scenes/Process";
import { Proof } from "./scenes/Proof";
import { Offer } from "./scenes/Offer";
import { SCENE } from "./theme";

// Full 75s hero. Continuous atmosphere underneath; each scene fades its content
// so the backdrop carries the eye between beats (a clean cinematic crossfade).
export const Hero: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: "#06060b" }}>
    <Atmosphere />
    <Sequence durationInFrames={SCENE.hook.dur}>
      <Hook />
    </Sequence>
    <Sequence from={SCENE.promise.start} durationInFrames={SCENE.promise.dur}>
      <PromiseScene />
    </Sequence>
    <Sequence from={SCENE.process.start} durationInFrames={SCENE.process.dur}>
      <Process />
    </Sequence>
    <Sequence from={SCENE.proof.start} durationInFrames={SCENE.proof.dur}>
      <Proof />
    </Sequence>
    <Sequence from={SCENE.offer.start} durationInFrames={SCENE.offer.dur}>
      <Offer />
    </Sequence>
  </AbsoluteFill>
);

// 30s teaser — hook → "free." → founding offer/CTA. For Reels/TikTok/Shorts.
export const HeroShort: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: "#06060b" }}>
    <Atmosphere />
    <Sequence durationInFrames={180}>
      <Hook />
    </Sequence>
    <Sequence from={180} durationInFrames={330}>
      <PromiseScene />
    </Sequence>
    <Sequence from={510} durationInFrames={390}>
      <Offer />
    </Sequence>
  </AbsoluteFill>
);
