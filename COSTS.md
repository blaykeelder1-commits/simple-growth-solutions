# Cost Model & Cloudflare Scaling Plan

Living document for the unit economics behind the SGS managed-website business.
Updated whenever pricing or infrastructure assumptions change.

---

## TL;DR

At our current pricing ($49 / $79 / $129) with the per-tier change-request caps
we shipped, the platform is **profitable from customer 1**. Hosting cost per
customer is under $1/mo at any reasonable scale. The real cost driver is
**operator labor on change requests** — that's what the caps protect.

| Stage | Revenue / mo | Direct cost / mo | Gross margin |
|---|---|---|---|
| 10 customers (avg $59 ARPU) | $590 | ~$30 hosting + ~$200 labor | ~$360 (61%) |
| 50 customers | $2,950 | ~$80 hosting + ~$1,000 labor | ~$1,870 (63%) |
| 100 customers | $5,900 | ~$150 hosting + ~$2,000 labor | ~$3,750 (64%) |
| 500 customers | $29,500 | ~$600 hosting + ~$10,000 labor | ~$18,900 (64%) |

Numbers assume 1.5 hours of operator time / customer / month at $50/hr internal
labor cost. Heavy-touch customers use the overage fee or upgrade to Pro/Premium.

---

## 1. Hosting (Cloudflare)

We host customer sites on **Cloudflare Pages** with assets backed by **R2**.

| Resource | Tier | Cost | Capacity |
|---|---|---|---|
| Cloudflare Pages | Pro | **$20/mo** | 5,000 builds/mo, unlimited static bandwidth |
| R2 storage | usage | $0.015/GB/mo | ~1 GB/site is generous |
| R2 egress | usage | $0 (free egress!) | unlimited |
| Custom domains | first 100 free | $0 | first 100 |
| Cloudflare for SaaS | + add-on | **$25/mo + $0.10/domain over 100** | unlimited custom domains |
| Workers (if needed) | $5 base + usage | minimal | 10M requests / $0.50 |

### Per-customer cost at scale

- **10 customers**: $20 (Pages Pro) + $0.15 (R2) = **$2/customer/mo**
- **100 customers**: $20 + $1.50 + ~$10 (Cloudflare for SaaS @ tier) = **$0.32/customer/mo**
- **500 customers**: $20 + $7.50 + $25 + $40 (400 extra domains) = **$0.19/customer/mo**

**At any scale, hosting is < $2/customer/mo.** Margin is preserved.

---

## 2. Operator labor (the real cost driver)

| Plan | Price | CR cap / mo | SLA | Internal labor cost @ $50/hr |
|---|---|---|---|---|
| Managed | $49 | 2 | 5 business days | 1 hr / CR × 2 = $100 |
| Managed Pro | $79 | 4 | 24 hr | 1 hr / CR × 4 = $200 |
| Managed Premium | $129 | 10 | same-day | 0.75 hr / CR × 10 = $375 |

**Per-tier gross margin (unit economics):**

| Plan | Revenue | Hosting | Labor | Gross | Margin % |
|---|---|---|---|---|---|
| Managed | $49 | $1 | ~$50 (1hr avg, customers rarely max out) | -$2 to +$30 | -4% to 61% |
| Pro | $79 | $1 | $100 avg (most use 2 of 4 CRs) | $-22 (max use) to +$54 (typical) | -28% to 68% |
| Premium | $129 | $1 | $250 avg | -$122 (max use) to +$50 | -94% to 39% |

**Important:** The cap math protects us against worst-case behavior, but the
**typical** customer uses far less than their cap. Realistic averages:

- Managed: avg 0.8 CRs/mo → $40 labor → **$8 gross / customer**
- Pro: avg 2.5 CRs/mo → $125 labor → **-$47 gross / customer (loss)** ← problem
- Premium: avg 4 CRs/mo → $100 labor → **+$28 gross / customer**

⚠️ **The Pro tier under-prices its actual usage.** Customers who upgrade to Pro
do so because they *need* faster turnaround, which means they actively use
their CRs. We need to monitor this — if real-world Pro CRs land at 4/mo
average, we should bump Pro to $99 or shave the cap to 3.

