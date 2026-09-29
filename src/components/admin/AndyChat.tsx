"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Bot, Send, X, Loader2 } from "lucide-react";

interface StaffMessage {
  id: string;
  role: "blayke" | "andy";
  content: string;
  context: string | null;
  createdAt: string;
}

/** Open the chat from anywhere in the admin, pinned to what you're looking at. */
export function askAndyAbout(label: string) {
  window.dispatchEvent(new CustomEvent("andy:open", { detail: { label } }));
}

const PAGE_LABELS: Record<string, string> = {
  "/admin": "Dashboard",
  "/admin/approvals": "Approvals",
  "/admin/dispatch": "Dispatch board",
  "/admin/projects": "Projects",
  "/admin/builds": "Website builds",
  "/admin/leads": "Leads",
  "/admin/reports": "Reports",
  "/admin/funnel": "Funnel",
};

function pageLabel(pathname: string): string {
  if (PAGE_LABELS[pathname]) return PAGE_LABELS[pathname];
  const project = pathname.match(/^\/admin\/projects\/([^/]+)/);
  if (project) return `Project ${project[1]}`;
  const lead = pathname.match(/^\/admin\/leads\/([^/]+)/);
  if (lead) return `Lead ${lead[1]}`;
  return pathname;
}

/**
 * "Ask Andy" — the same Andy as the SGS WhatsApp chat, from inside the admin portal.
 * Messages go to NanoClaw, which runs them in the SGS group (same rules, memory and
 * tools) and posts the answer back here. Anything for a customer comes back as an
 * approval code, never sent directly.
 */
export default function AndyChat() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<StaffMessage[]>([]);
  const [waiting, setWaiting] = useState(false);
  const [draft, setDraft] = useState("");
  const [focus, setFocus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/andy-chat");
      const j = await res.json();
      if (!j.success) throw new Error(j.message || `HTTP ${res.status}`);
      setMessages(j.messages);
      setWaiting(j.waiting);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  // Open from anywhere (e.g. an approval card's "Ask Andy" button).
  useEffect(() => {
    const onOpen = (e: Event) => {
      const label = (e as CustomEvent<{ label?: string }>).detail?.label;
      if (label) setFocus(label);
      setOpen(true);
    };
    window.addEventListener("andy:open", onOpen);
    return () => window.removeEventListener("andy:open", onOpen);
  }, []);

  // Poll while open: fast while Andy is working, slower when idle.
  useEffect(() => {
    if (!open) return;
    load();
    const t = setInterval(load, waiting ? 3000 : 10000);
    return () => clearInterval(t);
  }, [open, waiting, load]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages, waiting, open]);

  const context = focus ? `${pageLabel(pathname)} · ${focus}` : pageLabel(pathname);

  const send = async () => {
    const content = draft.trim();
    if (!content || sending) return;
    setSending(true);
    try {
      const res = await fetch("/api/admin/andy-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, context }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j.success) throw new Error(j.message || `HTTP ${res.status}`);
      setDraft("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSending(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-40 inline-flex items-center gap-2 rounded-full bg-gray-900 px-4 py-3 text-sm font-semibold text-white shadow-lg hover:bg-gray-800"
      >
        <Bot className="h-5 w-5" /> Ask Andy
      </button>
    );
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 flex h-[80vh] flex-col border-t border-gray-200 bg-white shadow-2xl sm:inset-x-auto sm:bottom-5 sm:right-5 sm:h-[600px] sm:w-[420px] sm:rounded-xl sm:border">
      <div className="flex items-center gap-2 border-b border-gray-200 px-4 py-3">
        <Bot className="h-5 w-5 text-gray-700" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-gray-900">Andy</p>
          <p className="truncate text-xs text-gray-500">Same Andy as WhatsApp · website &amp; SGS work only</p>
        </div>
        <button onClick={() => setOpen(false)} className="rounded p-1 hover:bg-gray-100" aria-label="Close">
          <X className="h-5 w-5 text-gray-500" />
        </button>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
        {messages.length === 0 && !waiting && (
          <p className="text-sm text-gray-500">
            Ask about a customer, an edit, or have Andy research competitors. Anything meant for a customer comes back as an
            approval code — nothing is sent from here. <span className="font-mono">approve S…</span> works here too.
          </p>
        )}
        {messages.map((m) => (
          <div key={m.id} className={m.role === "blayke" ? "flex justify-end" : "flex justify-start"}>
            <div
              className={`max-w-[85%] whitespace-pre-wrap break-words rounded-lg px-3 py-2 text-sm ${
                m.role === "blayke" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-900"
              }`}
            >
              {m.role === "blayke" && m.context && (
                <p className="mb-1 text-[11px] uppercase tracking-wide text-blue-100">{m.context}</p>
              )}
              {m.content}
            </div>
          </div>
        ))}
        {waiting && (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            {messages.length > 0 &&
            Date.now() - new Date(messages[messages.length - 1].createdAt).getTime() > 10 * 60 * 1000
              ? "No answer after 10 minutes — Andy may be busy or restarting. Send it again, or use WhatsApp."
              : "Andy is working on it…"}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-gray-200 p-3">
        <div className="mb-2 flex items-center gap-2 text-xs text-gray-500">
          <span className="truncate">About: {context}</span>
          {focus && (
            <button onClick={() => setFocus(null)} className="shrink-0 underline">
              clear
            </button>
          )}
        </div>
        <div className="flex items-end gap-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            rows={2}
            placeholder="Message Andy… (Enter to send, Shift+Enter for a new line)"
            className="min-w-0 flex-1 resize-none rounded border border-gray-300 p-2 text-sm"
          />
          <button
            onClick={send}
            disabled={sending || !draft.trim()}
            className="rounded bg-gray-900 p-2.5 text-white disabled:opacity-40"
            aria-label="Send to Andy"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
        {error && <p className="mt-2 text-xs text-red-700">{error}</p>}
      </div>
    </div>
  );
}
