# SGS Website Build Blueprint — "The Bones"

**This is the reusable foundation for every customer website SGS builds.** It exists so
each new build starts from proven structure and the bugs we've already solved stay solved —
we do not re-discover the same traps on every site.

It is distilled from four sites we've shipped and operated:

| Site | Type | Stack | What it taught us |
|---|---|---|---|
| **Waste Rescue KC** | dumpster/junk hauling | Astro + Cloudflare Pages | image performance, schema, GA4, prerender |
| **Sheridan Trailer Rentals** | trailer rental + booking | Astro + CF Pages + booking API | booking funnel, license-after-pay, deploy-full-stack |
| **IDDI** | vending SaaS | CF Pages front + Render back | front/back split, OAuth/CORS, config-gated IDs |
| **J Rodgers BBQ / RG 158** | restaurant/venue | CF Pages + Square | DNS/email, Square webhooks, booking |

> **MANDATORY USE (binds Claude *and* Andy/NanoClaw):** Before scaffolding or building any
> customer site, **load this file and apply it.** After each build, if the 3-pass review
> surfaces a *new* recurring trap, **append it to the Lessons Log** at the bottom before you
> close the build. That append-only loop is how the bones get stronger every site.

---

## 0. The build process — how we arrive at a site the customer feels immersed in

The repeatable thinking pattern. Run it end to end on every build. We don't ship "clean"
and stop — we push to *immersive*, then iterate on the platform.

