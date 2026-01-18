// Security scanner for websites
import { promises as dns } from "dns";

export interface SecurityCheckResult {
  passed: boolean;
  score: number;
  details: string;
  severity: "critical" | "high" | "medium" | "low" | "info";
  remediation?: string;
}

// Maximum URL length to prevent DoS
const MAX_URL_LENGTH = 2048;

// List of private/internal IP ranges that should not be scanned (SSRF protection)
const PRIVATE_IP_PATTERNS = [
  /^localhost$/i,
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
  /^192\.168\./,
  /^0\./,
  /^169\.254\./, // Link-local
  /^::1$/,
  /^fc00:/i,
  /^fe80:/i,
  /^fd[0-9a-f]{2}:/i,
];

/**
 * Check if an IP address is private/internal
 */
function isPrivateIP(ip: string): boolean {
  return PRIVATE_IP_PATTERNS.some((pattern) => pattern.test(ip));
}

/**
 * Resolve hostname and validate that all resolved IPs are not private
 * This protects against DNS rebinding attacks where a hostname
 * initially resolves to a public IP but later resolves to a private IP
 */
async function resolveAndValidate(hostname: string): Promise<{ valid: boolean; error?: string }> {
  try {
    // Try IPv4 first
    let addresses: string[] = [];
    try {
      addresses = await dns.resolve4(hostname);
    } catch {
      // IPv4 resolution failed, try IPv6
      try {
        addresses = await dns.resolve6(hostname);
      } catch {
        // Both failed, likely not a resolvable hostname (could be an IP already)
        return { valid: true };
      }
    }

    // Check each resolved IP against private ranges
    for (const ip of addresses) {
      if (isPrivateIP(ip)) {
        return {
          valid: false,
          error: `Hostname resolves to private IP address (${ip}). Scanning internal addresses is not allowed.`,
        };
      }
    }

    return { valid: true };
  } catch {
    // If DNS resolution fails entirely, we'll let the request proceed
    // and let the fetch operation handle connectivity issues
    return { valid: true };
  }
}

/**
 * Validates a URL for security scanning (synchronous checks only)
 * Prevents SSRF attacks by blocking internal/private addresses
 */
export function validateScanUrl(url: string): { valid: boolean; error?: string; normalizedUrl?: string } {
  // Check URL length
  if (url.length > MAX_URL_LENGTH) {
    return { valid: false, error: `URL exceeds maximum length of ${MAX_URL_LENGTH} characters` };
  }

  // Normalize URL - add protocol if missing
  let normalizedUrl = url;
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    normalizedUrl = `https://${url}`;
  }

  try {
    const urlObj = new URL(normalizedUrl);

    // Only allow http and https protocols
    if (urlObj.protocol !== "http:" && urlObj.protocol !== "https:") {
      return { valid: false, error: "Only HTTP and HTTPS protocols are allowed" };
    }

    // Check for private/internal addresses (SSRF protection)
    const hostname = urlObj.hostname;
    for (const pattern of PRIVATE_IP_PATTERNS) {
      if (pattern.test(hostname)) {
        return { valid: false, error: "Scanning internal or private addresses is not allowed" };
      }
    }

    // Block IP addresses that resolve to private ranges
    // Check for numeric IPs
    const ipv4Match = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
    if (ipv4Match) {
      const octets = ipv4Match.slice(1).map(Number);
      // Validate octet ranges
      if (octets.some((o) => o > 255)) {
        return { valid: false, error: "Invalid IP address" };
      }
    }

    return { valid: true, normalizedUrl };
  } catch {
    return { valid: false, error: "Invalid URL format" };
  }
}

/**
 * Validates a URL for security scanning with DNS rebinding protection
 * This async version performs DNS resolution to ensure the hostname
 * doesn't resolve to a private/internal IP address
 */
export async function validateScanUrlWithDNS(url: string): Promise<{ valid: boolean; error?: string; normalizedUrl?: string }> {
  // First run synchronous validation
  const syncValidation = validateScanUrl(url);
  if (!syncValidation.valid) {
    return syncValidation;
  }

  // Now perform DNS resolution check
  try {
    const urlObj = new URL(syncValidation.normalizedUrl!);
    const hostname = urlObj.hostname;

    // Skip DNS check for IP addresses (already validated above)
    const ipv4Match = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
    if (!ipv4Match) {
      const dnsValidation = await resolveAndValidate(hostname);
      if (!dnsValidation.valid) {
        return { valid: false, error: dnsValidation.error };
      }
    }

    return syncValidation;
  } catch {
    return { valid: false, error: "Failed to validate URL" };
  }
}

