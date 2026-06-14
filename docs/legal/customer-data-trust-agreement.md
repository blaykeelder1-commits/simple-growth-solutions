# Customer Data Trust & Confidentiality Agreement

**Between** Simple Growth Solutions, LLC ("SGS", "we", "us", "our")
**And** the business or individual signing below ("Customer", "you", "your")

**Effective date:** the date Customer signs or accepts these terms during onboarding.

> **Note for SGS leadership:** This is a working template drafted for trust + commercial use. Have a licensed attorney in your operating state review and tailor it before having paying customers sign at scale. Highlighted sections (`[BRACKETED]`) need a real legal review.

---

## 1. Why this document exists

You're handing us access to information that runs your business — website credentials, customer lists, banking data, invoices, marketing performance, and sometimes more. We can't grow your business without that access, and you can't give us that access without trust.

This agreement is our written promise to you about exactly what we will and will not do with your data, what protections we have in place, and what happens if something goes wrong. It is binding on both of us.

---

## 2. What data we collect and why

We only ask for what we need to run the services you're paying for. Categories of data we may handle:

| Category | Examples | Why we need it |
| --- | --- | --- |
| Account info | Name, business name, email, phone, address | To create your account and contact you |
| Business operational data | Customer lists, invoices, payment history, AR aging | To run Cash Flow AI and AR automation |
| Banking & transactional data | Bank account balances and transactions via Plaid | To analyze cash flow (read-only) |
| Marketing & analytics | Google Business reviews, Yelp reviews, web traffic | To run Business Chauffeur insights |
| Website content & credentials | Your domain, hosting login, brand assets | To build and manage your website |
| Communications | Emails and SMS we send on your behalf | To run nurture and AR follow-up |
| Payment data | Card details (handled by Square, never by us directly) | To bill you for the subscription |

**We do not collect:** social-security numbers, government IDs, full bank account numbers (Plaid gives us read-only tokens, not raw account numbers), health records, or anything else outside the categories above.

---

## 3. What we promise about your data

### 3.1 Confidentiality
Your data is treated as **Confidential Information**. We use it only to provide the services you're paying for. We do not browse, mine, or analyze it for any purpose unrelated to your services.

### 3.2 No sale of data — ever
We will **never** sell, rent, license, trade, or otherwise commercialize your data to third parties. Not for advertising, not for analytics partners, not for data brokers, not for "anonymized aggregated insights" sold to anyone else. Not now, not later, not at acquisition.

### 3.3 No marketing to your customers
Your customer lists belong to you. We do not use your customer list to market our own services to them. We do not contact your customers except as you've directly authorized (e.g., AR follow-up emails sent on your behalf using your name).

### 3.4 Limited internal access
Only SGS personnel who need access to do their job — your assigned operator, support staff handling your tickets, and engineering when fixing a bug you reported — can see your data. We do not allow casual browsing by anyone, including the owner.

### 3.5 We act on your instructions
We process your data to run the services you've subscribed to. If you ask us to stop a campaign, pause an automation, or remove a data source, we'll do it.

---

## 4. How we secure your data

The technical protections in place when you sign this:

### 4.1 Encryption
- **In transit:** all traffic between you, our servers, and integrated services (QuickBooks, Plaid, Square, Twilio, Resend, etc.) is encrypted with TLS 1.2 or higher.
- **At rest:** sensitive tokens (Plaid access tokens, OAuth refresh tokens for QuickBooks/Gusto/Google/Square) are AES-256-GCM encrypted before being written to our database. The encryption key is held outside the database in environment configuration and rotated when staff leaves.
- Database backups are encrypted at the storage layer by our hosting provider.

### 4.2 Access controls
- All SGS personnel access is gated by individual logins, not shared credentials.
- Production database access is restricted to engineering. Customer-facing operators cannot read raw database rows.
- Every privileged action (admin override, manual subscription change, refund) is recorded in an **audit log** linked to a specific staff member.

### 4.3 Authentication
- Customer accounts use password hashing (bcrypt) and optional Google SSO.
- Password resets require email verification.
- Sessions expire and re-authentication is required for sensitive actions.

