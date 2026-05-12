"use client";

import { useEffect, useMemo, useState } from "react";
import { TrendingUp, TrendingDown, DollarSign, Users, Sparkles, RefreshCw } from "lucide-react";

interface ReportData {
  mrr: {
    cents: number;
    dollars: number;
    activeSubscriptions: number;
    trialingSubscriptions: number;
    canceledLast30: number;
  };
  customers: { newLast7: number; newLast30: number; newThisMonth: number };
  oneOffCharges: {
    last30Days: { totalCents: number; totalDollars: number; count: number };
  };
  planBreakdown: { plan: string; count: number; mrrCents: number }[];
  trialConversionRate: number;
  signupSeries: { date: string; count: number }[];
}

const PLAN_LABELS: Record<string, string> = {
  website_managed: "Managed",
  website_pro: "Managed Pro",
  website_premium: "Managed Premium",
  cashflow_ai: "Cash Flow AI",
};

export default function ReportsPage() {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/reports");
      const j = await res.json();
      if (j.success) setData(j);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const maxCount = useMemo(() => {
    if (!data) return 1;
    return Math.max(1, ...data.signupSeries.map((s) => s.count));
  }, [data]);

  if (!data) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Hero strip */}
      <div className="rounded-2xl bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700 p-6 text-white shadow-xl">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Revenue & Reports</h1>
            <p className="text-white/80 text-sm mt-1">
              Live customer + revenue metrics across the platform.
            </p>
          </div>
          <button
            onClick={fetchData}
            className="text-sm bg-white/15 hover:bg-white/25 backdrop-blur px-3 py-1.5 rounded-lg flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white/10 backdrop-blur rounded-xl p-4 border border-white/20">
            <div className="flex items-center gap-2 text-white/70 text-xs uppercase tracking-wide font-medium">
              <DollarSign className="w-4 h-4" />
              MRR
            </div>
            <div className="text-3xl font-bold mt-2">${data.mrr.dollars.toLocaleString()}</div>
            <div className="text-xs text-white/70 mt-1">
              {data.mrr.activeSubscriptions} active subscriptions
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur rounded-xl p-4 border border-white/20">
            <div className="flex items-center gap-2 text-white/70 text-xs uppercase tracking-wide font-medium">
              <Users className="w-4 h-4" />
              New Customers
            </div>
            <div className="text-3xl font-bold mt-2">{data.customers.newThisMonth}</div>
            <div className="text-xs text-white/70 mt-1">
              this month &middot; {data.customers.newLast7} last 7 days
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur rounded-xl p-4 border border-white/20">
            <div className="flex items-center gap-2 text-white/70 text-xs uppercase tracking-wide font-medium">
              <Sparkles className="w-4 h-4" />
              Trial → Paid
            </div>
            <div className="text-3xl font-bold mt-2">
              {Math.round(data.trialConversionRate * 100)}%
            </div>
            <div className="text-xs text-white/70 mt-1">
              {data.mrr.trialingSubscriptions} active trials
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur rounded-xl p-4 border border-white/20">
            <div className="flex items-center gap-2 text-white/70 text-xs uppercase tracking-wide font-medium">
              {data.mrr.canceledLast30 > data.customers.newLast30 ? (
                <TrendingDown className="w-4 h-4" />
              ) : (
                <TrendingUp className="w-4 h-4" />
              )}
              Churn (30d)
            </div>
            <div className="text-3xl font-bold mt-2">{data.mrr.canceledLast30}</div>
            <div className="text-xs text-white/70 mt-1">
              ${data.oneOffCharges.last30Days.totalDollars} in one-off charges
            </div>
          </div>
        </div>
      </div>

      {/* Signup chart + plan breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Signup timeseries */}
        <div className="lg:col-span-2 bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">New customers per day</h2>
              <p className="text-sm text-gray-500">Last 30 days</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-gray-900">{data.customers.newLast30}</div>
              <div className="text-xs text-gray-500">total</div>
            </div>
          </div>
          <div className="flex items-end gap-1 h-40">
            {data.signupSeries.map((d) => {
              const h = (d.count / maxCount) * 100;
              return (
                <div
                  key={d.date}
                  className="flex-1 bg-gradient-to-t from-emerald-500 to-teal-400 rounded-t hover:opacity-80 transition relative group"
                  style={{ height: `${Math.max(h, 2)}%` }}
                  title={`${d.date}: ${d.count} signup${d.count === 1 ? "" : "s"}`}
                >
                  {d.count > 0 && (
                    <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-xs font-medium text-gray-600 opacity-0 group-hover:opacity-100 transition">
                      {d.count}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div className="flex justify-between mt-2 text-xs text-gray-400">
            <span>{data.signupSeries[0]?.date.slice(5)}</span>
            <span>{data.signupSeries[data.signupSeries.length - 1]?.date.slice(5)}</span>
          </div>
        </div>

        {/* Plan breakdown */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">MRR by plan</h2>
          <p className="text-sm text-gray-500 mb-4">Active subscriptions only</p>
          {data.planBreakdown.length === 0 ? (
            <p className="text-sm text-gray-500">No active plans yet.</p>
          ) : (
            <div className="space-y-4">
              {data.planBreakdown.map((p) => {
                const pct = data.mrr.cents > 0 ? (p.mrrCents / data.mrr.cents) * 100 : 0;
                return (
                  <div key={p.plan}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-gray-900">
                        {PLAN_LABELS[p.plan] || p.plan}
                      </span>
                      <span className="text-gray-500">
                        {p.count} &middot; ${Math.round(p.mrrCents / 100)}
                      </span>
                    </div>
                    <div className="h-2 mt-1 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
