# SGS Cold Email Sequence — Instantly

Target: local small businesses with **no website or a bad/outdated one**. The
offer (free build) is the hook — so these emails stay short, specific, and
low-pressure. Reply-driven, not link-driven (better deliverability + replies).

---

## Lead list — where to pull (free/cheap)
- **Google Maps**: search "[trade] near [city]" (plumbers, electricians, HVAC, landscapers, cleaners, detailers, salons, contractors, restaurants, food trucks). Filter for businesses with **no website link** or a Facebook page only. Those are your hottest leads.
- **Apollo / Google Business Profile** exports for owner names + emails.
- Start hyper-local (Baldwin County / Gulf Coast), then expand by metro.

## Custom variables to collect per lead
`{{firstName}}` · `{{companyName}}` · `{{city}}` · `{{industry}}` (e.g. "landscaping")
· `{{siteStatus}}` (optional: "no website" / "Facebook only" / "outdated")

## Sending settings (Instantly)
- Warm up inboxes 2+ weeks before sending. Use a dedicated sending domain (NOT the apex used for customer mail).
- Ramp: 20/day per inbox → 30 → 40. 2–3 inboxes to start.
- Plain text only in Email 1 (no links, no images). Links from Email 2 on.
- Daily cap ~ inboxes × 40. Track reply rate; pause + fix copy if < 3%.

---

## Email 1 — Day 0 — The offer

**Subject A/B (test both):**
- `quick idea for {{companyName}}`
- `{{companyName}} — website?`

**Body:**
```
Hi {{firstName}},

I came across {{companyName}} while looking at {{industry}} businesses around {{city}} — and noticed you don't have a website that's easy to find.

I build small businesses a professional website, free. No upfront cost. You only pay a small monthly fee if you want us to host and run it after you see it.

Worth me putting together a free mockup for {{companyName}}? Just reply "yes" and I'll get started.

— Blayke
Simple Growth Solutions
```
*~70 words. One ask: reply "yes." No link.*

---

## Email 2 — Day 3 — Proof + remove risk

**Subject:** `re: quick idea for {{companyName}}`  *(reply in same thread)*

**Body:**
```
Hi {{firstName}},

Following up — here are a couple we recently built so you can see the quality:

• wasterescuekc.com (local service business)
• rg158-venue.pages.dev (event venue)

The build is genuinely free. If you like it, we host + handle edits for $29/mo as a founding member (locked for your first 3 months, then $49). If you don't, you owe nothing.

Want me to start a free mockup for {{companyName}}?

— Blayke
```
*Links allowed now. Founding offer introduced.*

---

## Email 3 — Day 7 — The cost of doing nothing

**Subject A/B:**
- `what your competitors have`
- `{{city}} customers are searching`

**Body:**
```
Hi {{firstName}},

Most people looking for {{industry}} in {{city}} search Google or check for a website before they call. If there's nothing there, they move to the next name on the list — even if you do better work.

A clean site fixes that, and I'll build {{companyName}}'s for free. You'll have it live this week.

Reply "send it" and I'll start today.

— Blayke
```

---

## Email 4 — Day 12 — Breakup (gets the most replies)

**Subject:** `should I close your file?`

**Body:**
```
Hi {{firstName}},

I don't want to keep landing in your inbox — so this is my last note.

If a free website for {{companyName}} is interesting, just reply and I'll start it. If not, no worries at all and I'll close things out here.

Either way, wishing you a great rest of the year.

— Blayke
```

---

## When they reply "yes"
Send them the questionnaire link: `https://simple-growth-solution.com/questionnaire`
(or `?plan=website_managed`). The funnel takes it from there — free build → review → founding checkout. Their founding rate comes from the `?promo=FOUNDING50` code on the pricing step.

## Spintax (deliverability — vary phrasing across sends)
Wrap a few phrases in spintax so no two emails are identical, e.g.:
`{quick idea|quick question|thought for} for {{companyName}}`
`I {came across|found|noticed} {{companyName}}`
