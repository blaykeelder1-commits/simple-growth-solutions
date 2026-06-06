import React from "react";
import { Composition } from "remotion";
import { Hero, HeroShort } from "./Hero";
import { TOTAL } from "./theme";

// Masters, all 30fps:
//   HeroLandscape     1920×1080  75s  — site embed, YouTube, LinkedIn native
//   HeroPortrait      1080×1920  75s  — vertical embeds, Stories
//   HeroShortPortrait 1080×1920  30s  — TikTok / Reels / Shorts teaser
//   HeroShortLandscape 1920×1080 30s  — LinkedIn / X short
export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="HeroLandscape" component={Hero} durationInFrames={TOTAL} fps={30} width={1920} height={1080} />
    <Composition id="HeroPortrait" component={Hero} durationInFrames={TOTAL} fps={30} width={1080} height={1920} />
    <Composition id="HeroShortPortrait" component={HeroShort} durationInFrames={900} fps={30} width={1080} height={1920} />
    <Composition id="HeroShortLandscape" component={HeroShort} durationInFrames={900} fps={30} width={1920} height={1080} />
  </>
);