export interface SecurityScanResult {
  url: string;
  overallScore: number;
  checks: {
    ssl: SecurityCheckResult;
    headers: SecurityCheckResult;
    cookies: SecurityCheckResult;
    https: SecurityCheckResult;
  };
  vulnerabilities: Vulnerability[];
  scannedAt: Date;
}

export interface Vulnerability {
  category: string;
  severity: "critical" | "high" | "medium" | "low" | "info";
  title: string;
  description: string;
  remediation: string;
}

// Check SSL certificate
export async function checkSSL(url: string): Promise<SecurityCheckResult> {
  try {
    const urlObj = new URL(url);

    // Check if using HTTPS
    if (urlObj.protocol !== "https:") {
      return {
        passed: false,
        score: 0,
        details: "Site is not using HTTPS",
        severity: "critical",
        remediation: "Enable HTTPS by installing an SSL certificate",
      };
    }

    // Make request to check SSL
    const response = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
    });

    // If we can connect via HTTPS, SSL is working
    if (response.ok || response.status < 500) {
      return {
        passed: true,
        score: 100,
        details: "Valid SSL certificate detected",
        severity: "info",
      };
    }

    return {
      passed: false,
      score: 50,
      details: "SSL certificate may have issues",
      severity: "high",
      remediation: "Check your SSL certificate validity and chain",
    };
  } catch (error) {
    return {
      passed: false,
      score: 0,
      details: `SSL check failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      severity: "critical",
      remediation: "Ensure your SSL certificate is properly configured",
    };
  }
}

// Check security headers
export async function checkSecurityHeaders(url: string): Promise<SecurityCheckResult> {
  const vulnerabilities: string[] = [];
  let score = 100;

  try {
    const response = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
    });

    const headers = response.headers;

    // Check for important security headers
    const securityHeaders = {
      "strict-transport-security": {
        weight: 20,
        name: "HSTS",
        remediation: "Add Strict-Transport-Security header",
      },
      "x-content-type-options": {
        weight: 15,
        name: "X-Content-Type-Options",
        remediation: "Add X-Content-Type-Options: nosniff header",
      },
      "x-frame-options": {
        weight: 15,
        name: "X-Frame-Options",
        remediation: "Add X-Frame-Options: DENY or SAMEORIGIN header",
      },
      "content-security-policy": {
        weight: 25,
        name: "CSP",
        remediation: "Implement a Content Security Policy",
      },
      "x-xss-protection": {
        weight: 10,
        name: "XSS Protection",
        remediation: "Add X-XSS-Protection header",
      },
      "referrer-policy": {
        weight: 10,
        name: "Referrer Policy",
        remediation: "Add Referrer-Policy header",
      },
      "permissions-policy": {
        weight: 5,
        name: "Permissions Policy",
        remediation: "Add Permissions-Policy header",
      },
    };

    for (const [header, config] of Object.entries(securityHeaders)) {
      if (!headers.get(header)) {
        vulnerabilities.push(`Missing ${config.name} header`);
        score -= config.weight;
      }
    }

    const passed = score >= 70;
    let severity: SecurityCheckResult["severity"] = "info";
    if (score < 50) severity = "critical";
    else if (score < 70) severity = "high";
    else if (score < 85) severity = "medium";
    else if (score < 100) severity = "low";

    return {
      passed,
      score: Math.max(0, score),
      details:
        vulnerabilities.length > 0
          ? `Missing headers: ${vulnerabilities.join(", ")}`
          : "All important security headers present",
      severity,
      remediation:
        vulnerabilities.length > 0
          ? "Add missing security headers to your web server configuration"
          : undefined,
    };
  } catch (error) {
    return {
      passed: false,
      score: 0,
      details: `Header check failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      severity: "high",
      remediation: "Ensure the website is accessible",
    };
  }
}