### Mitigations already in place

- **Trial CR cap = 1.** A trial customer can request a single feedback round
  before they have to pay. This shuts the "extract free $1500 of work" play.
- **$25 overage fee** charged via Square Payment Link auto-issued when a
  customer exceeds their cap. They explicitly accept; no surprise billing.
- **$49 same-day rush** still billable on Managed customers; Pro/Premium have
  it included.

---

## 3. Anti-loophole: hosting + transfer mechanics

Codified in the platform:

1. **Trial customers don't get the live deployedUrl** — only previews inside
   the portal. The site goes live the day they convert to paid.
   *(Implemented in `/api/projects/[id]` GET — `deployedUrl` is masked when
   sub status ≠ active.)*
2. **Hosting lives on our Cloudflare account.** Cancel = site gets paused or
   shows "site currently paused" page at the end of the billing period.
3. **Source code, repo, and asset bundle = paid transfer ($499 + 30-day
   handoff).** Communicated up-front in the pricing FAQ. Customer can leave
   any time, but if they want what we built, they pay for it. Most just stay.

---

## 4. When to revisit pricing

Trigger | Action
--- | ---
Pro avg CRs/mo > 3 for 2+ months | Bump Pro to $99, keep cap at 4
Managed avg CRs/mo > 1 | Add $10 to base price OR drop cap to 1
> 100 active customers | Move to Cloudflare for SaaS, recompute hosting unit cost
Hosting cost > $5/customer/mo | Audit storage, cull unused assets, set R2 lifecycle
Trial → paid conversion rate < 25% | Tighten trial CR cap to 0; require deposit for custom builds

---

## 5. Quick math: what does each new customer earn us, year 1?

Assume **avg blended ARPU = $63/mo** (mix of $49/$79/$129 weighted toward Managed).

- **Year 1 revenue / customer**: $63 × 12 = $756
- **Year 1 cost / customer** (hosting + 1 hr/mo labor): $1 × 12 + $50 × 12 = $612
- **Year 1 contribution / customer**: **+$144**
- **Build cost** (one-time, year 1 only): ~$500 of dev labor
- **Net year 1 profit / customer**: **-$356**

**Customers must stay 25+ months to net positive on the build cost alone.**

This is why retention mechanics matter more than acquisition. Every churned
customer in year 1 is a loss. The tier-up + hosting-lock model is designed to
get them to year 2 where they're pure margin.

---

## Multi-site (one customer, many websites)

A customer (organization) can run several managed websites. The **first** site is
covered by the base plan; each **additional** site is a discounted recurring
add-on and carries its **own** per-period change-request cap (caps are enforced
per-site, not pooled — so two sites = two independent CR allotments).

| Base plan | Standalone | Additional-site add-on | 2 sites total | 3 sites total |
| --- | --- | --- | --- | --- |
| Managed | $49 | **+$35/mo** | $84 | $119 |
| Pro | $79 | **+$59/mo** | $138 | $197 |
| Premium | $129 | **+$99/mo** | $228 | $327 |

**Why the add-on is ~95% margin:** the marginal cost of an extra site is only its
hosting (Cloudflare Pages/R2, **< $2/mo** — see §1) plus its edit labor. With
Andy/NanoClaw auto-preparing edits (preview-first, human-approved), the per-CR
operator labor that used to dominate unit economics collapses toward Blayke's
review time (minutes, not the $50/hr × 1hr modeled above). An additional Managed
site at **+$35/mo** nets roughly **+$33/mo** before labor savings, approaching the
full $35 with them.

Encoded in `src/lib/billing/multi-site.ts` (prices, env-overridable) +
`src/lib/billing/additional-site.ts` (recurring Square provisioning on the card on
file). Per-site caps enforced in `api/projects/[id]/change-requests/route.ts`.

---

## Update log

- **2026-04-26** — Initial doc. Plan caps shipped: Managed (2 CRs), Pro (4),
  Premium (10). $25 overage fee, $499 transfer fee, hosting lock during trial.
- **2026-06-16** — Multi-site add-on pricing shipped (+$35/$59/$99 per extra
  site, per-site CR caps). Margin ~95% because Andy automates edit fulfillment.