### 4.4 Network and infrastructure
- Hosting on `[Render / Cloudflare]` — SOC 2 Type II audited providers.
- Database on `[Supabase / managed Postgres]` with daily backups.
- DNS, DDoS protection, and WAF via Cloudflare.
- We do not store payment card data — all card data is held by Square (PCI-DSS Level 1).

### 4.5 Vulnerability management
- Application dependencies are monitored for known vulnerabilities and patched on a routine cadence.
- Critical patches are applied within `[7 business days]`.
- Production secrets are rotated when staff offboard or on any suspected compromise.

### 4.6 What we don't (yet) have, in the spirit of honesty
- We are not currently SOC 2 certified. We follow the same control families and intend to pursue certification as we scale.
- We do not currently encrypt non-sensitive operational data at the application layer beyond what the database engine provides at rest.
- We do not have a 24/7 SOC. Suspicious activity outside business hours is detected via automated alerts and triaged on the next business day.

If a control above is critical to your business and you need formal evidence of it, ask — we'll work with you on a remediation plan or refer you to a vendor that meets that standard.

---

## 5. Third parties we share data with (and why)

We use these providers to deliver the services. Sharing is limited to what each provider needs to function:

| Provider | Purpose | What they receive |
| --- | --- | --- |
| Render (or successor host) | Application hosting | All operational data the app reads/writes |
| Supabase (Postgres) | Database | All operational data |
| Cloudflare | DNS, CDN, DDoS protection | Network metadata, not application data |
| Square | Payment processing | Your billing email, name, subscription amount, card data (held by Square directly) |
| Resend | Transactional email | Recipient email + email content |
| Twilio | SMS for AR follow-up | Recipient phone + SMS content |
| Plaid | Bank connection | Read-only token + transaction data |
| QuickBooks (Intuit) | Accounting integration | OAuth token + invoice/AR data |
| Gusto | Payroll integration | OAuth token + employee data |
| Google (AI + Business Profile) | AI analysis and reviews | Website URL for analysis; review queries |
| Sentry | Error monitoring | Error stack traces (no customer data) |

We do not authorize any of these providers to use your data for their own marketing, advertising, or product improvement beyond what is strictly necessary to provide the service to us. If a provider changes its terms in a way that violates this, we'll change provider.

**You may opt out of any optional integration** (Plaid, QuickBooks, Gusto, Google Business, Yelp) at any time. Core hosting, database, payment, and email cannot be opted out of without canceling service.

---

## 6. Your rights

You retain ownership of all your data. At any time you may:

1. **Export your data.** We will provide a machine-readable export of your account data within `[10 business days]` of a written request.
2. **Correct your data.** Update incorrect data through the portal or by asking us.
3. **Restrict processing.** Ask us to pause a specific automation or campaign.
4. **Delete your data.** Cancel your subscription and request deletion. We will permanently delete your data within `[30 days]` of cancellation, with the exceptions in §10 (records we must retain for legal/financial compliance).
5. **Transfer your data.** Take your data with you. We will not hold it hostage as leverage to keep you on the service.

---

## 7. What we will never do

To be unambiguous, we will never:

- Sell, rent, or trade your data
- Use your data to train a public AI model
- Share your customer list with anyone
- Contact your customers without your direction
- Modify your website, accounts, or data outside the scope of services you've requested
- Lock you out of your own data or accounts
- Charge a "data ransom" or transfer fee to release your data on cancellation (separate from any agreed website-hosting transfer fee disclosed in our pricing)
- Continue charging you after you've canceled
- Read your business data for any reason unrelated to the services we provide you

---

## 8. What we ask of you

Trust runs both ways. You agree:

1. The credentials, accounts, and data you provide are yours to share — you are not handing us access to systems you don't own or aren't authorized to share.
2. You will not use the services to send spam, conduct illegal activity, harass your customers, or violate any law.
3. You will pay for the services as agreed.
4. You will let us know promptly if you believe your account has been compromised.
5. You will not attempt to access other customers' data, reverse-engineer our systems, or probe for vulnerabilities without prior written permission.

