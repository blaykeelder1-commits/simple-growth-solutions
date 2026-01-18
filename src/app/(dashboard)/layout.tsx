"use client";

import { useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  DollarSign,
  Users,
  FileText,
  TrendingUp,
  Shield,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { signOut } from "next-auth/react";
import { useState } from "react";

const navigation = [
  {
    name: "Cash Flow AI",
    icon: TrendingUp,
    children: [
      { name: "Dashboard", href: "/dashboard/cashflow", icon: LayoutDashboard },
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
      { name: "Insights", href: "/dashboard/chauffeur/insights", icon: TrendingUp },
      { name: "Integrations", href: "/dashboard/chauffeur/integrations", icon: Settings },
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
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState<string[]>(["Cash Flow AI"]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login?callbackUrl=/dashboard");
    }
  }, [status, router]);

  const toggleSection = (name: string) => {
    setExpandedSections((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]
    );
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen dashboard-bg">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 sidebar-glass shadow-xl shadow-gray-200/50 transform transition-transform lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-100/50">
          <Link href="/dashboard" className="font-bold text-xl bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            SGS Dashboard
          </Link>
          <button className="lg:hidden" onClick={() => setSidebarOpen(false)}>
            <X className="h-6 w-6 text-gray-500" />
          </button>
        </div>

        <nav className="p-4 space-y-1">
          {navigation.map((section) => (
            <div key={section.name}>
              <button
                onClick={() => toggleSection(section.name)}
                className="flex items-center justify-between w-full px-3 py-2.5 text-gray-700 hover:bg-white/60 rounded-xl transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="p-1.5 rounded-lg bg-gradient-to-br from-blue-50 to-indigo-50">
                    <section.icon className="h-4 w-4 text-blue-600" />
                  </div>
                  <span className="font-medium">{section.name}</span>
                </div>
                <ChevronDown
                  className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${
                    expandedSections.includes(section.name) ? "rotate-180" : ""
                  }`}
                />
              </button>

              {expandedSections.includes(section.name) && (
                <div className="ml-4 mt-1 space-y-0.5 pl-4 border-l-2 border-gray-100">
                  {section.children.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${
                        pathname === item.href
                          ? "bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-md shadow-blue-500/25"
                          : "text-gray-600 hover:bg-white/60 hover:text-gray-900"
                      }`}
                    >
                      <item.icon className="h-4 w-4" />
                      {item.name}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-100/50 bg-white/30">
          <div className="mb-3 px-3">
            <p className="text-sm font-medium text-gray-900">
              {session.user?.name || session.user?.email}
            </p>
            <p className="text-xs text-gray-500">{session.user?.email}</p>
          </div>
          <div className="flex gap-2">
            <Link href="/portal" className="flex-1">
              <Button variant="outline" size="sm" className="w-full bg-white/50 hover:bg-white border-gray-200">
                Portal
              </Button>
            </Link>
            <Button
              variant="outline"
              size="sm"
              className="bg-white/50 hover:bg-white border-gray-200"
              onClick={() => signOut({ callbackUrl: "/" })}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Mobile header */}
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-gray-100 lg:hidden">
          <div className="flex items-center justify-between h-16 px-4">
            <button onClick={() => setSidebarOpen(true)}>
              <Menu className="h-6 w-6 text-gray-600" />
            </button>
            <span className="font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">SGS Dashboard</span>
            <div className="w-6" />
          </div>
        </header>

        <main className="p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
