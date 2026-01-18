import { CheckResult } from "./index";

export type SeverityLevel = "critical" | "warning" | "info";

export interface ImprovementCategory {
  id: string;
  name: string;
  icon: string;
  canAutomate: boolean;
  businessImpact: {
    title: string;
    stat: string;
    source: string;
  };
}

export interface ImprovementItem {
  category: ImprovementCategory;
  severity: SeverityLevel;
  issue: string;
  solution: string;
  canAutomate: boolean;
  score: number;
}

// Define improvement categories with icons and automation flags
export const improvementCategories: Record<string, ImprovementCategory> = {
  security: {
    id: "security",
    name: "Security",
    icon: "Shield",
    canAutomate: true,
    businessImpact: {
      title: "Customer Trust",
      stat: "84% of consumers abandon purchases on sites without HTTPS",
      source: "GlobalSign Survey",
    },
  },
  mobile: {
    id: "mobile",
    name: "Mobile",
    icon: "Smartphone",
    canAutomate: true,
    businessImpact: {
      title: "Mobile Revenue",
      stat: "61% of users won't return to a site that isn't mobile-friendly",
      source: "Google Research",
    },
  },
  seo: {
    id: "seo",
    name: "SEO",
    icon: "Search",
    canAutomate: true,
    businessImpact: {
      title: "Organic Traffic",
      stat: "75% of users never scroll past the first page of search results",
      source: "HubSpot",
    },
  },
  speed: {
    id: "speed",
    name: "Speed",
    icon: "Zap",
    canAutomate: true,
    businessImpact: {
      title: "Conversion Rate",
      stat: "A 1-second delay in page load time causes 7% reduction in conversions",
      source: "Akamai",
    },
  },
  accessibility: {
    id: "accessibility",
    name: "Accessibility",
    icon: "Accessibility",
    canAutomate: true,
    businessImpact: {
      title: "Market Reach",
      stat: "15% of the global population has a disability - that's 1.3 billion potential customers",
      source: "WHO",
    },
  },
  design: {
    id: "design",
    name: "Design",
    icon: "Palette",
    canAutomate: false,
    businessImpact: {
      title: "First Impressions",
      stat: "94% of first impressions relate to your site's design",
      source: "ResearchGate",
    },
  },
};

// Map severity based on score
export function getSeverity(score: number): SeverityLevel {
  if (score < 40) return "critical";
  if (score < 70) return "warning";
  return "info";
}

// Get user-friendly issue description
function getIssueDescription(categoryId: string, check: CheckResult): string {
  if (check.passed) {
    return check.message;
  }

  const issueMap: Record<string, string> = {
    security: "No SSL certificate detected - visitors see 'Not Secure' warning",
    mobile: "Website not optimized for mobile devices",
    seo: "Missing critical SEO elements (meta tags, headings)",
    speed: `Slow load time (${check.message})`,
    accessibility: "Accessibility issues that exclude disabled users",
    design: "Outdated design patterns detected",
  };

  return issueMap[categoryId] || check.message;
}

// Get AI-powered solution description
function getSolutionDescription(categoryId: string, check: CheckResult): string {
  if (check.passed) {
    return "Looking good! No immediate action needed.";
  }

  const solutionMap: Record<string, string> = {
    security: "Install free SSL certificate and redirect all traffic to HTTPS",
    mobile: "Add responsive meta tags and optimize layouts for all screen sizes",
    seo: "Add meta descriptions, optimize headings, and fix image alt texts",
    speed: "Optimize images, enable compression, and implement caching",
    accessibility: "Add ARIA labels, fix form labels, and improve keyboard navigation",
    design: "Modernize with current design trends, better typography, and layout",
  };

  return solutionMap[categoryId] || "Our AI will analyze and provide specific fixes";
}

// Transform API analysis results to improvement items
export function mapChecksToImprovements(checks: {
  ssl: CheckResult;
  mobile: CheckResult;
  seo: CheckResult;
  speed: CheckResult;
  accessibility: CheckResult;
  design: CheckResult;
}): ImprovementItem[] {
  const checkToCategory: Record<string, string> = {
    ssl: "security",
    mobile: "mobile",
    seo: "seo",
    speed: "speed",
    accessibility: "accessibility",
    design: "design",
  };

  const improvements: ImprovementItem[] = [];

  for (const [checkKey, check] of Object.entries(checks)) {
    const categoryId = checkToCategory[checkKey];
    const category = improvementCategories[categoryId];

    if (category) {
      improvements.push({
        category,
        severity: getSeverity(check.score),
        issue: getIssueDescription(categoryId, check),
        solution: getSolutionDescription(categoryId, check),
        canAutomate: category.canAutomate && !check.passed,
        score: check.score,
      });
    }
  }

  // Sort by severity (critical first) then by score (lowest first)
  return improvements.sort((a, b) => {
    const severityOrder: Record<SeverityLevel, number> = { critical: 0, warning: 1, info: 2 };
    const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
    if (severityDiff !== 0) return severityDiff;
    return a.score - b.score;
  });
}

// Count total fixable issues
export function countFixableIssues(improvements: ImprovementItem[]): number {
  return improvements.filter((item) => !item.category.name && item.score < 70).length ||
    improvements.filter((item) => item.score < 70).length;
}

// Get total improvement count (issues that need attention)
export function getTotalImprovements(improvements: ImprovementItem[]): number {
  return improvements.filter((item) => item.score < 70).length;
}

// Score-based headline messaging
export interface ScoreBasedMessage {
  headline: string;
  subheadline: string;
  urgency: "critical" | "warning" | "opportunity";
}

export function getScoreBasedMessage(score: number): ScoreBasedMessage {
  if (score < 40) {
    return {
      headline: "Your website is in critical condition",
      subheadline: "Multiple critical issues are actively driving customers away",
      urgency: "critical",
    };
  }
  if (score < 70) {
    return {
      headline: "Your website is leaking customers",
      subheadline: "These issues are costing you sales every day",
      urgency: "warning",
    };
  }
  return {
    headline: "Your site works, but it's not working FOR you",
    subheadline: "Small optimizations can significantly increase conversions",
    urgency: "opportunity",
  };
}

// Get urgency color classes
export function getUrgencyColors(urgency: "critical" | "warning" | "opportunity") {
  switch (urgency) {
    case "critical":
      return {
        text: "text-red-600",
        bg: "bg-red-50",
        border: "border-red-200",
        gradient: "from-red-500 to-orange-500",
      };
    case "warning":
      return {
        text: "text-amber-600",
        bg: "bg-amber-50",
        border: "border-amber-200",
        gradient: "from-amber-500 to-orange-500",
      };
    default:
      return {
        text: "text-blue-600",
        bg: "bg-blue-50",
        border: "border-blue-200",
        gradient: "from-blue-500 to-purple-500",
      };
  }
}
