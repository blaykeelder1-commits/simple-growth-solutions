// Demo Mode Library
// Manages demo organization state and session limits

import { prisma } from "@/lib/db/prisma";

// Demo organization identifier
export const DEMO_ORG_ID = "demo-riverside-coffee-shop";
export const DEMO_ORG_NAME = "Riverside Coffee Shop";
export const DEMO_SESSION_DURATION_MS = 15 * 60 * 1000; // 15 minutes

export interface DemoSession {
  organizationId: string;
  startedAt: Date;
  expiresAt: Date;
  isExpired: boolean;
  remainingMs: number;
}

// Check if an organization is a demo organization
export function isDemoOrganization(organizationId: string | null | undefined): boolean {
  return organizationId === DEMO_ORG_ID;
}

// Get demo session info
export function getDemoSession(startTime: Date): DemoSession {
  const now = new Date();
  const expiresAt = new Date(startTime.getTime() + DEMO_SESSION_DURATION_MS);
  const remainingMs = Math.max(0, expiresAt.getTime() - now.getTime());
  const isExpired = remainingMs <= 0;

  return {
    organizationId: DEMO_ORG_ID,
    startedAt: startTime,
    expiresAt,
    isExpired,
    remainingMs,
  };
}

// Format remaining time for display
export function formatRemainingTime(ms: number): string {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

// Check if demo organization exists
export async function ensureDemoOrganization(): Promise<string> {
  const existing = await prisma.organization.findUnique({
    where: { id: DEMO_ORG_ID },
  });

  if (existing) {
    return DEMO_ORG_ID;
  }

  // Create demo organization if it doesn't exist
  await createDemoOrganization();
  return DEMO_ORG_ID;
}

// Create demo organization with sample data
async function createDemoOrganization(): Promise<void> {
  await prisma.organization.create({
    data: {
      id: DEMO_ORG_ID,
      name: DEMO_ORG_NAME,
      industry: "restaurant",
      annualRevenueTier: "500k-1m",
      timezone: "America/New_York",
      currency: "USD",
      subscriptionTier: "pro",
      subscriptionStatus: "demo",
    },
  });
}

// Demo data statistics for display
export interface DemoDataStats {
  clients: number;
  invoices: number;
  totalRevenue: number;
  overdueAmount: number;
  healthScore: number;
  monthsOfData: number;
}

// Get demo organization statistics
export async function getDemoStats(): Promise<DemoDataStats | null> {
  const org = await prisma.organization.findUnique({
    where: { id: DEMO_ORG_ID },
    include: {
      clients: true,
      invoices: true,
    },
  });

  if (!org) {
    return null;
  }

  const now = new Date();
  const overdueInvoices = org.invoices.filter(
    (inv) => new Date(inv.dueDate) < now && inv.status !== "paid"
  );

  const totalRevenue = org.invoices.reduce(
    (sum, inv) => sum + Number(inv.amount),
    0
  );
  const overdueAmount = overdueInvoices.reduce(
    (sum, inv) => sum + (Number(inv.amount) - Number(inv.amountPaid)),
    0
  );

  // Calculate simple health score
  const overdueRatio = totalRevenue > 0 ? overdueAmount / totalRevenue : 0;
  const healthScore = Math.max(0, Math.min(100, 85 - overdueRatio * 100));

  return {
    clients: org.clients.length,
    invoices: org.invoices.length,
    totalRevenue,
    overdueAmount,
    healthScore: Math.round(healthScore),
    monthsOfData: 6,
  };
}

// Tour steps configuration
export interface TourStep {
  id: string;
  title: string;
  description: string;
  target?: string; // CSS selector for highlighting
  placement?: "top" | "bottom" | "left" | "right";
  action?: "click" | "scroll" | "wait";
  nextDelay?: number; // ms to wait before showing next step
}

export const DEMO_TOUR_STEPS: TourStep[] = [
  {
    id: "welcome",
    title: "Welcome to Business Chauffeur",
    description:
      "This interactive demo shows how our platform could help you manage your business finances. Let's take a quick tour of the key features.",
    placement: "bottom",
  },
  {
    id: "health-score",
    title: "Cash Flow Health Score",
    description:
      "Your health score gives you an at-a-glance view of your cash flow situation. Riverside Coffee Shop currently has a score of 78, which is considered 'Good'.",
    target: "[data-tour='health-score']",
    placement: "bottom",
  },
  {
    id: "dashboard-stats",
    title: "Key Metrics Dashboard",
    description:
      "Track total receivables, overdue amounts, collections this month, and AI recommendations all in one place.",
    target: "[data-tour='stats-grid']",
    placement: "top",
  },
  {
    id: "ai-insights",
    title: "AI-Powered Insights",
    description:
      "Our AI analyzes your payment patterns and suggests possible actions you could take. Note: these are educational insights, not advice.",
    target: "[data-tour='ai-insights']",
    placement: "left",
  },
  {
    id: "client-scoring",
    title: "Client Payment Scoring",
    description:
      "Each client gets a payment score based on their history. This helps you understand payment patterns and identify potential risks.",
    target: "[data-tour='client-list']",
    placement: "top",
  },
  {
    id: "forecasting",
    title: "Cash Flow Forecasting",
    description:
      "See projected cash inflows for 30, 60, and 90 days based on historical patterns and current invoices.",
    target: "[data-tour='forecast']",
    placement: "bottom",
  },
  {
    id: "benchmarks",
    title: "Industry Benchmarks",
    description:
      "Compare your metrics against industry averages to see where you stand and identify potential areas for improvement.",
    target: "[data-tour='benchmarks']",
    placement: "left",
  },
  {
    id: "roi-calculator",
    title: "ROI Calculator",
    description:
      "See the potential value our platform could deliver based on your specific business data.",
    target: "[data-tour='roi']",
    placement: "top",
  },
  {
    id: "cta",
    title: "Ready to Get Started?",
    description:
      "You've seen how Business Chauffeur could help your business. Start your free trial to connect your real data and get personalized insights.",
    placement: "bottom",
  },
];

// Demo restrictions
export const DEMO_RESTRICTIONS = {
  canEdit: false,
  canDelete: false,
  canCreate: false,
  canExport: false,
  canIntegrate: false,
  message:
    "This is a read-only demo. Sign up for a free trial to make changes.",
};

// Check if action is allowed in demo mode
export function isDemoActionAllowed(
  action: keyof typeof DEMO_RESTRICTIONS
): boolean {
  return DEMO_RESTRICTIONS[action] === true;
}

// Get restriction message for demo
export function getDemoRestrictionMessage(): string {
  return DEMO_RESTRICTIONS.message;
}
