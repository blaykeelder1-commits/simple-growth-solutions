"use client";

import { useEffect, useState } from "react";
import { RefreshCw, ExternalLink, Send, Check, Pencil, X, Bot } from "lucide-react";
import { askAndyAbout } from "@/components/admin/AndyChat";

interface ApprovalItem {
  id: string;
  code: string;
  kind: string;
  refId: string;
  title: string;
  draft: string | null;
  previewUrl: string | null;
  agentNote: string | null;
  status: string;
  decidedVia: string | null;
  decidedAt: string | null;
  feedback: string | null;
  sentAt: string | null;
  sentBy: string | null;
  createdAt: string;
}

// Mirrors CUSTOMER_FACING in src/lib/approvals — these wait for Send after approval.
const CUSTOMER_FACING = new Set(["cr_ship", "support_reply"]);

const KIND_LABELS: Record<string, string> = {
  cr_ship: "Site edit",
  support_reply: "Support reply",
  build_start: "Start new build",
  rule_change: "Rule change",
};

const STATUS_STYLES: Record<string, string> = {
  sent: "bg-green-100 text-green-800",
  approved: "bg-blue-100 text-blue-800",
  edits_requested: "bg-amber-100 text-amber-800",
  rejected: "bg-red-100 text-red-800",
  superseded: "bg-gray-100 text-gray-600",
};

function ItemCard({ item, onAction }: { item: ApprovalItem; onAction: (id: string, action: string, reason?: string) => Promise<string | null> }) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const needsReason = (a: string) => a === "edit" || a === "reject";

  const act = async (action: string) => {
    if (needsReason(action) && !reason.trim()) {
      setError("Say what to change (this becomes Andy's lesson).");
      return;
    }
    setBusy(true);
    setError(await onAction(item.id, action, reason.trim() || undefined));
    setBusy(false);
  };

  const awaiting = item.status === "awaiting";
  const readyToSend = item.status === "approved" && CUSTOMER_FACING.has(item.kind);

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-sm font-bold bg-gray-900 text-white px-2 py-0.5 rounded">{item.code}</span>
        <span className="text-xs uppercase tracking-wide text-gray-500">{KIND_LABELS[item.kind] ?? item.kind}</span>
        {!awaiting && (
          <span className={`text-xs px-2 py-0.5 rounded ${STATUS_STYLES[item.status] ?? "bg-gray-100 text-gray-700"}`}>
            {item.status.replace("_", " ")}
            {item.decidedVia ? ` · ${item.decidedVia}` : ""}
          </span>
        )}
        <span className="text-xs text-gray-400 ml-auto">{new Date(item.createdAt).toLocaleString()}</span>
        <button
          onClick={() => askAndyAbout(`${item.code} · ${item.title}`)}
          className="inline-flex items-center gap-1 text-xs text-gray-600 hover:text-gray-900"
          title="Ask Andy about this item"
        >
          <Bot className="w-3.5 h-3.5" /> Ask Andy
        </button>
      </div>
      <p className="font-medium text-gray-900 break-words">{item.title}</p>
      {item.previewUrl && (
        <a href={item.previewUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-blue-700 underline break-all">
          Open preview <ExternalLink className="w-3.5 h-3.5 shrink-0" />
        </a>
      )}
      {item.draft && (
        <div className="text-sm text-gray-800 bg-gray-50 border border-gray-200 rounded p-3 whitespace-pre-wrap break-words">{item.draft}</div>
      )}
      {item.agentNote && (
        <details className="text-sm text-gray-600">
          <summary className="cursor-pointer select-none">Andy&apos;s review note</summary>
          <p className="mt-2 whitespace-pre-wrap break-words">{item.agentNote}</p>
        </details>
      )}
      {item.feedback && <p className="text-sm text-amber-800 break-words">Your note: {item.feedback}</p>}

      {awaiting && (
        <>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="What to change / why (required for edits or reject)"
            rows={2}
            className="w-full text-sm border border-gray-300 rounded p-2"
          />
          <div className="flex flex-wrap gap-2">
            <button disabled={busy} onClick={() => act("approve")} className="inline-flex items-center gap-1 px-3 py-2 text-sm rounded bg-blue-600 text-white disabled:opacity-50">
              <Check className="w-4 h-4" /> Approve
            </button>
            <button disabled={busy} onClick={() => act("edit")} className="inline-flex items-center gap-1 px-3 py-2 text-sm rounded border border-amber-500 text-amber-800 disabled:opacity-50">
              <Pencil className="w-4 h-4" /> Request edits
            </button>
            <button disabled={busy} onClick={() => act("reject")} className="inline-flex items-center gap-1 px-3 py-2 text-sm rounded border border-red-400 text-red-700 disabled:opacity-50">
              <X className="w-4 h-4" /> Reject
            </button>
          </div>
        </>
      )}
      {readyToSend && (
        <button disabled={busy} onClick={() => act("send")} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded bg-green-600 text-white disabled:opacity-50">
          <Send className="w-4 h-4" /> {item.kind === "cr_ship" ? "Send — ship to the live site" : "Send to customer"}
        </button>
      )}
      {error && <p className="text-sm text-red-700">{error}</p>}
    </div>
  );
}

