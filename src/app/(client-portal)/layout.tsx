"use client";

import { useSession } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  Globe,
  FileText,
  CreditCard,
  Settings,
  LogOut,
  Menu,
  X,
  Sparkles,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { signOut } from "next-auth/react";
import { useState } from "react";

const navigation = [
  { name: "Dashboard", href: "/portal", icon: LayoutDashboard },
  { name: "My Projects", href: "/portal/projects", icon: Globe },
  { name: "Change Requests", href: "/portal/requests", icon: FileText },
  { name: "Upgrades", href: "/portal/upgrades", icon: Sparkles },
  { name: "Billing", href: "/portal/billing", icon: CreditCard },
  { name: "Settings", href: "/portal/settings", icon: Settings },
];

export default function ClientPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      const target = pathname && pathname !== "/login" ? pathname : "/portal";
      router.replace(`/login?callbackUrl=${encodeURIComponent(target)}`);
    }
  }, [status, pathname, router]);

  // Branded splash so the customer never sees a blank page while NextAuth
  // resolves the session OR while we're redirecting to /login.
  if (status !== "authenticated") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center shadow-lg">
            <Sparkles className="h-6 w-6 text-white" />
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600" />
            {status === "loading" ? "Loading your portal..." : "Redirecting to sign in..."}
          </div>
        </div>
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
          <Link href="/portal" className="font-bold text-xl bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            SGS Portal
          </Link>
          <button
            className="lg:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close menu"
          >
            <X className="h-6 w-6 text-gray-500" />
          </button>
        </div>

        <nav className="p-4 space-y-1">
          {navigation.map((item) => {
            const isActive =
              item.href === "/portal"
                ? pathname === "/portal"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                  isActive
                    ? "bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-md shadow-blue-500/25"
                    : "text-gray-700 hover:bg-white/60"
                }`}
              >
                <div className={`p-1.5 rounded-lg ${
                  isActive
                    ? "bg-white/20"
                    : "bg-gradient-to-br from-blue-50 to-indigo-50"
                }`}>
                  <item.icon className={`h-4 w-4 ${isActive ? "text-white" : "text-blue-600"}`} />
                </div>
                <span className="font-medium">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-100/50 bg-white/30">
          <div className="mb-3 px-3">
            <p className="text-sm font-medium text-gray-900">
              {session.user?.name || session.user?.email}
            </p>
            <p className="text-xs text-gray-500">{session.user?.email}</p>
          </div>
          {/* Staff-only shortcut back to the command center. Lets an admin who
              signed in through the customer door return to /admin in one click. */}
          {session.user?.role === "admin" && (
            <Link href="/admin">
              <Button
                variant="outline"
                className="w-full justify-start gap-2 mb-2 bg-white/50 hover:bg-white border-gray-200 text-indigo-700"
              >
                <ShieldCheck className="h-4 w-4" />
                Admin Dashboard
              </Button>
            </Link>
          )}
          <Button
            variant="outline"
            className="w-full justify-start gap-2 bg-white/50 hover:bg-white border-gray-200"
            onClick={() => signOut({ callbackUrl: "/" })}
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Mobile header */}
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-gray-100 lg:hidden">
          <div className="flex items-center justify-between h-16 px-4">
            <button onClick={() => setSidebarOpen(true)} aria-label="Open menu">
              <Menu className="h-6 w-6 text-gray-600" />
            </button>
            <span className="font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">SGS Portal</span>
            <div className="w-6" /> {/* Spacer */}
          </div>
        </header>

        <main className="p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
