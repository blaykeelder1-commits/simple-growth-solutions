"use client";

import { useEffect, useState } from "react";
import {
  RefreshCw,
  Plus,
  ExternalLink,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
} from "lucide-react";

interface Build {
  id: string;
  projectName: string;
  existingUrl: string | null;
  status: string;
  templateId: string | null;
  sourceLeadId: string | null;
  demoScheduledAt: string | null;
  demoCompletedAt: string | null;
  demoOutcome: string | null;
  deployedUrl: string | null;
  createdAt: string;
  organization: {
    name: string;
    customerStage: string;
  };
}

const STATUS_COLORS: Record<string, string> = {
  queued: "bg-gray-100 text-gray-700",
  in_progress: "bg-blue-100 text-blue-700",
  ready_for_demo: "bg-purple-100 text-purple-700",
  demo_scheduled: "bg-indigo-100 text-indigo-700",
  accepted: "bg-green-100 text-green-700",
  declined: "bg-red-100 text-red-700",
  deployed: "bg-emerald-100 text-emerald-700",
  completed: "bg-green-100 text-green-700",
};

const TEMPLATES = [
  { id: "restaurant", label: "Restaurant / Food Service" },
  { id: "professional", label: "Professional Services" },
  { id: "retail", label: "Retail / E-commerce" },
  { id: "automotive", label: "Automotive" },
  { id: "healthcare", label: "Healthcare / Wellness" },
];

