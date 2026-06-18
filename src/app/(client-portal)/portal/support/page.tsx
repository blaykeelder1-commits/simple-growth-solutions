"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MessageCircle, Send, Loader2 } from "lucide-react";
import Link from "next/link";

interface Msg {
  role: "user" | "assistant";
  content: string;
}

const GREETING: Msg = {
  role: "assistant",
  content:
    "Hi! I'm Andy, your support assistant. Ask me anything about your website, your plan, or a change request. I usually reply within a few minutes — your message comes straight to me.",
};

export default function SupportPage() {
  const [serverMsgs, setServerMsgs] = useState<Msg[]>([]);
  const [pending, setPending] = useState<Msg[]>([]); // optimistic, not yet in server history
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [awaitingReply, setAwaitingReply] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const endRef = useRef<HTMLDivElement>(null);

  const fetchHistory = useCallback(async (): Promise<Msg[]> => {
    const res = await fetch("/api/support/chat");
    if (!res.ok) return [];
    const data = await res.json();
    return (data.messages || []).map((m: { role: string; content: string }) => ({
      role: m.role === "user" ? "user" : "assistant",
      content: m.content,
    }));
  }, []);

  useEffect(() => {
    fetchHistory()
      .then((h) => setServerMsgs(h))
      .catch(() => {})
      .finally(() => setLoadingHistory(false));
  }, [fetchHistory]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [serverMsgs, pending, awaitingReply]);

  // Poll for Andy's reply after the customer sends. Stops when a new assistant
  // message lands or after ~4 minutes.
  const pollForReply = useCallback(
    (assistantCountBefore: number) => {
      let tries = 0;
      const maxTries = 34; // ~4 min at 7s
      const tick = async () => {
        tries += 1;
        const h = await fetchHistory().catch(() => null);
        if (h) {
          const assistantNow = h.filter((m) => m.role === "assistant").length;
          if (assistantNow > assistantCountBefore) {
            setServerMsgs(h);
            setPending([]);
            setAwaitingReply(false);
            return;
          }
          setServerMsgs(h);
        }
        if (tries >= maxTries) {
          setAwaitingReply(false);
          return;
        }
        setTimeout(tick, 7000);
      };
      setTimeout(tick, 7000);
    },
    [fetchHistory]
  );

  const send = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setInput("");
    setSending(true);
    const userMsg: Msg = { role: "user", content: text };
    setPending((p) => [...p, userMsg]);
    const assistantCountBefore = serverMsgs.filter((m) => m.role === "assistant").length;
    try {
      const res = await fetch("/api/support/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      const data = await res.json().catch(() => ({}));
      if (data.ok) {
        setAwaitingReply(true);
        pollForReply(assistantCountBefore);
      } else {
        setPending((p) => [
          ...p,
          {
            role: "assistant",
            content:
              data.message ||
              "Sorry — I couldn't send that. Please try again, or submit a change request and we'll follow up.",
          },
        ]);
      }
    } catch {
      setPending((p) => [
        ...p,
        {
          role: "assistant",
          content: "I couldn't reach the server just now. Please try again in a moment.",
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  // Render = greeting + server history + any optimistic pending not yet in server.
  const serverContents = new Set(serverMsgs.map((m) => m.role + "|" + m.content));
  const shownPending = pending.filter((m) => !serverContents.has(m.role + "|" + m.content));
  const messages = [GREETING, ...serverMsgs, ...shownPending];

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 shadow-md shadow-blue-500/25">
          <MessageCircle className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Support</h1>
          <p className="text-sm text-gray-500">
            Chat with Andy — he usually replies within a few minutes.
          </p>
        </div>
      </div>

      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="h-[55vh] overflow-y-auto p-4 space-y-4 bg-white/40">
            {loadingHistory ? (
              <div className="flex items-center justify-center h-full text-gray-400">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : (
              messages.map((m, i) => (
                <div
                  key={i}
                  className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap ${
                      m.role === "user"
                        ? "bg-gradient-to-r from-blue-500 to-indigo-500 text-white"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {m.content}
                  </div>
                </div>
              ))
            )}
            {awaitingReply && (
              <div className="flex justify-start">
                <div className="rounded-2xl px-4 py-2.5 bg-gray-100 text-gray-500 text-sm flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Andy is looking into this — a reply will appear here shortly.
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          <div className="border-t border-gray-100 p-3 bg-white/70">
            <div className="flex items-end gap-2">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Ask Andy a question…"
                rows={1}
                className="resize-none min-h-[44px] max-h-32"
                disabled={sending}
              />
              <Button onClick={send} disabled={sending || !input.trim()} size="icon" className="h-11 w-11 shrink-0">
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-xs text-gray-400 mt-2 px-1">
              Andy helps with questions and writing up requests. To get an edit
              made, submit a{" "}
              <Link href="/portal/requests/new" className="text-blue-600 hover:underline">
                change request
              </Link>
              .
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
