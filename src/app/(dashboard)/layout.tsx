"use client";

import { useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";
import {
  LogOut,
  Menu,
  X,
  ChevronDown,
} from "lucide-react";
import { ChatWidget } from "@/components/chat/chat-widget";
import { Button } from "@/components/ui/button";
import { signOut } from "next-auth/react";
import { useState } from "react";
import { SubscriptionProvider } from "@/lib/subscription/context";
import { UpgradeBanner } from "@/components/upgrade-banner";
import { dashboardNavigation as navigation } from "@/lib/config/navigation";

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

  // Restore sidebar state from localStorage after hydration to avoid SSR mismatch
  useEffect(() => {
    try {
      const saved = localStorage.getItem("sgs-sidebar-sections");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) setExpandedSections(parsed);
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login?callbackUrl=/dashboard");
    }
  }, [status, router]);

  const toggleSection = (name: string) => {
    setExpandedSections((prev) => {
      const next = prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name];
      try { localStorage.setItem("sgs-sidebar-sections", JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
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

        <nav aria-label="Dashboard navigation" className="p-4 space-y-1">
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
                          : (item as { highlight?: boolean }).highlight
                          ? "bg-gradient-to-r from-purple-100 to-pink-100 text-purple-700 hover:from-purple-200 hover:to-pink-200 font-medium"
                          : "text-gray-600 hover:bg-white/60 hover:text-gray-900"
                      }`}
                    >
                      <item.icon className="h-4 w-4" />
                      {item.name}
                      {(item as { highlight?: boolean }).highlight && pathname !== item.href && (
                        <span className="ml-auto px-1.5 py-0.5 text-[10px] font-bold bg-purple-500 text-white rounded">
                          NEW
                        </span>
                      )}
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

        <main className="p-6 lg:p-8">
          <SubscriptionProvider>
            <UpgradeBanner />
            {children}
          </SubscriptionProvider>
        </main>
      </div>

      {/* Floating Chat Widget */}
      <ChatWidget position="bottom-right" />
    </div>
  );
}
