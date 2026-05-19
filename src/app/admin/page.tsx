"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { LeadTable } from "@/components/admin/LeadTable";
import {
  RefreshCw,
  Inbox,
  AlertTriangle,
  CreditCard,
  Users,
  Activity,
  Zap,
  Target,
  TrendingUp,
  Flame,
  ArrowUpRight,
  CheckCircle2,
} from "lucide-react";

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

interface DashboardStats {
  openTickets: number;
  atRiskTickets: number;
  stuckPayment: number;
  activeCustomers: number;
  completedThisWeek: number;
  hotLeads: number;
  newLeadsToday: number;
  avgTurnaroundHours: number;
  inSlaPercent: number;
}

const statusFilters = [
  { value: "all", label: "All Leads" },
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "scheduled", label: "Scheduled" },
  { value: "converted", label: "Converted" },
];

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function dateLine(): string {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export default function AdminCommandCenter() {
  const { data: session } = useSession();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const fetchAll = async () => {
    setIsLoading(true);
    setError("");
    try {
      const [leadsRes, statsRes] = await Promise.all([
        fetch("/api/leads"),
        fetch("/api/admin/dashboard-stats"),
      ]);
      const leadsData = await leadsRes.json();
      const statsData = await statsRes.json();
      if (leadsData.success) setLeads(leadsData.leads);
      else setError(leadsData.error || "Failed to fetch leads");
      if (statsData.success) setStats(statsData.stats);
    } catch {
      setError("Failed to load dashboard");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const filteredLeads =
    statusFilter === "all"
      ? leads
      : leads.filter((lead) => lead.status === statusFilter);

  const firstName = session?.user?.name?.split(" ")[0] || "operator";

  return (
    <div className="space-y-6">
      {/* ─────────────────── COMMAND CENTER HERO ─────────────────── */}
      {/* Dark, ops-control-room treatment — deliberately different from the
          warm customer portal so admins instantly know which surface they're on. */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-gray-900 to-indigo-950 text-white shadow-2xl ring-1 ring-white/10">
        {/* Subtle data-grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.06] pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />
        {/* Accent glow */}
        <div className="absolute -top-32 -right-32 h-72 w-72 rounded-full bg-cyan-500/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-indigo-500/25 blur-3xl pointer-events-none" />

        <div className="relative p-6 lg:p-8">
          {/* Top row: greeting + refresh */}
          <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-cyan-300/80 font-semibold mb-2">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Operations · Live
              </div>
              <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">
                {greeting()}, {firstName}.
              </h1>
              <p className="text-sm text-gray-400 mt-1">
                {dateLine()} &middot; Here&apos;s what needs you right now.
              </p>
            </div>
            <button
              onClick={fetchAll}
              disabled={isLoading}
              className="text-sm bg-white/10 hover:bg-white/15 backdrop-blur ring-1 ring-white/10 px-3 py-2 rounded-lg flex items-center gap-2 disabled:opacity-50 transition"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>

          {/* KPI grid — operator-focused, not funnel-focused */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KpiCard
              tone="emerald"
              icon={Inbox}
              label="Open Tickets"
              value={stats?.openTickets ?? "—"}
              href="/admin/dispatch"
              subtle="Pending + in flight"
            />
            <KpiCard
              tone={(stats?.atRiskTickets ?? 0) > 0 ? "red" : "gray"}
              icon={AlertTriangle}
              label="SLA At Risk"
              value={stats?.atRiskTickets ?? "—"}
              href="/admin/dispatch"
              subtle="Due in &lt; 12h"
            />
            <KpiCard
              tone={(stats?.stuckPayment ?? 0) > 0 ? "amber" : "gray"}
              icon={CreditCard}
              label="Stuck on Payment"
              value={stats?.stuckPayment ?? "—"}
              href="/admin/dispatch"
              subtle="Awaiting rush fee"
            />
            <KpiCard
              tone="cyan"
              icon={Users}
              label="Active Customers"
              value={stats?.activeCustomers ?? "—"}
              href="/admin/funnel"
              subtle="Managed plans live"
            />
          </div>
        </div>
      </div>

      {/* ─────────────────── NEEDS YOUR ATTENTION ─────────────────── */}
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 mb-3">
          Needs your attention
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <ActionCard
            href="/admin/dispatch"
            icon={Inbox}
            iconBg="bg-indigo-100"
            iconColor="text-indigo-600"
            title={`${stats?.openTickets ?? 0} ${stats?.openTickets === 1 ? "ticket" : "tickets"} in queue`}
            subtitle={
              (stats?.atRiskTickets ?? 0) > 0
                ? `${stats?.atRiskTickets} due within 12 hours`
                : "All tickets within SLA"
            }
            cta="Open Dispatch Board"
          />
          <ActionCard
            href="/admin?filter=hot"
            icon={Flame}
            iconBg="bg-orange-100"
            iconColor="text-orange-600"
            title={`${stats?.hotLeads ?? 0} hot ${stats?.hotLeads === 1 ? "lead" : "leads"} (80+ score)`}
            subtitle={
              (stats?.newLeadsToday ?? 0) > 0
                ? `${stats?.newLeadsToday} new today`
                : "No new leads today"
            }
            cta="Review Leads"
          />
          <ActionCard
            href="/admin/funnel"
            icon={Target}
            iconBg="bg-emerald-100"
            iconColor="text-emerald-600"
            title="Customer funnel"
            subtitle="Track conversion stage-by-stage"
            cta="Open Funnel"
          />
        </div>
      </section>

      {/* ─────────────────── THIS WEEK'S THROUGHPUT ─────────────────── */}
      <section className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
          <Activity className="h-4 w-4 text-emerald-600" />
          <h2 className="text-sm font-semibold text-gray-700">
            This week&apos;s throughput
          </h2>
          <span className="ml-auto text-xs text-gray-400">
            Rolling 7 days
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-gray-100">
          <ThroughputCell
            icon={CheckCircle2}
            iconColor="text-emerald-600"
            value={stats?.completedThisWeek ?? "—"}
            label="Edits completed"
            sub="Across all customers"
          />
          <ThroughputCell
            icon={Zap}
            iconColor="text-amber-500"
            value={
              stats && stats.avgTurnaroundHours > 0
                ? `${stats.avgTurnaroundHours}h`
                : "—"
            }
            label="Avg turnaround"
            sub="Last 30 days"
          />
          <ThroughputCell
            icon={TrendingUp}
            iconColor="text-indigo-600"
            value={
              stats && stats.completedThisWeek > 0
                ? `${stats.inSlaPercent}%`
                : "—"
            }
            label="Completed within SLA"
            sub="Reliability metric"
          />
        </div>
      </section>

      {/* ─────────────────── LEAD PIPELINE (existing, demoted) ─────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
            Lead pipeline
          </h2>
          <span className="text-xs text-gray-400">{leads.length} total</span>
        </div>

        {/* Filter chips */}
        <div className="flex gap-2 flex-wrap mb-4">
          {statusFilters.map((filter) => (
            <button
              key={filter.value}
              onClick={() => setStatusFilter(filter.value)}
              className={`px-3.5 py-1.5 text-sm font-medium rounded-full transition ${
                statusFilter === filter.value
                  ? "bg-gray-900 text-white shadow"
                  : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <RefreshCw className="w-8 h-8 animate-spin text-gray-400 mx-auto" />
            <p className="mt-2 text-gray-500">Loading dashboard...</p>
          </div>
        ) : (
          <LeadTable leads={filteredLeads} />
        )}
      </section>
    </div>
  );
}

// ─────────────────── Sub-components ───────────────────

function KpiCard({
  icon: Icon,
  label,
  value,
  subtle,
  tone,
  href,
}: {
  icon: React.ElementType;
  label: string;
  value: number | string;
  subtle: string;
  tone: "emerald" | "red" | "amber" | "cyan" | "gray";
  href: string;
}) {
  const toneColor: Record<typeof tone, string> = {
    emerald: "text-emerald-300",
    red: "text-red-300",
    amber: "text-amber-300",
    cyan: "text-cyan-300",
    gray: "text-gray-300",
  };
  return (
    <Link
      href={href}
      className="group relative bg-white/5 backdrop-blur ring-1 ring-white/10 hover:ring-white/30 hover:bg-white/10 rounded-xl p-4 transition"
    >
      <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-gray-400">
        <Icon className="w-3.5 h-3.5" />
        {label}
      </div>
      <div className={`mt-2 text-3xl font-bold tabular-nums ${toneColor[tone]}`}>
        {value}
      </div>
      <div
        className="mt-1 text-[11px] text-gray-500"
        dangerouslySetInnerHTML={{ __html: subtle }}
      />
      <ArrowUpRight className="absolute top-3 right-3 h-4 w-4 text-gray-600 group-hover:text-white transition" />
    </Link>
  );
}

function ActionCard({
  href,
  icon: Icon,
  iconBg,
  iconColor,
  title,
  subtitle,
  cta,
}: {
  href: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  title: string;
  subtitle: string;
  cta: string;
}) {
  return (
    <Link
      href={href}
      className="group bg-white rounded-xl border border-gray-200 p-5 hover:border-gray-300 hover:shadow-md transition flex items-center gap-4"
    >
      <div className={`h-12 w-12 rounded-xl ${iconBg} flex items-center justify-center flex-shrink-0`}>
        <Icon className={`h-6 w-6 ${iconColor}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-gray-900 truncate">{title}</div>
        <div className="text-xs text-gray-500 mt-0.5 truncate">{subtitle}</div>
      </div>
      <div className="flex items-center gap-1 text-xs font-medium text-gray-500 group-hover:text-gray-900 transition whitespace-nowrap">
        {cta}
        <ArrowUpRight className="h-3.5 w-3.5" />
      </div>
    </Link>
  );
}

function ThroughputCell({
  icon: Icon,
  iconColor,
  value,
  label,
  sub,
}: {
  icon: React.ElementType;
  iconColor: string;
  value: number | string;
  label: string;
  sub: string;
}) {
  return (
    <div className="px-5 py-4">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-gray-500 font-medium">
        <Icon className={`w-3.5 h-3.5 ${iconColor}`} />
        {label}
      </div>
      <div className="mt-1 text-3xl font-bold tabular-nums text-gray-900">{value}</div>
      <div className="text-[11px] text-gray-400 mt-0.5">{sub}</div>
    </div>
  );
}
