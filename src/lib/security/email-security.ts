// Email Security Checks (SPF / DKIM / DMARC)
// Uses Node.js native dns module for TXT record lookups

import { promises as dns } from "dns";

export interface EmailSecurityResult {
  spf: { found: boolean; record: string | null };
  dmarc: { found: boolean; record: string | null };
  dkim: { found: boolean; selector: string | null };
  score: number;
  issues: string[];
}

// Common DKIM selectors used by popular providers
const DKIM_SELECTORS = ["default", "google", "selector1", "selector2", "k1", "mandrill", "everlytickey1", "cm"];

/**
 * Look up TXT records for a given domain, returning an empty array on failure.
 */
async function safeTxtLookup(domain: string): Promise<string[][]> {
  try {
    return await dns.resolveTxt(domain);
  } catch {
    return [];
  }
}

/**
 * Check SPF record for a domain.
 * SPF records are TXT records on the root domain that begin with "v=spf1".
 */
async function checkSPF(domain: string): Promise<{ found: boolean; record: string | null }> {
  const records = await safeTxtLookup(domain);
  for (const record of records) {
    const joined = record.join("");
    if (joined.toLowerCase().startsWith("v=spf1")) {
      return { found: true, record: joined };
    }
  }
  return { found: false, record: null };
}

/**
 * Check DMARC record for a domain.
 * DMARC records are TXT records at _dmarc.{domain} that begin with "v=DMARC1".
 */
async function checkDMARC(domain: string): Promise<{ found: boolean; record: string | null }> {
  const records = await safeTxtLookup(`_dmarc.${domain}`);
  for (const record of records) {
    const joined = record.join("");
    if (joined.toLowerCase().startsWith("v=dmarc1")) {
      return { found: true, record: joined };
    }
  }
  return { found: false, record: null };
}

/**
 * Check DKIM record for a domain by trying common selectors.
 * DKIM records are TXT records at {selector}._domainkey.{domain}.
 */
async function checkDKIM(domain: string): Promise<{ found: boolean; selector: string | null }> {
  // Check selectors in parallel for speed
  const results = await Promise.allSettled(
    DKIM_SELECTORS.map(async (selector) => {
      const records = await safeTxtLookup(`${selector}._domainkey.${domain}`);
      if (records.length > 0) {
        // Check if any record looks like a DKIM record (contains v=DKIM1 or p=)
        for (const record of records) {
          const joined = record.join("");
          if (joined.includes("v=DKIM1") || joined.includes("p=")) {
            return selector;
          }
        }
      }
      return null;
    })
  );

  for (const result of results) {
    if (result.status === "fulfilled" && result.value !== null) {
      return { found: true, selector: result.value };
    }
  }

  return { found: false, selector: null };
}

/**
 * Run all email security checks for a domain.
 * Returns SPF, DMARC, DKIM results along with a score and list of issues.
 */
export async function checkEmailSecurity(domain: string): Promise<EmailSecurityResult> {
  const [spf, dmarc, dkim] = await Promise.all([
    checkSPF(domain),
    checkDMARC(domain),
    checkDKIM(domain),
  ]);

  const issues: string[] = [];
  let score = 100;

  if (!spf.found) {
    issues.push("No SPF record found. SPF helps prevent email spoofing by specifying which servers can send email for your domain.");
    score -= 40;
  }

  if (!dmarc.found) {
    issues.push("No DMARC record found. DMARC builds on SPF and DKIM to provide email authentication and reporting.");
    score -= 35;
  }

  if (!dkim.found) {
    issues.push("No DKIM record found for common selectors. DKIM adds a digital signature to outgoing emails to verify authenticity.");
    score -= 25;
  }

  return {
    spf,
    dmarc,
    dkim,
    score: Math.max(0, score),
    issues,
  };
}
