"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import {
  AlertCircle,
  Clock,
  Filter,
  RefreshCw,
  User as UserIcon,
  Zap,
} from "lucide-react";

interface Operator {
  id: string;
  name: string | null;
  email: string;
  openAssignedCount: number;
}

interface ChangeRequest {
  id: string;
  title: string;
  description: string;
  type: string;
  priority: string;
  status: string;
  isRush: boolean;
  slaDueAt: string | null;
  createdAt: string;
  project: { id: string; name: string; organizationName: string | null };
  assignee: { id: string; name: string | null; email: string } | null;
  requester: { id: string; name: string | null; email: string } | null;
}

const COLUMNS: { key: string; label: string; statuses: string[] }[] = [
  { key: "pending", label: "Inbox", statuses: ["pending"] },
  { key: "in_progress", label: "In Progress", statuses: ["approved", "in_progress"] },
  { key: "review", label: "Review", statuses: ["awaiting_payment"] },
  { key: "done", label: "Done", statuses: ["completed", "rejected"] },
];

const PRIORITY_COLORS: Record<string, string> = {
  urgent: "bg-red-100 text-red-700 border-red-200",
  high: "bg-orange-100 text-orange-700 border-orange-200",
  normal: "bg-gray-100 text-gray-700 border-gray-200",
  low: "bg-gray-50 text-gray-500 border-gray-200",
};

function slaInfo(slaDueAt: string | null) {
  if (!slaDueAt) return { label: "No SLA", tone: "gray" as const, ms: Infinity };
  const due = new Date(slaDueAt).getTime();
  const ms = due - Date.now();
  const hrs = Math.round(ms / (60 * 60 * 1000));
  if (ms < 0) {
    return { label: `Overdue ${Math.abs(hrs)}h`, tone: "red" as const, ms };
  }
  if (hrs < 24) {
    return { label: `${hrs}h left`, tone: "amber" as const, ms };
  }
  const days = Math.ceil(hrs / 24);
  return { label: `${days}d left`, tone: "green" as const, ms };
}

