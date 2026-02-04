"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  MessageCircle,
  X,
  Send,
  Loader2,
  Sparkles,
  Minimize2,
  Maximize2,
  ExternalLink,
} from "lucide-react";
import { useRouter } from "next/navigation";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

interface ChatResponse {
  message: string;
  suggestions?: string[];
  actions?: {
    label: string;
    action: string;
    params?: Record<string, string>;
  }[];
}

interface ChatWidgetProps {
  position?: "bottom-right" | "bottom-left";
  initialOpen?: boolean;
}

export function ChatWidget({
  position = "bottom-right",
  initialOpen = false,
}: ChatWidgetProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(initialOpen);
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([
    "How's my cash flow looking?",
    "Which clients should I follow up with?",
    "What's my business health score?",
    "Show me insights for this week",
  ]);
  const [actions, setActions] = useState<ChatResponse["actions"]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Load conversation history on mount
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      loadHistory();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const loadHistory = async () => {
    try {
      const res = await fetch("/api/chat?limit=20");
      if (res.ok) {
        const data = await res.json();
        if (data.messages && data.messages.length > 0) {
          setMessages(data.messages);
        }
      }
    } catch {
      // Ignore history load errors
    }
  };

  const sendMessage = async (messageText?: string) => {
    const text = messageText || input.trim();
    if (!text || isLoading) return;

    const userMessage: ChatMessage = {
      role: "user",
      content: text,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);
    setSuggestions([]);
    setActions([]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          conversationHistory: messages.slice(-10),
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to get response");
      }

      const data: ChatResponse = await res.json();

      const assistantMessage: ChatMessage = {
        role: "assistant",
        content: data.message,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMessage]);

      if (data.suggestions) {
        setSuggestions(data.suggestions);
      }

      if (data.actions) {
        setActions(data.actions);
      }
    } catch {
      const errorMessage: ChatMessage = {
        role: "assistant",
        content:
          "I'm having trouble connecting right now. Please try again in a moment.",
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleAction = (action: NonNullable<ChatResponse["actions"]>[0]) => {
    if (action.action === "navigate" && action.params?.path) {
      router.push(action.params.path);
      setIsOpen(false);
    }
  };

  const positionClasses =
    position === "bottom-right" ? "right-6" : "left-6";

  const widgetSize = isExpanded
    ? "w-[500px] h-[700px]"
    : "w-[380px] h-[550px]";

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 ${positionClasses} z-50 h-14 w-14 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/40 hover:scale-105 transition-all duration-200 flex items-center justify-center group`}
        aria-label="Open chat"
      >
        <MessageCircle className="h-6 w-6" />
        <span className="absolute -top-1 -right-1 h-4 w-4 bg-green-500 rounded-full border-2 border-white animate-pulse" />
      </button>
    );
  }

  return (
    <div
      className={`fixed bottom-6 ${positionClasses} z-50 ${widgetSize} bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden transition-all duration-200`}
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-white">Business Sidekick</h3>
            <p className="text-xs text-white/70">AI-powered assistant</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            aria-label={isExpanded ? "Minimize" : "Expand"}
          >
            {isExpanded ? (
              <Minimize2 className="h-4 w-4 text-white" />
            ) : (
              <Maximize2 className="h-4 w-4 text-white" />
            )}
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            aria-label="Close chat"
          >
            <X className="h-4 w-4 text-white" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {messages.length === 0 && (
          <div className="text-center py-8">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center mx-auto mb-4">
              <Sparkles className="h-8 w-8 text-indigo-600" />
            </div>
            <h4 className="font-semibold text-gray-900 mb-1">
              Hi! I&apos;m your business sidekick
            </h4>
            <p className="text-sm text-gray-500 max-w-xs mx-auto">
              Ask me about your cash flow, business health, clients, or anything
              else about your business.
            </p>
          </div>
        )}

        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${
                message.role === "user"
                  ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white"
                  : "bg-white border border-gray-200 text-gray-800"
              }`}
            >
              <div className="text-sm whitespace-pre-wrap prose prose-sm max-w-none">
                {message.role === "assistant" ? (
                  <div
                    dangerouslySetInnerHTML={{
                      __html: formatMarkdown(message.content),
                    }}
                  />
                ) : (
                  message.content
                )}
              </div>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3">
              <div className="flex items-center gap-2 text-gray-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Thinking...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Actions */}
      {actions && actions.length > 0 && (
        <div className="px-4 py-2 border-t border-gray-100 bg-white flex flex-wrap gap-2">
          {actions.map((action, index) => (
            <Button
              key={index}
              size="sm"
              variant="outline"
              onClick={() => handleAction(action)}
              className="text-xs"
            >
              {action.label}
              <ExternalLink className="h-3 w-3 ml-1" />
            </Button>
          ))}
        </div>
      )}

      {/* Suggestions */}
      {suggestions.length > 0 && messages.length < 3 && (
        <div className="px-4 py-2 border-t border-gray-100 bg-white">
          <p className="text-xs text-gray-500 mb-2">Try asking:</p>
          <div className="flex flex-wrap gap-1.5">
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => sendMessage(suggestion)}
                className="text-xs px-3 py-1.5 bg-gray-100 hover:bg-indigo-100 hover:text-indigo-700 rounded-full transition-colors text-gray-600"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-3 border-t border-gray-200 bg-white">
        <div className="flex items-end gap-2">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask me anything about your business..."
              className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 pr-12 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none min-h-[48px] max-h-[120px]"
              rows={1}
              disabled={isLoading}
            />
          </div>
          <Button
            onClick={() => sendMessage()}
            disabled={!input.trim() || isLoading}
            className="h-12 w-12 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-md shadow-indigo-500/25"
          >
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </Button>
        </div>
        <p className="text-[10px] text-gray-400 mt-2 text-center">
          AI suggestions are educational only. Consult professionals for
          decisions.
        </p>
      </div>
    </div>
  );
}

// Simple markdown formatter
function formatMarkdown(text: string): string {
  return text
    // Bold
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    // Bullet points
    .replace(/^- (.*?)$/gm, "<li>$1</li>")
    .replace(/(<li>.*<\/li>)+/g, "<ul class='list-disc pl-4 my-2'>$&</ul>")
    // Line breaks
    .replace(/\n\n/g, "<br><br>")
    .replace(/\n/g, "<br>");
}

// Export a standalone chat page component
export function ChatPage() {
  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col bg-white rounded-2xl border border-gray-200 overflow-hidden">
      <ChatWidget initialOpen={true} />
    </div>
  );
}
