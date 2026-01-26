"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  Star,
  Settings,
  RefreshCw,
  Zap,
  ArrowUpRight,
  Users,
  Brain,
} from "lucide-react";

interface DashboardStats {
  revenueToday: number;
  revenueThisWeek: number;
  revenueThisMonth: number;
  transactionsToday: number;
  avgTicket: number;
  reviewsThisMonth: number;
  avgRating: number;
  integrationsConnected: number;
}

export default function ChauffeurDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setError(null);
        const res = await fetch("/api/chauffeur/stats");
        if (res.ok) {
          const data = await res.json();
          setStats(data.stats);
        } else {
          const errorData = await res.json().catch(() => ({}));
          setError(errorData.message || "Failed to load dashboard data");
        }
      } catch {
        setError("Unable to connect to server. Please try again later.");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(cents / 100);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
          <span className="text-2xl">!</span>
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Something went wrong</h2>
        <p className="text-gray-500 mb-4">{error}</p>
        <Button onClick={() => window.location.reload()} variant="outline">
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Business Chauffeur</h1>
          <p className="text-gray-500 mt-1">AI-powered business insights and analytics</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="bg-white/50 hover:bg-white">
            <RefreshCw className="h-4 w-4 mr-2" />
            Sync Data
          </Button>
          <Link href="/dashboard/chauffeur/integrations">
            <Button className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-lg shadow-purple-500/25">
              <Settings className="h-4 w-4 mr-2" />
              Integrations
            </Button>
          </Link>
        </div>
      </div>

      {/* Integration status banner */}
      {stats?.integrationsConnected === 0 && (
        <Card variant="gradient" className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 overflow-hidden relative">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=%2260%22 height=%2260%22 viewBox=%220 0 60 60%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cg fill=%22none%22 fill-rule=%22evenodd%22%3E%3Cg fill=%22%23ffffff%22 fill-opacity=%220.1%22%3E%3Cpath d=%22M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-30" />
          <CardContent className="py-6 relative">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <Zap className="h-7 w-7 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-white text-lg">Connect your first integration</p>
                  <p className="text-white/80 text-sm mt-0.5">
                    Link your POS, accounting, or review platforms to get AI-powered insights
                  </p>
                </div>
              </div>
              <Link href="/dashboard/chauffeur/integrations">
                <Button className="bg-white text-indigo-600 hover:bg-white/90 shadow-lg">
                  Get Started
                  <ArrowUpRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats grid */}
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
        <Card variant="professional" hover="lift" className="stat-card stat-card-green">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Today&apos;s Revenue
            </CardTitle>
            <div className="icon-container icon-container-green">
              <DollarSign className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">
              {stats ? formatCurrency(stats.revenueToday) : "$0.00"}
            </div>
            <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
              {stats?.transactionsToday || 0} transactions
            </p>
          </CardContent>
        </Card>

        <Card variant="professional" hover="lift" className="stat-card stat-card-blue">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              This Week
            </CardTitle>
            <div className="icon-container icon-container-blue">
              <TrendingUp className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">
              {stats ? formatCurrency(stats.revenueThisWeek) : "$0.00"}
            </div>
            <p className="text-sm text-emerald-600 flex items-center gap-1 mt-1">
              <TrendingUp className="h-3 w-3" />
              vs last week
            </p>
          </CardContent>
        </Card>

        <Card variant="professional" hover="lift" className="stat-card stat-card-purple">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              This Month
            </CardTitle>
            <div className="icon-container icon-container-purple">
              <BarChart3 className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">
              {stats ? formatCurrency(stats.revenueThisMonth) : "$0.00"}
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Avg ticket: {stats ? formatCurrency(stats.avgTicket) : "$0.00"}
            </p>
          </CardContent>
        </Card>

        <Card variant="professional" hover="lift" className="stat-card stat-card-orange">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Reviews
            </CardTitle>
            <div className="icon-container icon-container-orange">
              <Star className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              {stats?.avgRating?.toFixed(1) || "—"}
              <Star className="h-6 w-6 text-amber-400 fill-amber-400" />
            </div>
            <p className="text-sm text-gray-500 mt-1">
              {stats?.reviewsThisMonth || 0} reviews this month
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main content */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* AI Insights */}
        <Card variant="professional">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Zap className="h-5 w-5 text-amber-500" />
                AI Insights
              </CardTitle>
              <CardDescription>Recommendations to grow your business</CardDescription>
            </div>
            <Link href="/dashboard/chauffeur/insights">
              <Button variant="outline" size="sm" className="bg-white/50 hover:bg-white">
                View All
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="text-center py-10">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="h-8 w-8 text-amber-600" />
              </div>
              <p className="text-gray-600 font-medium">No insights yet</p>
              <p className="text-sm text-gray-500 mt-1">Connect integrations to get AI-powered recommendations</p>
            </div>
          </CardContent>
        </Card>

        {/* Connected Integrations */}
        <Card variant="professional">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">Integrations</CardTitle>
              <CardDescription>Connected data sources</CardDescription>
            </div>
            <Link href="/dashboard/chauffeur/integrations">
              <Button variant="outline" size="sm" className="bg-white/50 hover:bg-white">
                Manage
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { name: "QuickBooks", type: "Accounting", connected: false, icon: "Q", color: "from-green-400 to-green-600" },
                { name: "Square", type: "POS", connected: false, icon: "S", color: "from-blue-400 to-blue-600" },
                { name: "Google Business", type: "Reviews", connected: false, icon: "G", color: "from-red-400 to-yellow-500" },
              ].map((integration) => (
                <div
                  key={integration.name}
                  className="integration-card flex items-center justify-between"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${integration.color} flex items-center justify-center text-white font-bold text-lg shadow-md`}>
                      {integration.icon}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{integration.name}</p>
                      <p className="text-sm text-gray-500">{integration.type}</p>
                    </div>
                  </div>
                  <Badge className={integration.connected ? "bg-emerald-100 text-emerald-800 border border-emerald-200" : "bg-gray-100 text-gray-600 border border-gray-200"}>
                    {integration.connected ? "Connected" : "Not Connected"}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick actions */}
      <Card variant="professional">
        <CardHeader>
          <CardTitle className="text-lg">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Link href="/dashboard/chauffeur/integrations">
              <div className="quick-action-card group">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform shadow-lg shadow-blue-500/25">
                  <Settings className="h-6 w-6 text-white" />
                </div>
                <h4 className="font-semibold text-gray-900">Connect POS</h4>
                <p className="text-sm text-gray-500 mt-1">Square, Clover, Toast</p>
              </div>
            </Link>

            <Link href="/dashboard/chauffeur/integrations">
              <div className="quick-action-card group">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform shadow-lg shadow-emerald-500/25">
                  <DollarSign className="h-6 w-6 text-white" />
                </div>
                <h4 className="font-semibold text-gray-900">Link Accounting</h4>
                <p className="text-sm text-gray-500 mt-1">QuickBooks, Xero</p>
              </div>
            </Link>

            <Link href="/dashboard/chauffeur/integrations">
              <div className="quick-action-card group">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform shadow-lg shadow-amber-500/25">
                  <Star className="h-6 w-6 text-white" />
                </div>
                <h4 className="font-semibold text-gray-900">Monitor Reviews</h4>
                <p className="text-sm text-gray-500 mt-1">Google, Yelp</p>
              </div>
            </Link>

            <Link href="/dashboard/chauffeur/insights">
              <div className="quick-action-card group">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform shadow-lg shadow-purple-500/25">
                  <TrendingUp className="h-6 w-6 text-white" />
                </div>
                <h4 className="font-semibold text-gray-900">View Insights</h4>
                <p className="text-sm text-gray-500 mt-1">AI recommendations</p>
              </div>
            </Link>

            <Link href="/dashboard/payroll">
              <div className="quick-action-card group">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform shadow-lg shadow-teal-500/25">
                  <Users className="h-6 w-6 text-white" />
                </div>
                <h4 className="font-semibold text-gray-900">Payroll Analytics</h4>
                <p className="text-sm text-gray-500 mt-1">Staffing insights</p>
              </div>
            </Link>

            <Link href="/dashboard/chauffeur/unified">
              <div className="quick-action-card group">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform shadow-lg shadow-indigo-500/25">
                  <Brain className="h-6 w-6 text-white" />
                </div>
                <h4 className="font-semibold text-gray-900">Unified Intelligence</h4>
                <p className="text-sm text-gray-500 mt-1">Cross-system analysis</p>
              </div>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Unified Intelligence CTA */}
      <Card className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white overflow-hidden relative">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=%2260%22 height=%2260%22 viewBox=%220 0 60 60%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cg fill=%22none%22 fill-rule=%22evenodd%22%3E%3Cg fill=%22%23ffffff%22 fill-opacity=%220.1%22%3E%3Cpath d=%22M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-30" />
        <CardContent className="py-8 relative">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <Brain className="h-8 w-8 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-semibold">Unified Business Intelligence</h3>
                <p className="text-white/80 mt-1">
                  See how all your data connects with AI-powered cross-system analysis
                </p>
              </div>
            </div>
            <Link href="/dashboard/chauffeur/unified">
              <Button className="bg-white text-indigo-600 hover:bg-white/90 shadow-lg whitespace-nowrap">
                <Brain className="h-4 w-4 mr-2" />
                View Unified Insights
                <ArrowUpRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
