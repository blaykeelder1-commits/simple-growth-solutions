"use client";

import { useEffect, useState } from "react";
import { LeadTable } from "@/components/admin/LeadTable";
import { RefreshCw, Users, UserCheck, Calendar, TrendingUp, Sparkles } from "lucide-react";

interface Lead {
  id: string;
  businessName: string;
  contactName: string;
  email: string;
  phone: string | null;
  status: string;
  analysisScore: number | null;
  createdAt: string;
}

const statusFilters = [
  { value: "all", label: "All Leads" },
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "scheduled", label: "Scheduled" },
  { value: "converted", label: "Converted" },
];

export default function AdminDashboard() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const fetchLeads = async () => {
    setIsLoading(true);
    setError("");

    try {
      const res = await fetch("/api/leads");
      const data = await res.json();

      if (data.success) {
        setLeads(data.leads);
      } else {
        setError(data.error || "Failed to fetch leads");
      }
    } catch {
      setError("Failed to fetch leads");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  const filteredLeads =
    statusFilter === "all"
      ? leads
      : leads.filter((lead) => lead.status === statusFilter);

  const stats = {
    total: leads.length,
    new: leads.filter((l) => l.status === "new").length,
    contacted: leads.filter((l) => l.status === "contacted").length,
    scheduled: leads.filter((l) => l.status === "scheduled").length,
    converted: leads.filter((l) => l.status === "converted").length,
  };
  const conversionRate =
    stats.total > 0 ? Math.round((stats.converted / stats.total) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.15),transparent_60%)]" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center">
              <Sparkles className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Lead Dashboard</h1>
              <p className="text-white/80 text-sm mt-0.5">
                Top-of-funnel pipeline. New leads route here from the analyzer + questionnaire.
              </p>
            </div>
          </div>
          <button
            onClick={fetchLeads}
            disabled={isLoading}
            className="text-sm bg-white/15 hover:bg-white/25 backdrop-blur px-3 py-2 rounded-lg flex items-center gap-2 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {/* Stat strip inside hero */}
        <div className="relative grid grid-cols-2 md:grid-cols-5 gap-3 mt-6">
          <StatTile icon={Users} label="Total" value={stats.total} accent="text-white" />
          <StatTile icon={Sparkles} label="New" value={stats.new} accent="text-blue-100" />
          <StatTile icon={UserCheck} label="Contacted" value={stats.contacted} accent="text-amber-100" />
          <StatTile icon={Calendar} label="Scheduled" value={stats.scheduled} accent="text-purple-100" />
          <StatTile
            icon={TrendingUp}
            label="Converted"
            value={`${stats.converted} (${conversionRate}%)`}
            accent="text-emerald-200"
          />
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {statusFilters.map((filter) => (
          <button
            key={filter.value}
            onClick={() => setStatusFilter(filter.value)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              statusFilter === filter.value
                ? "bg-blue-600 text-white"
                : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {/* Error state */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Loading state */}
      {isLoading ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-gray-400 mx-auto" />
          <p className="mt-2 text-gray-500">Loading leads...</p>
        </div>
      ) : (
        <LeadTable leads={filteredLeads} />
      )}
    </div>
  );
}

function StatTile({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: React.ElementType;
  label: string;
  value: number | string;
  accent: string;
}) {
  return (
    <div className="bg-white/10 backdrop-blur border border-white/20 rounded-xl p-3">
      <div className="flex items-center gap-2 text-white/70 text-xs uppercase tracking-wide font-medium">
        <Icon className="w-3.5 h-3.5" />
        {label}
      </div>
      <div className={`text-2xl font-bold mt-1 ${accent}`}>{value}</div>
    </div>
  );
}