export default function DispatchPage() {
  const { data: session } = useSession();
  const [requests, setRequests] = useState<ChangeRequest[]>([]);
  const [operators, setOperators] = useState<Operator[]>([]);
  const [filter, setFilter] = useState<"all" | "mine" | "unassigned">("all");
  const [loading, setLoading] = useState(true);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter === "mine") params.set("assigneeId", "me");
      if (filter === "unassigned") params.set("assigneeId", "unassigned");
      const [crsRes, opsRes] = await Promise.all([
        fetch(`/api/admin/change-requests?${params.toString()}`),
        fetch("/api/admin/operators"),
      ]);
      const crsData = await crsRes.json();
      const opsData = await opsRes.json();
      setRequests(crsData.changeRequests || []);
      setOperators(opsData.operators || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const updateRequest = async (id: string, patch: Record<string, string | null>) => {
    await fetch(`/api/admin/change-requests/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    fetchAll();
  };

  const counts = useMemo(() => {
    const overdue = requests.filter(
      (r) =>
        r.slaDueAt &&
        new Date(r.slaDueAt).getTime() < Date.now() &&
        !["completed", "rejected"].includes(r.status)
    ).length;
    const dueToday = requests.filter((r) => {
      if (!r.slaDueAt) return false;
      if (["completed", "rejected"].includes(r.status)) return false;
      const ms = new Date(r.slaDueAt).getTime() - Date.now();
      return ms >= 0 && ms < 24 * 60 * 60 * 1000;
    }).length;
    const total = requests.length;
    return { overdue, dueToday, total };
  }, [requests]);

  const byColumn = useMemo(() => {
    const map: Record<string, ChangeRequest[]> = {};
    for (const col of COLUMNS) map[col.key] = [];
    for (const r of requests) {
      const col = COLUMNS.find((c) => c.statuses.includes(r.status));
      if (col) map[col.key].push(r);
    }
    return map;
  }, [requests]);

  return (
    <div className="space-y-6">
      {/* Hero stat strip */}
      <div className="rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 p-6 text-white shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Dispatch Board</h1>
            <p className="text-white/80 text-sm mt-1">
              All change requests across all projects, sorted by SLA urgency.
            </p>
          </div>
          <div className="flex gap-6">
            <div>
              <div className="text-3xl font-bold leading-none">{counts.total}</div>
              <div className="text-xs text-white/70 mt-1">Total open</div>
            </div>
            <div>
              <div className="text-3xl font-bold leading-none text-amber-200">
                {counts.dueToday}
              </div>
              <div className="text-xs text-white/70 mt-1">Due ≤ 24h</div>
            </div>
            <div>
              <div className="text-3xl font-bold leading-none text-red-200">
                {counts.overdue}
              </div>
              <div className="text-xs text-white/70 mt-1">Overdue</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Filter className="w-4 h-4 text-gray-400" />
        {(["all", "mine", "unassigned"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 text-sm font-medium rounded-full transition ${
              filter === f
                ? "bg-gray-900 text-white shadow"
                : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50"
            }`}
          >
            {f === "mine" ? "Mine only" : f === "unassigned" ? "Unassigned" : "All"}
          </button>
        ))}
        <button
          onClick={fetchAll}
          className="ml-auto flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Operator capacity strip */}
      {operators.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {operators.map((op) => (
            <div
              key={op.id}
              className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-full text-sm"
            >
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 text-white flex items-center justify-center text-xs font-bold">
                {(op.name || op.email)[0].toUpperCase()}
              </div>
              <span className="font-medium text-gray-900">{op.name || op.email}</span>
              <span className="text-gray-500">
                {op.openAssignedCount} open
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Kanban columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {COLUMNS.map((col) => (
          <div key={col.key} className="bg-gray-50 rounded-xl p-3 min-h-[200px]">
            <div className="flex items-center justify-between mb-3 px-1">
              <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
                {col.label}
              </h2>
              <span className="text-xs font-medium text-gray-500 bg-white border border-gray-200 rounded-full px-2 py-0.5">
                {byColumn[col.key].length}
              </span>
            </div>
            <div className="space-y-2">
              {byColumn[col.key].length === 0 && (
                <div className="text-xs text-gray-400 text-center py-6">
                  Nothing here.
                </div>
              )}
              {byColumn[col.key].map((r) => {
                const sla = slaInfo(r.slaDueAt);
                return (
                  <div
                    key={r.id}
                    className={`bg-white rounded-lg border p-3 shadow-sm hover:shadow-md transition ${
                      sla.tone === "red"
                        ? "border-red-300 ring-2 ring-red-100"
                        : sla.tone === "amber"
                        ? "border-amber-300"
                        : "border-gray-200"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="font-medium text-gray-900 text-sm leading-snug flex-1">
                        {r.title}
                      </div>
                      {r.isRush && <Zap className="w-4 h-4 text-amber-500 flex-shrink-0" />}
                    </div>
                    <div className="text-xs text-gray-500 mb-2">
                      {r.project.organizationName} &mdash; {r.project.name}
                    </div>
                    <p className="text-xs text-gray-600 line-clamp-2 mb-3">
                      {r.description}
                    </p>
                    <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium border ${PRIORITY_COLORS[r.priority] || PRIORITY_COLORS.normal}`}>
                        {r.priority}
                      </span>
                      <span className="px-2 py-0.5 rounded text-xs bg-blue-50 text-blue-700 border border-blue-200">
                        {r.type}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-medium flex items-center gap-1 ${
                          sla.tone === "red"
                            ? "bg-red-100 text-red-700"
                            : sla.tone === "amber"
                            ? "bg-amber-100 text-amber-700"
                            : sla.tone === "green"
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-gray-50 text-gray-500"
                        }`}
                      >
                        {sla.tone === "red" ? (
                          <AlertCircle className="w-3 h-3" />
                        ) : (
                          <Clock className="w-3 h-3" />
                        )}
                        {sla.label}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-100">
                      <select
                        value={r.assignee?.id ?? ""}
                        onChange={(e) =>
                          updateRequest(r.id, { assigneeId: e.target.value || null })
                        }
                        className="text-xs border border-gray-200 rounded px-1.5 py-1 bg-white flex-1 max-w-[110px]"
                      >
                        <option value="">Unassigned</option>
                        {operators.map((op) => (
                          <option key={op.id} value={op.id}>
                            {op.name || op.email.split("@")[0]}
                          </option>
                        ))}
                      </select>
                      {r.assignee?.id === session?.user?.id ? (
                        <UserIcon className="w-3.5 h-3.5 text-blue-600" />
                      ) : null}
                      <select
                        value={r.status}
                        onChange={(e) => updateRequest(r.id, { status: e.target.value })}
                        className="text-xs border border-gray-200 rounded px-1.5 py-1 bg-white"
                      >
                        <option value="pending">Pending</option>
                        <option value="approved">Approved</option>
                        <option value="in_progress">In Progress</option>
                        <option value="completed">Completed</option>
                        <option value="rejected">Rejected</option>
                      </select>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