export default function ApprovalsPage() {
  const [items, setItems] = useState<ApprovalItem[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = async () => {
    try {
      const res = await fetch("/api/approvals");
      const j = await res.json();
      if (!j.success) throw new Error(j.message || `HTTP ${res.status}`);
      setItems(j.items);
      setLoadError(null);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : String(e));
    }
  };

  useEffect(() => {
    load();
  }, []);

  const onAction = async (id: string, action: string, reason?: string): Promise<string | null> => {
    const res = await fetch(`/api/approvals/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, reason }),
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok || !j.success) return j.message || `Failed (HTTP ${res.status})`;
    await load();
    return null;
  };

  if (loadError) return <p className="text-red-700">Could not load approvals: {loadError}</p>;
  if (!items) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  const awaiting = items.filter((i) => i.status === "awaiting");
  const ready = items.filter((i) => i.status === "approved" && CUSTOMER_FACING.has(i.kind));
  const recent = items.filter((i) => !awaiting.includes(i) && !ready.includes(i));

  const column = (title: string, hint: string, list: ApprovalItem[]) => (
    <section className="space-y-3 min-w-0">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">
          {title} <span className="text-gray-400 font-normal">({list.length})</span>
        </h2>
        <p className="text-sm text-gray-500">{hint}</p>
      </div>
      {list.length === 0 ? (
        <p className="text-sm text-gray-400 border border-dashed border-gray-300 rounded-lg p-4">Nothing here.</p>
      ) : (
        list.map((item) => <ItemCard key={item.id} item={item} onAction={onAction} />)
      )}
    </section>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Approvals</h1>
          <p className="text-sm text-gray-600">
            Approve in WhatsApp (<span className="font-mono">approve S7K2Q</span>) or here. Nothing reaches a customer until you press Send.
          </p>
        </div>
        <button onClick={load} className="p-2 rounded hover:bg-gray-100" aria-label="Refresh">
          <RefreshCw className="w-5 h-5 text-gray-500" />
        </button>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {column("Awaiting your approval", "Andy's work, waiting on your decision.", awaiting)}
        {column("Approved — ready to send", "You approved these. Send delivers them to the customer.", ready)}
      </div>
      {recent.length > 0 && (
        <details className="bg-gray-50 rounded-lg p-4">
          <summary className="cursor-pointer font-medium text-gray-700">Recently decided ({recent.length})</summary>
          <div className="mt-3 grid grid-cols-1 lg:grid-cols-2 gap-3">
            {recent.map((item) => (
              <ItemCard key={item.id} item={item} onAction={onAction} />
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
