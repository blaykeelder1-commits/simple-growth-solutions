import { analyzeWithAI, AIAnalysisResult } from "./ai-analyzer";

export interface CheckResult {
  passed: boolean;
  score: number;
  message: string;
  details?: string;
}

export interface AnalysisResult {
  url: string;
  score: number;
  checks: {
    ssl: CheckResult;
    mobile: CheckResult;
    seo: CheckResult;
    speed: CheckResult;
    accessibility: CheckResult;
    design: CheckResult;
  };
  recommendations: string[];
  aiAnalysis?: AIAnalysisResult;
}

export async function analyzeWebsite(url: string): Promise<AnalysisResult> {
  // Ensure URL has protocol
  const normalizedUrl = url.startsWith("http") ? url : `https://${url}`;

  // Fetch the website HTML for analysis
  let html = "";
  try {
    const response = await fetch(normalizedUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });
    html = await response.text();
  } catch {
    html = "";
  }

  // Run all checks
  const checks = {
    ssl: await checkSSL(normalizedUrl),
    mobile: await checkMobileFriendly(normalizedUrl, html),
    seo: await checkBasicSEO(html),
    speed: await checkSpeed(normalizedUrl),
    accessibility: await checkAccessibility(html),
    design: await checkDesignQuality(html),
  };

  // Calculate overall score (weighted average)
  const weights = { ssl: 15, mobile: 20, seo: 25, speed: 15, accessibility: 10, design: 15 };
  const score = Math.round(
    (checks.ssl.score * weights.ssl +
      checks.mobile.score * weights.mobile +
      checks.seo.score * weights.seo +
      checks.speed.score * weights.speed +
      checks.accessibility.score * weights.accessibility +
      checks.design.score * weights.design) /
      100
  );

  // Generate recommendations based on failed checks
  const recommendations: string[] = [];
  if (!checks.ssl.passed) {
    recommendations.push("Enable HTTPS/SSL certificate for secure browsing");
  }
  if (!checks.mobile.passed) {
    recommendations.push("Optimize website for mobile devices");
  }
  if (!checks.seo.passed) {
    recommendations.push("Improve SEO with proper meta tags and headings");
  }
  if (!checks.speed.passed) {
    recommendations.push("Improve page load speed for better user experience");
  }
  if (!checks.accessibility.passed) {
    recommendations.push("Improve accessibility for users with disabilities");
  }
  if (!checks.design.passed) {
    recommendations.push("Modernize design with better structure and visuals");
  }

  // Run AI analysis for deeper insights
  let aiAnalysis: AIAnalysisResult | undefined;
  if (process.env.ANTHROPIC_API_KEY && html) {
    try {
      aiAnalysis = await analyzeWithAI(normalizedUrl, html, {
        ssl: checks.ssl,
        mobile: checks.mobile,
        seo: checks.seo,
        speed: checks.speed,
      });
    } catch {
      // AI analysis failed, continue without AI insights
    }
  }

  return {
    url: normalizedUrl,
    score,
    checks,
    recommendations,
    aiAnalysis,
  };
}

async function checkSSL(url: string): Promise<CheckResult> {
  const isHttps = url.startsWith("https://");
  return {
    passed: isHttps,
    score: isHttps ? 100 : 0,
    message: isHttps ? "SSL certificate detected" : "No SSL certificate found",
    details: isHttps
      ? "Your site uses HTTPS for secure connections"
      : "Your site should use HTTPS to protect visitor data and build trust",
  };
}

async function checkMobileFriendly(_url: string, html: string): Promise<CheckResult> {
  let score = 0;
  const issues: string[] = [];

  // Check for viewport meta tag
  const hasViewport = html.includes('name="viewport"') || html.includes("name='viewport'");
  if (hasViewport) {
    score += 50;
  } else {
    issues.push("Missing viewport meta tag");
  }

  // Check for responsive indicators
  const hasMediaQueries = html.includes("@media") || html.includes("min-width") || html.includes("max-width");
  if (hasMediaQueries) {
    score += 25;
  } else {
    issues.push("No responsive CSS detected");
  }

  // Check for mobile-friendly frameworks
  const hasFramework =
    html.includes("bootstrap") ||
    html.includes("tailwind") ||
    html.includes("foundation") ||
    html.includes("bulma");
  if (hasFramework) {
    score += 25;
  }

  return {
    passed: score >= 50,
    score,
    message: score >= 50 ? "Mobile viewport configured" : "Not optimized for mobile",
    details: issues.length > 0 ? issues.join(", ") : "Site appears mobile-friendly",
  };
}

