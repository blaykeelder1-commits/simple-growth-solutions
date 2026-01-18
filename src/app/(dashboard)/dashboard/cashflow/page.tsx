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
import { Button } from "@/components/ui/button";
import {
  DollarSign,
  TrendingUp,
  AlertTriangle,
  FileText,
  Users,
  ArrowUpRight,
  Clock,
  Sparkles,
} from "lucide-react";

interface DashboardStats {
  totalReceivables: number;
  overdueReceivables: number;
  collectedThisMonth: number;
  projectedInflow30d: number;
  healthScore: number;
  overdueInvoices: number;
  totalClients: number;
  pendingRecommendations: number;
}

export default function CashFlowDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const statsRes = await fetch("/api/cashflow/stats");

        if (statsRes.ok) {
          const data = await statsRes.json();
          setStats(data.stats);
        }
      } catch {
        // Error handled silently - UI shows empty state
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(cents / 100);
  };

  const getHealthColor = (score: number) => {
    if (score >= 80) return "from-emerald-400 to-green-600";
    if (score >= 60) return "from-yellow-400 to-orange-500";
    if (score >= 40) return "from-orange-500 to-red-500";
    return "from-red-500 to-red-700";
  };

  const getHealthLabel = (score: number) => {
    if (score >= 80) return "Excellent";
    if (score >= 60) return "Good";
    if (score >= 40) return "Needs Attention";
    return "Critical";
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Cash Flow AI</h1>
          <p className="text-gray-500 mt-1">
            Monitor your receivables and improve cash flow
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/dashboard/cashflow/invoices">
            <Button variant="outline" className="bg-white/50 hover:bg-white">
              View Invoices
            </Button>
          </Link>
          <Link href="/dashboard/cashflow/clients">
            <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-500/25">
              <Users className="h-4 w-4 mr-2" />
              Add Client
            </Button>
          </Link>
        </div>
      </div>

      {/* Health score banner */}
      {stats && (
        <Card variant="gradient" className={`bg-gradient-to-br ${getHealthColor(stats.healthScore)} overflow-hidden relative`}>
          <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=%2260%22 height=%2260%22 viewBox=%220 0 60 60%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cg fill=%22none%22 fill-rule=%22evenodd%22%3E%3Cg fill=%22%23ffffff%22 fill-opacity=%220.1%22%3E%3Cpath d=%22M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-30" />
          <CardContent className="py-8 relative">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div className="relative">
                  <div className="w-24 h-24 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
                    <div className="text-center">
                      <span className="text-4xl font-bold text-white">
                        {stats.healthScore}
                      </span>
                    </div>
                  </div>
                  <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-1.5 shadow-lg">
                    <Sparkles className="h-4 w-4 text-amber-500" />
                  </div>
                </div>
                <div>
                  <p className="text-white/80 text-sm font-medium uppercase tracking-wider">
                    Cash Flow Health Score
                  </p>
                  <p className="text-2xl font-bold text-white mt-1">
                    {getHealthLabel(stats.healthScore)}
                  </p>
                  <p className="text-white/70 text-sm mt-1">
                    Based on payment patterns and outstanding invoices
                  </p>
                </div>
              </div>
              <div className="text-right bg-white/10 backdrop-blur-sm rounded-2xl p-5">
                <p className="text-white/80 text-sm">30-Day Projected Inflow</p>
                <p className="text-3xl font-bold text-white mt-1">
                  {formatCurrency(stats.projectedInflow30d)}
                </p>
                <div className="flex items-center justify-end gap-1 mt-2 text-white/80">
                  <TrendingUp className="h-4 w-4" />
                  <span className="text-sm">Expected revenue</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats grid */}
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
        <Card variant="professional" hover="lift" className="stat-card stat-card-blue">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Total Receivables
            </CardTitle>
            <div className="icon-container icon-container-blue">
              <DollarSign className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {stats ? formatCurrency(stats.totalReceivables) : "$0.00"}
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Outstanding invoices
            </p>
          </CardContent>
        </Card>

        <Card variant="professional" hover="lift" className="stat-card stat-card-orange">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Overdue Amount
            </CardTitle>
            <div className="icon-container icon-container-orange">
              <AlertTriangle className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {stats ? formatCurrency(stats.overdueReceivables) : "$0.00"}
            </div>
            <p className="text-sm text-gray-500 mt-1">
              {stats?.overdueInvoices || 0} overdue invoices
            </p>
          </CardContent>
        </Card>

        <Card variant="professional" hover="lift" className="stat-card stat-card-green">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Collected This Month
            </CardTitle>
            <div className="icon-container icon-container-green">
              <TrendingUp className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">
              {stats ? formatCurrency(stats.collectedThisMonth) : "$0.00"}
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Payments received
            </p>
          </CardContent>
        </Card>

        <Card variant="professional" hover="lift" className="stat-card stat-card-purple">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              AI Recommendations
            </CardTitle>
            <div className="icon-container icon-container-purple">
              <Sparkles className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {stats?.pendingRecommendations || 0}
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Pending actions
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main content grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Overdue invoices */}
        <Card variant="professional">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">Overdue Invoices</CardTitle>
              <CardDescription>Requires immediate attention</CardDescription>
            </div>
            <Link href="/dashboard/cashflow/invoices?status=overdue">
              <Button variant="outline" size="sm" className="bg-white/50 hover:bg-white">
                View All
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="text-center py-10">
              <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
                <Clock className="h-8 w-8 text-gray-400" />
              </div>
              <p className="text-gray-600 font-medium">No overdue invoices</p>
              <p className="text-sm text-gray-500 mt-1">Connect your accounting software to sync invoices</p>
            </div>
          </CardContent>
        </Card>

        {/* AI Recommendations */}
        <Card variant="professional">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">AI Recommendations</CardTitle>
              <CardDescription>Suggested actions to improve cash flow</CardDescription>
            </div>
            <Link href="/dashboard/cashflow/recommendations">
              <Button variant="outline" size="sm" className="bg-white/50 hover:bg-white">
                View All
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="text-center py-10">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center mx-auto mb-4">
                <Sparkles className="h-8 w-8 text-purple-500" />
              </div>
              <p className="text-gray-600 font-medium">No recommendations yet</p>
              <p className="text-sm text-gray-500 mt-1">Add clients and invoices to get AI insights</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick actions */}
      <Card variant="professional">
        <CardHeader>
          <CardTitle className="text-lg">Quick Actions</CardTitle>
          <CardDescription>Common tasks to manage your cash flow</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Link href="/dashboard/cashflow/clients">
              <div className="quick-action-card group">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform shadow-lg shadow-blue-500/25">
                  <Users className="h-6 w-6 text-white" />
                </div>
                <h4 className="font-semibold text-gray-900">Add Client</h4>
                <p className="text-sm text-gray-500 mt-1">Import from QuickBooks or manual</p>
              </div>
            </Link>

            <Link href="/dashboard/cashflow/invoices">
              <div className="quick-action-card group">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform shadow-lg shadow-emerald-500/25">
                  <FileText className="h-6 w-6 text-white" />
                </div>
                <h4 className="font-semibold text-gray-900">Record Invoice</h4>
                <p className="text-sm text-gray-500 mt-1">Create or import invoices</p>
              </div>
            </Link>

            <Link href="/dashboard/chauffeur/integrations">
              <div className="quick-action-card group">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform shadow-lg shadow-purple-500/25">
                  <ArrowUpRight className="h-6 w-6 text-white" />
                </div>
                <h4 className="font-semibold text-gray-900">Connect QuickBooks</h4>
                <p className="text-sm text-gray-500 mt-1">Sync invoices automatically</p>
              </div>
            </Link>

            <Link href="/dashboard/cashflow/recommendations">
              <div className="quick-action-card group">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform shadow-lg shadow-orange-500/25">
                  <TrendingUp className="h-6 w-6 text-white" />
                </div>
                <h4 className="font-semibold text-gray-900">Run Analysis</h4>
                <p className="text-sm text-gray-500 mt-1">Get AI recommendations</p>
              </div>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