**1. Extract the brand from the source — don't eyeball.** If the customer gives a logo,
flag, sign, or photo, sample it *programmatically*: multi-pass pixel analysis (mean → mode →
brightest field → correct for edge-bleed) for exact hex, not a guess. Capture the full
identity — wordmark, mark/icon, the real phone/NAP printed on the asset (often differs from
the contact's own number), and the type vibe. Lock a 2–3 color palette from the real asset.

**2. Research proven, high-traffic examples — national, not just local.** Google-Trends /
top-site research for the niche. Pull the patterns that convert (visible pricing, free-trial
lead, ≤3-step booking, authentic photography, mobile-first) **and** the immersion methods the
leaders use (gyms, e.g.: Planet Fitness virtual tour + live "crowd meter"; Equinox luxury
visuals + motion; Life Time "more than a gym" depth). Apply them deliberately.

**3. Build 2–3 genuinely distinct directions.** Not variations — different schemes and
personalities (e.g. community-warm / bold-athletic / conversion-first), each a full,
brand-accurate page with real photography, grounded in the research + the bones below.

**4. Iterate for depth, flow, and immersion.** The first pass gets it right; the next gets
it *felt*. Add intuitive narrative flow and immersion: a "step inside" tour gallery, a live
"how busy right now" meter, a "more than a [X]" depth section, entrance motion, hover
interactions. The customer should feel immersed in their own site — that is the bar.

**5. 3-pass review** (see the protocol below) before anything reaches the customer.

**6. The conversation lives on the platform, not in chat.** The owner reviews options on the
admin board and **Requests edits / Denies with notes there** (recorded as `[DESIGN]`-tagged
project notes → a tracked thread with a derived decision state). The customer mirrors this from
their portal — pick a direction, "tweak this one", or "none of these feel right" — all into the
**same `[DESIGN]` thread**, which Andy's `sgs-design-feedback-sweep` surfaces to WhatsApp. Claude/
Andy revise from that feedback and re-post updated options. Never split the design conversation
between a terminal and the site.

**DON'T-REPEAT-DENIED (mandatory before any re-send):** read the project's full `[DESIGN]`
thread first. **Never re-send a direction, look, or platform that was already denied** — a
revision must visibly move away from what was rejected and *toward* the feedback, not recycle a
turned-down option. Log the denied direction + the reason in the thread so the next round (and
the blueprint Lessons Log) carries it forward.

**7. Gates + deploy architecture.** new-build surfaced to WhatsApp → **Gate 1** owner
approves the build → build from this blueprint → admin **review board** → **Gate 2** owner
approves & sends → customer picks → **payment subscription** → go-live. Deploy customer-site
and SGS changes from a **git worktree off `origin/master`** (the working tree is chronically
dirty), verify (typecheck / lint / 3-pass), then push.

**Reliability defaults baked into the above:** `<img>` with pre-sized URLs (NOT `next/image`
— the Render optimizer 502s); **CSS-only entrance animation** (content stays visible, a JS
failure can never blank the page); a shared `_shared` module for reusable immersive pieces;
only config-gated real IDs/links.

---

## 1. The stack (default bones)

- **Astro + Cloudflare Pages.** Static-first, fast, cheap to host (CF Pages), and it matches
  every site above. Use this unless a customer genuinely needs an app (then split: static
  marketing front on CF Pages + API back on Render, like IDDI).
- **Assets** live in `src/assets/` (so `astro:assets` / `imageService` can optimize them) —
  **never** `public/` for photos you want optimized.
- **Config-gated constants** in `src/lib/site.ts` — GA4 ID, GBP review URL, phone/NAP,
  social links. Empty by default; rendered only when set. **Never ship a fake ID or dead link.**

## 2. Standard page structure

Every local-service marketing site gets these, reusing shared components (no copy-paste):

1. **Hero** — one clear promise + one primary CTA (book / call / quote). Qualifies the customer
   you *want* ("done right, not just cheap"), doesn't repel.
2. **Services / what we offer** — the real offerings; if the brand/logo promises a service the
   site doesn't sell yet, that's a real second service page.
3. **Proof** — reviews/testimonials, results, trust signals.
4. **Pricing or "how it works"** — remove uncertainty before the CTA.
5. **Booking / contact / lead capture** — the conversion surface (see §5).
6. **Service-area** — city chips linking to city pages (see §4).
7. **Footer** — hours, map, NAP, config-gated Google review link, social `sameAs`.

## 3. The proven rules (apply to every build)

- **Image performance is the #1 killer.** Raw multi-MB photos destroy LCP. Use `astro:assets`
  `<Image>` (responsive WebP, explicit width/height for CLS). Hero = `loading="eager"` +
  `fetchpriority="high"`; everything else lazy. OG card ≈1200px, <250KB, JPG for photos.
- **Lead-qualifying messaging.** Rewrite hero + CTA to attract the right customer; copy-only,
  keep the brand.
- **Schema (two minimum):** `LocalBusiness` (real `areaServed` city list + geo + gated `sameAs`)
  **and** `FAQPage` — both fed from the *same* data the page renders so visible text and schema
  can't drift. City pages add `Service` + `BreadcrumbList`.
- **Conversion tracking = GA4 Google tag** (only GA4 feeds Google Ads conversion import; CF Web
  Analytics cannot). Fire `generate_lead` / `begin_checkout` / `purchase` on the *real
  server-confirmed* thank-you/step, never on a button click that might not complete. Keep the
  privacy page truthful.
- **Sitemap/robots:** don't `Disallow` a conversion page that's in the sitemap; make `og:image`
  absolute.

## 4. City / service pages — do them RIGHT

- **6–10 genuinely unique pages beat 31 thin ones** (2026 Google guidance — near-duplicate
  "swap the city name" pages now *hurt* rankings). Write unique per-city copy (local intro, real
  project mix, drive context, county/landmark — only facts you're sure of).
- **Architecture:** ONE prerendered dynamic route (`/[service]/[slug].astro` + `getStaticPaths`)
  fed by a content data module (`src/lib/locations.ts`, one object per city). Reuse pricing/FAQ/CTA
  components. Copy-pasting `.astro` files = slop.
- **Internal-link web:** homepage area chips → each city; each city → the others; all in sitemap.

## 5. Conversion / booking (hard-won from Sheridan)

- **Payment first, friction last.** Put high-friction steps (license upload, document signing)
  **after** payment, not before — Sheridan's biggest leak was a 5-step form demanding license +
  signature *before* checkout (62 form-opens → 8 checkouts → 1 buy). Order: dates → pay → upload/sign.
- **No dead-ends in the funnel.** Every step must advance or guide; a single-date RV picker that
  silently did nothing was a real leak. Add guidance + auto-scroll to the next step.
- **Mobile uploads must re-encode.** Raw HEIC/large phone photos time out — resize on a canvas
  before upload (Sheridan license page).
- **Carry the analytics session end-to-end** (`ga_session_id` form → webhook → Measurement
  Protocol) or conversions misattribute and the funnel looks broken when it isn't.

## 6. Astro + Cloudflare gotchas (carry forward)

- `imageService: 'compile'` only optimizes **prerendered** routes. **`export const prerender = true`
  on every static marketing/city page** or CF serves raw multi-MB images (WRKC homepage shipped
  7MB until this was set).
- Prerendered pages canonicalize **with a trailing slash** — keep sitemap, internal links, and
  schema `url`s on the trailing-slash form (avoids 308 hops + canonical/sitemap mismatch).
- **`astro dev` can 500** on React-island pages under the CF adapter — verify with
  `npm run build && npm run preview` (= `wrangler pages dev ./dist`), not the dev server.
- White-background logo on a non-white header shows a box — use a transparent asset or a white
  header band; `sharp().trim()` strips padding.

## 7. Deploy discipline (carry forward)

- **CF Pages branch matters.** The custom domain is bound to the **Production** branch. Deploy
  with the right `--branch` (Sheridan = `main`, Waste Rescue = `master`) or it silently lands on
  Preview and the live site never updates.
- **Ship the full stack together.** Frontend + backend + Caddy/route + restart must deploy as one
  — shipping UI alone leaves a silently broken flow (Sheridan booking).
- **If a customer site uses Next on Render:** commit `.npmrc` with `production=false` or the build
  fails with misleading "Module not found '@/...'"; and the Render image optimizer can 502 — use
  `unoptimized` images there.

## 8. Build & verify workflow (the workflow that worked)

1. Build on a local sandbox; verify with `npm run build && npm run preview`.
2. Verify **end-to-end**: typecheck clean, schema parses, links resolve, payload sizes sane,
   forms/booking work, **desktop *and* mobile**, no console errors.
3. Run the **3-pass review protocol** (see `CLAUDE.md` / `docs/website-edit-review-protocol.md`) —
   requirement fidelity, code/build quality, live design/function. All three clean before it goes
   to the customer.
4. Show the owner in the portal review board; deploy only on approval.

---

## 9. Lessons Log (append-only — the learning loop)

When a build surfaces a **new** recurring trap or a pattern that clearly performs better, add a
dated one-liner here (newest first). Andy's weekly `sgs-rulebook-review` promotes durable entries
up into the rules above; keep this log tight — once a lesson is promoted, prune it.

- _2026-06-27 — Lake Viking Gym build proved the Section-0 process. Wins to keep: (a) programmatic
  4-pass color extraction from the customer's flag beat eyeballing (locked exact `#F0603C` / `#1F468F`);
  (b) immersion methods (Step-Inside tour gallery + live crowd meter + "more than a gym" depth +
  CSS entrance motion) noticeably lifted the feel over a "clean" v2; (c) on-platform `[DESIGN]`-tagged
  edit/deny feedback loop replaced the terminal conversation. Traps: image-heavy preview pages can stall
  the browser screenshot tool's network-idle wait — verify structure via server HTML/curl + a fresh tab.
  next/image still 502s on Render → keep `<img>`._
- _2026-06-27 — Blueprint created. Seeded from Waste Rescue KC, Sheridan, IDDI, J Rodgers._
