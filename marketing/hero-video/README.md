# SGS Hero Video — Remotion

The cinematic "Meet Simple Growth Solutions" launch video. **All rendered in
code** — change the script, re-render, done. No motion designer required.

Concept: a transformation story that doubles as an explainer — *great business →
no website → we build it free → here's exactly how it works → real-site proof →
founding offer.* Cinematic-premium grade (deep gradient, drifting brand glow,
film grain, kinetic typography).

## Compositions (30fps)

| ID | Size | Length | Use |
|----|------|--------|-----|
| `HeroLandscape` | 1920×1080 | 75s | Landing-page embed, YouTube, LinkedIn |
| `HeroPortrait` | 1080×1920 | 75s | Vertical embeds, Stories |
| `HeroShortPortrait` | 1080×1920 | 30s | TikTok / Reels / Shorts |
| `HeroShortLandscape` | 1920×1080 | 30s | LinkedIn / X short |

## Quick start

```bash
cd marketing/hero-video
npm install
npm run dev        # Remotion Studio at http://localhost:3000 — scrub + tweak live
```

## Render

```bash
npm run render            # HeroLandscape → out/sgs-hero-landscape.mp4
npm run render:portrait   # HeroPortrait
npm run render:short      # HeroShortPortrait
npm run render:all        # all three
```

## Structure
- `src/theme.ts` — brand colors, accent gradient, scene timings.
- `src/Hero.tsx` — full 75s + 30s teaser, composes the scenes.
- `src/scenes/` — Hook · Promise · Process · Proof · Offer.
- `src/components/` — Atmosphere, KineticText, BrowserFrame, Wordmark.

## To upgrade later
- Drop real site **screenshots** into `Proof.tsx` (swap the brand panels for `<Img>`).
- Add a **music bed**: place an mp3 in `public/` and add `<Audio src={staticFile("...")} />` in `Hero.tsx`.
- Tweak any copy in the scene files and re-render.
