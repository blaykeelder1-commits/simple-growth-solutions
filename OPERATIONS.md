# Operations Runbook

Manual ops steps for production cutover. All require human action — they touch
DNS, third-party dashboards, or real money.

---

## 1. Resend domain verification (transactional email)

**Why:** Resend's sandbox sender (`onboarding@resend.dev`) only delivers to the
account owner's inbox. Until a verified domain is configured, signup welcome
emails, password resets, and any customer-facing email will silently bounce
for everyone but Blayke.

### Steps

1. Pick the sending domain. Recommended: `mail.simplegrowthsolutions.com`
   (subdomain so it doesn't conflict with marketing email).
2. Resend dashboard → Domains → Add domain → enter the subdomain.
3. Resend will display 4 DNS records: 1 MX, 1 SPF (TXT), 2 DKIM (CNAME).
4. Add all 4 to GoDaddy DNS for `simplegrowthsolutions.com`. TTL = 1 hour.
5. Click **Verify** in Resend. Propagation is usually 5–30 minutes.
6. Once verified, update `.env`:

   ```env
   EMAIL_FROM="Simple Growth Solutions <hello@mail.simplegrowthsolutions.com>"
   ```

7. Restart the dev server (or redeploy). Test by signing up a new user — they
   should receive the welcome email.

### Verify

```bash
# Send a test signup → check the inbox
curl -X POST $APP_URL/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"YOUR_REAL_INBOX@gmail.com","password":"TestPass123!"}'
```

If the email arrives, Resend is wired. If not, check Resend dashboard → Logs.

---

## 2. Production database cutover

**Current state:** Dev runs on local PostgreSQL 16 (`postgresql://sgs_app@localhost:5432/sgs_dev`).
Production needs a managed Postgres. Original Supabase project
(`yvpfcixbthjkkueiojld`) is paused/dead.

### Path A — Revive existing Supabase project (preferred if data exists)

1. Log in to dashboard.supabase.com → find project `yvpfcixbthjkkueiojld`.
2. If status = "Paused", click **Restore project**. Takes 1–5 minutes.
3. Go to Project Settings → Database → Connection pooling → copy:
   - **Transaction (port 6543)** URL → `DATABASE_URL`
   - **Session (port 5432)** URL → `DIRECT_URL`
4. Replace the password placeholder with the actual project password (also in
   Settings → Database → Database password; reset if forgotten).
5. Update `.env` (or production env in Vercel/Render):

   ```env
   DATABASE_URL="postgresql://postgres.yvpfcixbthjkkueiojld:PWD@aws-1-us-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
   DIRECT_URL="postgresql://postgres.yvpfcixbthjkkueiojld:PWD@aws-1-us-west-1.pooler.supabase.com:5432/postgres"
   ```

6. Apply migrations:

   ```bash
   npx prisma migrate deploy
   ```

### Path B — Fresh Supabase project (if old project is gone)

1. dashboard.supabase.com → New project. Pick the closest region.
2. Copy `DATABASE_URL` (Transaction pooler, port 6543) and `DIRECT_URL` (Session,
   port 5432) into env.
3. Apply migrations:

   ```bash
   npx prisma migrate deploy
   ```

4. (Optional) seed sample data:

   ```bash
   npm run db:seed
   ```

### Verify

```bash
# From a machine with the prod DATABASE_URL in env:
npx prisma migrate status
# Should print: "Database schema is up to date!"
```

---

## 3. Square billing — first-time setup

**Why:** SGS bills customers via Square (Managed Website plans). The code paths
(`src/lib/billing/square.ts`, `/api/billing/checkout`, `/api/billing/square-webhook`)
are complete; only env vars and Square Catalog plans are pending.

### Steps

1. Log in to Square Developer Dashboard → Applications → SGS (create if missing).
2. Production credentials → copy the **Access Token** (production, not sandbox)
   and the **Location ID** for the SGS-billing location.
3. Generate a **Webhook Signature Key**: Webhooks → Subscriptions → Add → URL
   `https://YOUR_DOMAIN/api/billing/square-webhook`, events: `payment.created`,
   `payment.updated`, `subscription.created`, `subscription.updated`,
   `invoice.payment_made`. Copy the signature key.
4. Update env:

   ```env
   SQUARE_ACCESS_TOKEN="EAAAEx..."
   SQUARE_LOCATION_ID="L..."
   SQUARE_ENVIRONMENT="production"
   SQUARE_WEBHOOK_SIGNATURE_KEY="..."
   ```

5. Create the Catalog subscription plans (one-time, returns the IDs to put in env):

   ```bash
   npx tsx scripts/setup-square-plans.ts
   ```

6. Take the IDs the script prints and add them to env:

   ```env
   SQUARE_PLAN_WEBSITE_MANAGED_ID="..."
   SQUARE_PLAN_WEBSITE_PRO_ID="..."
   SQUARE_PLAN_WEBSITE_PREMIUM_ID="..."
   ```

7. Redeploy.

### Verify

Sign up a fresh test account, click "Upgrade to Managed" in `/portal/billing`,
complete the Square Payment Link with a real card. Within ~10 seconds the
subscription row should flip from `awaiting_payment` → `active` (webhook fired).

If the webhook doesn't fire, you can manually activate via:

```bash
curl -X PATCH https://YOUR_DOMAIN/api/admin/subscriptions/SUB_ID \
  -H "Content-Type: application/json" \
  --cookie "next-auth.session-token=..." \
  -d '{"status":"active","reason":"manual: Square webhook timeout"}'
```

(Admin/owner role required.)

---

## 4. Local dev quickstart (for new contributors)

```bash
# 1. Postgres setup (one-time)
psql -U postgres -c "CREATE ROLE sgs_app LOGIN PASSWORD 'YOUR_PW' CREATEDB;"
psql -U postgres -c "CREATE DATABASE sgs_dev OWNER sgs_app;"

# 2. .env
cp .env.example .env
# Then edit DATABASE_URL/DIRECT_URL to point at sgs_dev with the password above.

# 3. Migrate + seed
npx prisma migrate dev
# (optional) npm run db:seed

# 4. Run
npm run dev
# Default port 3000; if occupied: npm run dev -- --port 3002
# Make sure NEXTAUTH_URL in .env matches whichever port you're on.
```

### Test accounts (local)

| Role     | Email                              | Password         |
|----------|------------------------------------|------------------|
| Customer | blayke.test@simplegrowth.local     | TestPass123!     |
| Admin    | blayke@simplegrowth.local          | AdminPass123!    |
| Customer (with trial sub) | activation.test@simplegrowth.local | TestPass123! |