// Check HTTPS enforcement
export async function checkHTTPSEnforcement(url: string): Promise<SecurityCheckResult> {
  try {
    const urlObj = new URL(url);
    const httpUrl = `http://${urlObj.host}${urlObj.pathname}`;

    const response = await fetch(httpUrl, {
      method: "HEAD",
      redirect: "manual",
    });

    // Check if HTTP redirects to HTTPS
    const location = response.headers.get("location");
    if (response.status >= 300 && response.status < 400 && location?.startsWith("https://")) {
      return {
        passed: true,
        score: 100,
        details: "HTTP properly redirects to HTTPS",
        severity: "info",
      };
    }

    return {
      passed: false,
      score: 30,
      details: "HTTP does not redirect to HTTPS",
      severity: "high",
      remediation: "Configure your web server to redirect all HTTP traffic to HTTPS",
    };
  } catch {
    // HTTP might be completely disabled, which is good
    return {
      passed: true,
      score: 100,
      details: "HTTP appears to be disabled (HTTPS only)",
      severity: "info",
    };
  }
}

// Check cookie security
export async function checkCookieSecurity(url: string): Promise<SecurityCheckResult> {
  try {
    const response = await fetch(url, {
      method: "GET",
      redirect: "follow",
    });

    const cookies = response.headers.get("set-cookie");

    if (!cookies) {
      return {
        passed: true,
        score: 100,
        details: "No cookies set by the page",
        severity: "info",
      };
    }

    let score = 100;
    const issues: string[] = [];

    // Check each cookie for security flags
    // Note: Set-Cookie headers joined by comma, but cookie values may contain commas in dates
    // Split on pattern: comma followed by space and a word (likely cookie name)
    const cookieLines = cookies
      .split(/,(?=\s*[A-Za-z_][A-Za-z0-9_]*=)/)
      .filter((c) => c.trim());

    for (const cookie of cookieLines) {
      const cookieLower = cookie.toLowerCase();

      if (!cookieLower.includes("secure")) {
        issues.push("Cookie missing Secure flag");
        score -= 15;
      }

      if (!cookieLower.includes("httponly")) {
        issues.push("Cookie missing HttpOnly flag");
        score -= 15;
      }

      if (!cookieLower.includes("samesite")) {
        issues.push("Cookie missing SameSite attribute");
        score -= 10;
      }
    }

    // Remove duplicates
    const uniqueIssues = Array.from(new Set(issues));

    const passed = score >= 70;
    let severity: SecurityCheckResult["severity"] = "info";
    if (score < 50) severity = "high";
    else if (score < 70) severity = "medium";
    else if (score < 100) severity = "low";

    return {
      passed,
      score: Math.max(0, score),
      details:
        uniqueIssues.length > 0
          ? `Cookie security issues: ${uniqueIssues.join(", ")}`
          : "All cookies have proper security flags",
      severity,
      remediation:
        uniqueIssues.length > 0
          ? "Add Secure, HttpOnly, and SameSite attributes to all cookies"
          : undefined,
    };
  } catch (error) {
    return {
      passed: false,
      score: 0,
      details: `Cookie check failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      severity: "medium",
    };
  }
}

// Run full security scan
export async function runSecurityScan(url: string): Promise<SecurityScanResult> {
  // Validate and normalize URL with DNS rebinding protection
  const validation = await validateScanUrlWithDNS(url);
  if (!validation.valid || !validation.normalizedUrl) {
    throw new Error(validation.error || "Invalid URL");
  }
  const targetUrl = validation.normalizedUrl;

  // Run all checks in parallel
  const [ssl, headers, https, cookies] = await Promise.all([
    checkSSL(targetUrl),
    checkSecurityHeaders(targetUrl),
    checkHTTPSEnforcement(targetUrl),
    checkCookieSecurity(targetUrl),
  ]);

  // Calculate overall score (weighted average)
  const weights = { ssl: 30, headers: 30, https: 20, cookies: 20 };
  const overallScore = Math.round(
    (ssl.score * weights.ssl +
      headers.score * weights.headers +
      https.score * weights.https +
      cookies.score * weights.cookies) /
      100
  );

  // Collect vulnerabilities
  const vulnerabilities: Vulnerability[] = [];

  const addVulnerability = (
    check: SecurityCheckResult,
    category: string,
    title: string
  ) => {
    if (!check.passed && check.remediation) {
      vulnerabilities.push({
        category,
        severity: check.severity,
        title,
        description: check.details,
        remediation: check.remediation,
      });
    }
  };

  addVulnerability(ssl, "ssl", "SSL Certificate Issue");
  addVulnerability(headers, "headers", "Missing Security Headers");
  addVulnerability(https, "configuration", "HTTPS Enforcement");
  addVulnerability(cookies, "cookies", "Cookie Security");

  return {
    url: targetUrl,
    overallScore,
    checks: { ssl, headers, cookies, https },
    vulnerabilities,
    scannedAt: new Date(),
  };
}
