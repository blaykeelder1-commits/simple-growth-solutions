import {
  LayoutDashboard,
  DollarSign,
  Users,
  FileText,
  TrendingUp,
  Shield,
  BarChart3,
  Settings,
  MessageCircle,
  PiggyBank,
  Brain,
  Calculator,
  Zap,
} from "lucide-react";

export const dashboardNavigation = [
  {
    name: "Cash Flow AI",
    icon: TrendingUp,
    children: [
      { name: "Dashboard", href: "/dashboard/cashflow", icon: LayoutDashboard },
      { name: "Work Invoices", href: "/dashboard/cashflow/action-plan", icon: Zap, highlight: true },
      { name: "Invoices", href: "/dashboard/cashflow/invoices", icon: FileText },
      { name: "Clients", href: "/dashboard/cashflow/clients", icon: Users },
      { name: "Recommendations", href: "/dashboard/cashflow/recommendations", icon: DollarSign },
    ],
  },
  {
    name: "Business Chauffeur",
    icon: BarChart3,
    children: [
      { name: "Dashboard", href: "/dashboard/chauffeur", icon: LayoutDashboard },
      { name: "Unified Intelligence", href: "/dashboard/chauffeur/unified", icon: Brain },
      { name: "Insights", href: "/dashboard/chauffeur/insights", icon: TrendingUp },
      { name: "Payroll Analytics", href: "/dashboard/payroll", icon: PiggyBank },
      { name: "ROI Calculator", href: "/dashboard/roi", icon: Calculator },
      { name: "Integrations", href: "/dashboard/chauffeur/integrations", icon: Settings },
    ],
  },
  {
    name: "AI Assistant",
    icon: MessageCircle,
    children: [
      { name: "Chat", href: "/dashboard/chat", icon: MessageCircle },
    ],
  },
  {
    name: "Security",
    icon: Shield,
    children: [
      { name: "Dashboard", href: "/dashboard/security", icon: LayoutDashboard },
      { name: "Scans", href: "/dashboard/security/scans", icon: Shield },
    ],
  },
] as const;