export default function BuildsPage() {
  const [builds, setBuilds] = useState<Build[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const fetchBuilds = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/builds");
      const data = await res.json();
      if (data.success) setBuilds(data.builds);
    } catch {
      // silently fail
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBuilds();
  }, []);

  const updateBuild = async (id: string, updates: Record<string, unknown>) => {
    await fetch("/api/admin/builds", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...updates }),
    });
    fetchBuilds();
  };

  const stats = {
    queued: builds.filter((b) => b.status === "queued").length,
    inProgress: builds.filter((b) => b.status === "in_progress").length,
    readyForDemo: builds.filter((b) => b.status === "ready_for_demo").length,
    demoScheduled: builds.filter((b) => b.status === "demo_scheduled").length,
    accepted: builds.filter(
      (b) => b.demoOutcome === "accepted" || b.status === "deployed" || b.status === "completed"
    ).length,
  };

  return (
    <div className="space-y-6">
      {/* Hero with embedded pipeline stats */}
      <div className="rounded-2xl bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700 p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.15),transparent_60%)]" />
        <div className="relative">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center">
                <ExternalLink className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Website Build Pipeline</h1>
                <p className="text-sm text-white/80 mt-0.5">
                  Free builds we&apos;re shipping from lead capture &mdash; pre-conversion.
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowCreate(!showCreate)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-emerald-700 bg-white rounded-lg hover:bg-white/90 shadow"
              >
                <Plus className="w-4 h-4" />
                New Build
              </button>
              <button
                onClick={fetchBuilds}
                disabled={isLoading}
                className="text-sm bg-white/15 hover:bg-white/25 backdrop-blur px-3 py-2 rounded-lg flex items-center gap-2 disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <PipelineStat label="Queued" value={stats.queued} />
            <PipelineStat label="Building" value={stats.inProgress} />
            <PipelineStat label="Ready for Demo" value={stats.readyForDemo} />
            <PipelineStat label="Demo Scheduled" value={stats.demoScheduled} />
            <PipelineStat label="Accepted" value={stats.accepted} highlight />
          </div>
        </div>
      </div>

      {/* Create Form */}
      {showCreate && <CreateBuildForm onCreated={() => { setShowCreate(false); fetchBuilds(); }} />}

      {/* Builds Table */}
      <div className="bg-white rounded-lg border overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Business</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Template</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Status</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Demo</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {builds.map((build) => (
              <tr key={build.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className="font-medium text-gray-900">{build.organization.name}</div>
                  <div className="text-sm text-gray-500">{build.projectName}</div>
                  {build.existingUrl && (
                    <a
                      href={build.existingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-500 flex items-center gap-1 mt-1"
                    >
                      {build.existingUrl} <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {TEMPLATES.find((t) => t.id === build.templateId)?.label || build.templateId || "—"}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[build.status] || "bg-gray-100 text-gray-700"}`}
                  >
                    {build.status.replace(/_/g, " ")}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm">
                  {build.demoScheduledAt ? (
                    <div className="flex items-center gap-1 text-gray-600">
                      <Calendar className="w-3 h-3" />
                      {new Date(build.demoScheduledAt).toLocaleDateString()}
                    </div>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                  {build.demoOutcome && (
                    <div className="flex items-center gap-1 mt-1">
                      {build.demoOutcome === "accepted" ? (
                        <CheckCircle className="w-3 h-3 text-green-500" />
                      ) : build.demoOutcome === "declined" ? (
                        <XCircle className="w-3 h-3 text-red-500" />
                      ) : (
                        <Clock className="w-3 h-3 text-yellow-500" />
                      )}
                      <span className="text-xs capitalize">{build.demoOutcome}</span>
                    </div>
                  )}
                </td>
                <td className="px-4 py-3">
                  <BuildActions build={build} onUpdate={updateBuild} />
                </td>
              </tr>
            ))}
            {builds.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                  No builds in pipeline yet. Create one from a lead.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PipelineStat({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-lg px-3 py-2.5 backdrop-blur border ${
        highlight ? "bg-white text-emerald-700 border-white shadow" : "bg-white/10 border-white/20"
      }`}
    >
      <div className={`text-2xl font-bold ${highlight ? "text-emerald-700" : "text-white"}`}>
        {value}
      </div>
      <div
        className={`text-[11px] uppercase tracking-wide ${
          highlight ? "text-emerald-700/70" : "text-white/70"
        }`}
      >
        {label}
      </div>
    </div>
  );
}

function BuildActions({
  build,
  onUpdate,
}: {
  build: Build;
  onUpdate: (id: string, updates: Record<string, unknown>) => void;
}) {
  const nextStatus: Record<string, string> = {
    queued: "in_progress",
    in_progress: "ready_for_demo",
    ready_for_demo: "demo_scheduled",
    demo_scheduled: "ready_for_demo",
    accepted: "deployed",
    deployed: "completed",
  };

  const nextLabel: Record<string, string> = {
    queued: "Start Building",
    in_progress: "Mark Ready",
    ready_for_demo: "Schedule Demo",
    demo_scheduled: "Back to Ready",
    accepted: "Mark Deployed",
    deployed: "Complete",
  };

  const next = nextStatus[build.status];
  if (!next) return null;

  return (
    <div className="flex gap-2">
      <button
        onClick={() => onUpdate(build.id, { status: next })}
        className="px-3 py-1 text-xs font-medium text-blue-600 bg-blue-50 rounded hover:bg-blue-100"
      >
        {nextLabel[build.status]}
      </button>
      {build.status === "demo_scheduled" && !build.demoOutcome && (
        <>
          <button
            onClick={() => onUpdate(build.id, { demoOutcome: "accepted" })}
            className="px-3 py-1 text-xs font-medium text-green-600 bg-green-50 rounded hover:bg-green-100"
          >
            Accepted
          </button>
          <button
            onClick={() => onUpdate(build.id, { demoOutcome: "declined" })}
            className="px-3 py-1 text-xs font-medium text-red-600 bg-red-50 rounded hover:bg-red-100"
          >
            Declined
          </button>
        </>
      )}
    </div>
  );
}

interface TemplateOption {
  id: string;
  name: string;
  industry: string;
  description: string;
  colors: { primary: string; secondary: string; accent: string };
}

function CreateBuildForm({ onCreated }: { onCreated: () => void }) {
  const [leadId, setLeadId] = useState("");
  const [projectName, setProjectName] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [templates, setTemplates] = useState<TemplateOption[]>([]);

  useEffect(() => {
    fetch("/api/templates")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setTemplates(data.templates);
      })
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/builds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId, projectName, templateId: templateId || undefined }),
      });
      if (res.ok) onCreated();
    } catch {
      // handle error
    } finally {
      setSubmitting(false);
    }
  };

  const selectedTemplate = templates.find((t) => t.id === templateId);

  return (
    <div className="bg-white rounded-lg border p-6">
      <h2 className="text-lg font-semibold mb-4">Create Free Build from Lead</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <input
            type="text"
            placeholder="Lead ID"
            value={leadId}
            onChange={(e) => setLeadId(e.target.value)}
            required
            className="rounded-lg border px-3 py-2 text-sm"
          />
          <input
            type="text"
            placeholder="Project Name"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            required
            className="rounded-lg border px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={submitting}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting ? "Creating..." : "Create Build"}
          </button>
        </div>

        {/* Template Selection Grid */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Select Template</label>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {templates.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTemplateId(t.id)}
                className={`p-3 rounded-lg border-2 text-left transition-all ${
                  templateId === t.id
                    ? "border-blue-500 bg-blue-50 shadow-md"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="flex gap-1 mb-2">
                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: t.colors.primary }} />
                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: t.colors.secondary }} />
                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: t.colors.accent }} />
                </div>
                <div className="text-sm font-medium text-gray-900">{t.name}</div>
                <div className="text-xs text-gray-500 mt-0.5">{t.industry}</div>
              </button>
            ))}
          </div>
          {selectedTemplate && (
            <p className="text-sm text-gray-500 mt-2">{selectedTemplate.description}</p>
          )}
        </div>
      </form>
    </div>
  );
}