---

## 9. Breach notification

If we discover a security breach that affects your data, we will:

1. Notify you in writing within `[72 hours]` of discovery (faster if law requires).
2. Tell you what data was affected, what we know, and what we're doing.
3. Provide updates as we investigate.
4. Pay for the cost of any legally required customer notification on your behalf if the breach was caused by SGS's failure.

We will not hide a breach to protect our reputation.

---

## 10. Records retention

After you cancel:
- **Operational data:** deleted within `[30 days]`.
- **Billing/tax records:** retained for `[7 years]` as required by IRS and state law.
- **Audit logs:** retained for `[12 months]` for security investigation purposes.
- **Backups:** rolled off the backup cycle within `[35 days]`.

You can request earlier deletion to the maximum extent allowed by law.

---

## 11. Compliance and applicable law

We make a good-faith effort to comply with:
- The Federal Trade Commission Act (no deceptive practices)
- The CAN-SPAM Act (transactional and marketing email rules)
- The Telephone Consumer Protection Act (SMS consent rules — you confirm you have consent from any recipient list you upload)
- The Gramm-Leach-Bliley Act, where Cash Flow AI handles your financial data
- State privacy laws applicable to where you operate (`[California CCPA, Virginia VCDPA, etc.]`)

This agreement is governed by the laws of `[Missouri / your operating state]` without regard to conflict-of-laws principles. Disputes will be resolved in `[county and state]` courts unless we mutually agree to arbitration.

---

## 12. Changes to this agreement

If we change this agreement materially (more data we collect, new third party we share with, weakened security commitment), we'll notify you in writing at least `[30 days]` before the change takes effect. You can cancel without penalty if you don't accept the change.

Non-material changes (updating a provider name, clarifying language) take effect when posted.

---

## 13. Limitation of liability

`[STANDARD CAP-OF-FEES-PAID LANGUAGE — REQUIRES ATTORNEY DRAFTING. Typical: SGS's total liability under this agreement is capped at the fees Customer paid SGS in the 12 months preceding the claim. Neither party is liable for indirect, incidental, or consequential damages. The cap does not apply to: SGS's gross negligence or willful misconduct, breach of confidentiality, or indemnification for IP infringement.]`

---

## 14. Termination

Either party may cancel for any reason with `[30 days]` written notice. We may suspend or terminate immediately for: non-payment past `[14 days]`, security misuse, or illegal activity. On termination your rights under §6 (export, deletion) still apply.

---

## 15. Acknowledgment

By signing below or clicking "I agree" during onboarding, Customer acknowledges:

- They have read and understood this agreement.
- They agree to be bound by it.
- The person signing has authority to bind the named business.

---

**Customer**

Business name: _________________________________

Signer name: _________________________________

Title: _________________________________

Email: _________________________________

Date: _________________________________

Signature: _________________________________

---

**Simple Growth Solutions, LLC**

Signer name: Blayke Elder

Title: Owner

Date: _________________________________

Signature: _________________________________

---

## Appendix A — Quick-reference promises

For the customer's wall, fridge, or onboarding deck. Plain English:

1. **We don't sell your data.** Ever. Not anonymized, not aggregated, not at acquisition.
2. **We don't market to your customers.** Your list is yours.
3. **We encrypt sensitive tokens.** Plaid, QuickBooks, Square OAuth tokens are AES-256-GCM encrypted before storage.
4. **We log every privileged action.** If we touch your account, there's a record of who and why.
5. **We don't hold your data hostage.** Cancel and we export and delete it.
6. **We tell you fast when something goes wrong.** Breach notification within 72 hours.
7. **You can opt out of any integration.** Plaid, QuickBooks, Gusto — your choice.
8. **We act on your instructions.** Pause anything, anytime.
9. **We use audited providers.** Render, Cloudflare, Supabase, Square — SOC 2 / PCI-DSS audited where applicable.
10. **We're honest about what we don't have yet.** Not SOC 2 certified ourselves. We'll get there.