async function checkBasicSEO(html: string): Promise<CheckResult> {
  let score = 0;
  const issues: string[] = [];

  // Check for title tag
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (titleMatch && titleMatch[1].length > 10) {
    score += 25;
  } else {
    issues.push("Missing or inadequate title tag");
  }

  // Check for meta description
  const hasDescription =
    html.includes('name="description"') || html.includes("name='description'");
  if (hasDescription) {
    score += 25;
  } else {
    issues.push("Missing meta description");
  }

  // Check for H1 tag
  const h1Count = (html.match(/<h1[^>]*>/gi) || []).length;
  if (h1Count === 1) {
    score += 20;
  } else if (h1Count > 1) {
    score += 10;
    issues.push("Multiple H1 tags (should have exactly one)");
  } else {
    issues.push("Missing H1 heading");
  }

  // Check for proper heading hierarchy
  const hasH2 = /<h2[^>]*>/i.test(html);
  if (hasH2) {
    score += 15;
  }

  // Check for image alt tags
  const images = html.match(/<img[^>]*>/gi) || [];
  const imagesWithAlt = images.filter((img) => img.includes("alt=")).length;
  if (images.length === 0 || imagesWithAlt / images.length >= 0.8) {
    score += 15;
  } else {
    issues.push("Images missing alt text");
  }

  return {
    passed: score >= 60,
    score,
    message: score >= 60 ? "Basic SEO elements present" : "SEO improvements needed",
    details: issues.length > 0 ? issues.join(", ") : "Good SEO foundation",
  };
}

async function checkSpeed(url: string): Promise<CheckResult> {
  try {
    const start = Date.now();
    await fetch(url);
    const loadTime = Date.now() - start;

    // Score based on response time
    let score = 100;
    if (loadTime > 500) score = 85;
    if (loadTime > 1000) score = 70;
    if (loadTime > 2000) score = 50;
    if (loadTime > 3000) score = 30;
    if (loadTime > 5000) score = 10;

    return {
      passed: loadTime < 2000,
      score,
      message: `Page loaded in ${loadTime}ms`,
      details:
        loadTime < 1000
          ? "Excellent load time"
          : loadTime < 2000
            ? "Good load time, but could be faster"
            : "Slow load time - visitors may leave before page loads",
    };
  } catch {
    return {
      passed: false,
      score: 0,
      message: "Could not measure load time",
      details: "Unable to reach the website",
    };
  }
}

async function checkAccessibility(html: string): Promise<CheckResult> {
  let score = 0;
  const issues: string[] = [];

  // Check for lang attribute
  if (html.includes('lang="') || html.includes("lang='")) {
    score += 20;
  } else {
    issues.push("Missing language attribute");
  }

  // Check for form labels
  const formInputs = (html.match(/<input[^>]*>/gi) || []).length;
  const labels = (html.match(/<label[^>]*>/gi) || []).length;
  if (formInputs === 0 || labels >= formInputs * 0.8) {
    score += 20;
  } else {
    issues.push("Form inputs missing labels");
  }

  // Check for alt text on images
  const images = html.match(/<img[^>]*>/gi) || [];
  const imagesWithAlt = images.filter((img) => img.includes("alt=")).length;
  if (images.length === 0 || imagesWithAlt / images.length >= 0.8) {
    score += 25;
  } else {
    issues.push("Images missing alt text for screen readers");
  }

  // Check for ARIA landmarks or semantic HTML
  const hasSemanticHTML =
    html.includes("<main") ||
    html.includes("<nav") ||
    html.includes("<header") ||
    html.includes("<footer") ||
    html.includes('role="');
  if (hasSemanticHTML) {
    score += 20;
  } else {
    issues.push("Missing semantic HTML elements");
  }

  // Check for skip links
  if (html.includes("skip") && html.includes("content")) {
    score += 15;
  }

  return {
    passed: score >= 50,
    score,
    message: score >= 50 ? "Basic accessibility features present" : "Accessibility needs improvement",
    details: issues.length > 0 ? issues.join(", ") : "Good accessibility foundation",
  };
}

async function checkDesignQuality(html: string): Promise<CheckResult> {
  let score = 0;
  const issues: string[] = [];

  // Check for modern CSS framework
  const hasModernFramework =
    html.includes("tailwind") ||
    html.includes("bootstrap") ||
    html.includes("bulma") ||
    html.includes("chakra");
  if (hasModernFramework) {
    score += 30;
  }

  // Check for custom fonts
  const hasCustomFonts =
    html.includes("fonts.googleapis.com") ||
    html.includes("fonts.gstatic.com") ||
    html.includes("@font-face");
  if (hasCustomFonts) {
    score += 20;
  } else {
    issues.push("Using only system fonts");
  }

  // Check for CSS stylesheets
  const stylesheetCount = (html.match(/<link[^>]*stylesheet[^>]*>/gi) || []).length;
  if (stylesheetCount >= 1) {
    score += 20;
  }

  // Check for inline styles (bad practice)
  const inlineStyles = (html.match(/style="[^"]*"/gi) || []).length;
  if (inlineStyles < 10) {
    score += 15;
  } else {
    issues.push("Excessive inline styles");
  }

  // Check for modern layout (flexbox, grid)
  if (html.includes("flex") || html.includes("grid")) {
    score += 15;
  } else {
    issues.push("Not using modern CSS layout");
  }

  return {
    passed: score >= 50,
    score,
    message: score >= 50 ? "Modern design elements detected" : "Design could be modernized",
    details: issues.length > 0 ? issues.join(", ") : "Good design foundation",
  };
}

export { analyzeWithAI, type AIAnalysisResult, type PainPoint } from "./ai-analyzer";
