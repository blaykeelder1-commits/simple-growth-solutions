"use client";

import { useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MessageCircle, Send, Loader2, LifeBuoy } from "lucide-react";
import Link from "next/link";

interface Msg {
  role: "user" | "assistant";
  content: string;
}

const GREETING: Msg = {
  role: "assistant",
  content:
    "Hi! I'm Andy, your support assistant. Ask me anything about your website, your plan, or a change request — I'm here to help. If you want an edit made, I can help you write it up as a request.",
};

export default function SupportPage() {
  const [messages, setMessages] = useState<Msg[]>([GREETING]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [escalated, setEscalated] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/support/chat")
      .then((r) => (r.ok ? r.json() : { messages: [] }))
      .then((data) => {
        const history: Msg[] = (data.messages || []).map(
          (m: { role: string; content: string }) => ({
            role: m.role === "user" ? "user" : "assistant",
            content: m.content,
          })
        );
        if (history.length) setMessages([GREETING, ...history]);
      })
      .catch(() => {})
      .finally(() => setLoadingHistory(false));
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  const send = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", content: text }]);
    setSending(true);
    try {
      const res = await fetch("/api/support/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      const data = await res.json().catch(() => ({}));
      const reply: string =
        data.reply ||
        "Sorry — something went wrong on my end. Please try again, or submit a change request and we'll follow up.";
      setMessages((m) => [...m, { role: "assistant", content: reply }]);
      if (data.escalate) setEscalated(true);
    } catch {
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content:
            "I couldn't reach the server just now. Please try again in a moment.",
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

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 shadow-md shadow-blue-500/25">
          <MessageCircle className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Support</h1>
          <p className="text-sm text-gray-500">
            Chat with Andy — answers in plain language, any time.
          </p>
        </div>
      </div>

      {escalated && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 flex items-start gap-3">
          <LifeBuoy className="h-5 w-5 text-amber-600 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-amber-900">Flagged for our team</p>
            <p className="text-amber-800">
              A teammate will follow up with you. You can keep chatting with Andy
              in the meantime.
            </p>
          </div>
        </div>
      )}

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
            {sending && (
              <div className="flex justify-start">
                <div className="rounded-2xl px-4 py-2.5 bg-gray-100 text-gray-500 text-sm flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Andy is typing…
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
