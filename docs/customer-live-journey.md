# Customer Live Journey — what the customer sees, and what's really behind it

This traces the Simple Growth Solutions customer journey step by step, and for
each surface states **what the customer sees**, **what fires live**, and **the
real DB/code backing it**. The rule (per the project mandate): every surface
that shows state must read real data and operate correctly — no "blank
cabinets," no false flags, no silent gaps.

---

## 1. Marketing site → free build (no card)
- **Sees:** `/` landing, `/pricing` ("Free Website. Simple Plan." — Managed $49 /
  Pro $79 / Premium $129, monthly/annual toggle). Every plan CTA is **"Start
  Free Build"** → `/questionnaire`. No card is requested up front.
- **Fires live:** Submitting the questionnaire `POST /api/leads` creates a `Lead`
  row **and** sends an internal "new lead" alert to the ops inbox
  (`sendNewLeadInternalEmail`) — synchronously, so a lead is never missed.
- **Backing:** `leads` table; `src/app/api/leads/route.ts`.

## 2. Sign up → onboarding
- **Sees:** `/signup` → `/onboarding` (organization profile) → `/portal`.
- **Fires live:** `POST /api/onboarding/organization` creates the `Organization`,
  makes the user `owner`, and auto-converts the matching `Lead` to `converted`.
- **Backing:** `organizations`, `users`; transactional write + audit log.

## 3. Portal home + project request
- **Sees:** `/portal` dashboard (real projects + requests), `/portal/projects/new`
  to request the build.
- **Fires live:** project request persists a `website_projects` row; admins see it.
- **Backing:** `website_projects`; `src/app/api/projects`.

## 4. Go live → pay (the money path) — **fixed & verified 2026-06-15**
- **Sees:** `/portal/billing` → "Start your plan" (monthly/annual) → Square
  hosted checkout branded "Simple Growth Solutions" → back to billing with the
  plan shown **active**.
- **Fires live (the full chain, now correct):**
  1. `POST /api/billing/checkout` creates a Square customer + payment link and a
     `subscriptions` row in `awaiting_payment`.
  2. Customer pays → Square fires `payment.created` → webhook
     (`/api/billing/square-webhook`):
     - **Stores a reusable card-on-file** from the payment (`createCardOnFile`) —
       payment links don't persist one, so this is required.
     - Creates the recurring Square subscription (idempotent on the local sub id,
       so duplicate webhook deliveries can't create duplicates).
     - Atomically flips the row to **active** and sends the **customer welcome**
       email + the **internal "new paid customer"** alert — exactly once.
  3. `subscription.created` (Square `PENDING`, future-dated to avoid a double
     charge) is mapped to **active** locally, so the customer isn't locked out
     for their first month.
- **Loud-fail guarantee:** if the card can't be stored, the plan variation is
  missing, or Square errors, the row stays `awaiting_payment` **and** an ops
  alert email fires (`sendProvisioningStuckInternalEmail`). A paid customer is
  **never** silently stranded behind a success page.
- **Backing:** `subscriptions`, `one_off_charges`; `src/lib/billing/*`,
  `src/app/api/billing/*`.

## 5. Change requests (the recurring value)
- **Sees:** `/portal/requests/new` (gated — requires an active managed plan) →
  request appears in `/portal/requests` with live status.
- **Fires live:** `POST /api/projects/[id]/change-requests` enforces the
  per-plan monthly cap, computes the SLA due date, and emails the customer a
  receipt + alerts admins. Over-cap requests require accepting a **$25 overage**
  (or rush is **$49**), charged via a Square payment link before the ticket is
  worked.
- **Backing:** `change_requests`, `one_off_charges`; `src/lib/billing/plan-caps.ts`,
  `src/lib/billing/sla.ts`.

## 6. Settings (made real 2026-06-15)
- **Sees:** `/portal/settings` — profile name + organization name/industry,
  loaded with **real values** and saved for real (`GET`/`PATCH /api/portal/settings`).
  Email change and account deletion route to support (handled by a human so data
  removal is verified). Notifications section is honest copy, not fake toggles.
- **Backing:** `users`, `organizations`; `src/app/api/portal/settings/route.ts`.

---

## Admin side — prioritization by subscription + not losing money

- **Dispatch board** (`/admin/dispatch`): every change request across all
  projects, **sorted by SLA due date** (soonest first) with **Overdue** and
  **Due ≤ 24h** counters, priority/rush flags, and assignee. SLA is derived from
  the customer's plan: Premium = same business day (8h), Pro = 24h, Managed =
  5 business days — so higher tiers are surfaced first automatically.
- **Overage / extra edits — charged, not absorbed:** caps are Managed 2 /
  Pro 4 / Premium 10 requests per period. Beyond the cap the customer must accept
  a **$25** charge (Square payment link) before the ticket is worked; same-day
  rush is **$49** (free on Pro/Premium). The ticket holds in `awaiting_payment`
  until the `one_off_charges` row is paid — so extra work is never done for free,
  and the payment is reconciled by the webhook (`OneOffCharge` → `paid`).

## Deferred (intentionally not sold as live)
- `/portal/upgrades`: SEO + Marketing show **"Coming Soon"** (disabled);
  Security Shield routes to contact. These are honest — no fake checkout.
- Back-half products (Cash Flow AI, GEO, payroll dashboards) are **not** part of
  the website-customer portal and are not surfaced to new customers.
