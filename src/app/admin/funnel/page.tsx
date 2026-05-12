"use client";

import { useEffect, useState } from "react";
import { RefreshCw, ArrowRight, TrendingUp, GitBranch } from "lucide-react";

interface FunnelStage {
  stage: string;
  label: string;
  count: number;
  percentage: number;
  conversionFromPrevious: number;
}

interface JourneyEvent {
  id: string;
  orgName: string;
  fromStage: string | null;
  toStage: string;
  triggeredBy: string | null;
  createdAt: string;
}

const STAGE_COLORS: Record<string, string> = {
  lead: "bg-gray-500",
  website_analysis: "bg-blue-500",
  website_build: "bg-indigo-500",
  website_managed: "bg-purple-500",
  cybersecurity: "bg-red-500",
  cashflow: "bg-emerald-500",
  chauffeur: "bg-amber-500",
};

export default function FunnelPage() {
  const [funnel, setFunnel] = useState<FunnelStage[]>([]);
  const [events, setEvents] = useState<JourneyEvent[]>([]);
  const [totalOrgs, setTotalOrgs] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/funnel");
      const data = await res.json();
      if (data.success) {
        setFunnel(data.funnel);
        setEvents(data.recentEvents);
        setTotalOrgs(data.totalOrganizations);
      }
    } catch {
      // silently fail
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const maxCount = Math.max(...funnel.map((s) => s.count), 1);

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="rounded-2xl bg-gradient-to-r from-cyan-600 via-sky-600 to-indigo-700 p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.18),transparent_60%)]" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center">
              <GitBranch className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Customer Journey Funnel</h1>
              <p className="text-sm text-white/80 mt-0.5">
                {totalOrgs} total organizations tracked &middot; conversion through each stage
              </p>
            </div>
          </div>
          <button
            onClick={fetchData}
            disabled={isLoading}
            className="text-sm bg-white/15 hover:bg-white/25 backdrop-blur px-3 py-2 rounded-lg flex items-center gap-2 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Funnel Visualization */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">Stage Distribution</h2>
        <div className="space-y-4">
          {funnel.map((stage, i) => (
            <div key={stage.stage} className="flex items-center gap-4">
              <div className="w-40 text-sm font-medium text-gray-700 text-right">
                {stage.label}
              </div>
              <div className="flex-1 relative">
                <div className="h-10 bg-gray-100 rounded-lg overflow-hidden">
                  <div
                    className={`h-full ${STAGE_COLORS[stage.stage] || "bg-gray-500"} rounded-lg transition-all duration-500`}
                    style={{
                      width: `${Math.max((stage.count / maxCount) * 100, 2)}%`,
                    }}
                  />
                </div>
                <span className="absolute inset-y-0 left-3 flex items-center text-sm font-bold text-white drop-shadow">
                  {stage.count}
                </span>
              </div>
              <div className="w-20 text-right">
                {i > 0 && (
                  <span
                    className={`text-sm font-medium ${
                      stage.conversionFromPrevious >= 50
                        ? "text-green-600"
                        : stage.conversionFromPrevious >= 25
                          ? "text-yellow-600"
                          : "text-red-600"
                    }`}
                  >
                    {stage.conversionFromPrevious}%
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Stage Flow */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Journey Flow</h2>
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {funnel.map((stage, i) => (
            <div key={stage.stage} className="flex items-center gap-2 flex-shrink-0">
              <div className="text-center">
                <div
                  className={`${STAGE_COLORS[stage.stage] || "bg-gray-500"} text-white rounded-lg px-4 py-3 min-w-[100px]`}
                >
                  <div className="text-2xl font-bold">{stage.count}</div>
                  <div className="text-xs opacity-90">{stage.label}</div>
                </div>
              </div>
              {i < funnel.length - 1 && (
                <div className="flex flex-col items-center">
                  <ArrowRight className="w-5 h-5 text-gray-400" />
                  <span className="text-xs text-gray-500">
                    {funnel[i + 1].conversionFromPrevious}%
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          Recent Stage Transitions
        </h2>
        {events.length === 0 ? (
          <p className="text-gray-500 text-sm">No journey events yet.</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {events.map((event) => (
              <div key={event.id} className="py-3 flex items-center gap-4">
                <div className="flex-1">
                  <span className="font-medium text-gray-900">{event.orgName}</span>
                  <span className="text-gray-500 mx-2">moved from</span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
                    {event.fromStage || "new"}
                  </span>
                  <ArrowRight className="w-3 h-3 inline mx-1 text-gray-400" />
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">
                    {event.toStage}
                  </span>
                </div>
                <div className="text-xs text-gray-400">
                  {new Date(event.createdAt).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
