"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Send,
  Loader2,
  Sparkles,
  Trash2,
  ExternalLink,
  ArrowRight,
  DollarSign,
  TrendingUp,
  Users,
  Activity,
} from "lucide-react";

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

const QUICK_ACTIONS = [
  {
    label: "Cash Flow Status",
    question: "How's my cash flow looking? Any concerns I should know about?",
    icon: DollarSign,
    color: "from-emerald-500 to-teal-600",
  },
  {
    label: "Overdue Invoices",
    question: "Which clients have overdue invoices? Who should I follow up with first?",
    icon: TrendingUp,
    color: "from-amber-500 to-orange-600",
  },
  {
    label: "Business Health",
    question: "What's my overall business health score? What's affecting it?",
    icon: Activity,
    color: "from-blue-500 to-indigo-600",
  },
  {
    label: "Staffing Insights",
    question: "Are my staffing levels appropriate? Any hiring recommendations?",
    icon: Users,
    color: "from-purple-500 to-pink-600",
  },
];

export default function ChatPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [actions, setActions] = useState<ChatResponse["actions"]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Load conversation history on mount
  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const res = await fetch("/api/chat?limit=50");
      if (res.ok) {
        const data = await res.json();
        if (data.messages && data.messages.length > 0) {
          setMessages(data.messages);
        }
      }
    } catch {
      // Ignore history load errors
    } finally {
      setIsHistoryLoading(false);
    }
  };

  const clearHistory = () => {
    setMessages([]);
    setSuggestions([]);
    setActions([]);
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
    }
  };

  return (
    <div className="h-[calc(100vh-10rem)] flex gap-6">
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-white rounded-2xl border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-white">
                Business Sidekick
              </h1>
              <p className="text-sm text-white/70">
                Your AI-powered business assistant
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-white/20 text-white border-0">
              <span className="h-2 w-2 bg-green-400 rounded-full mr-2 animate-pulse" />
              Online
            </Badge>
            {messages.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearHistory}
                className="text-white/70 hover:text-white hover:bg-white/10"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Clear
              </Button>
            )}
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-50">
          {isHistoryLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            </div>
          ) : messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center">
              <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center mb-6">
                <Sparkles className="h-10 w-10 text-indigo-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Hi! I&apos;m your business sidekick
              </h2>
              <p className="text-gray-500 max-w-md mb-8">
                I can help you understand your cash flow, identify clients to
                follow up with, analyze business health, and provide insights
                across all your connected systems.
              </p>

              {/* Quick Action Cards */}
              <div className="grid grid-cols-2 gap-4 max-w-lg">
                {QUICK_ACTIONS.map((action, index) => {
                  const Icon = action.icon;
                  return (
                    <button
                      key={index}
                      onClick={() => sendMessage(action.question)}
                      className="p-4 bg-white rounded-xl border border-gray-200 hover:border-indigo-200 hover:shadow-md transition-all text-left group"
                    >
                      <div
                        className={`h-10 w-10 rounded-lg bg-gradient-to-br ${action.color} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}
                      >
                        <Icon className="h-5 w-5 text-white" />
                      </div>
                      <p className="font-medium text-gray-900 text-sm">
                        {action.label}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <>
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[75%] rounded-2xl px-5 py-3 ${
                      message.role === "user"
                        ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white"
                        : "bg-white border border-gray-200 text-gray-800 shadow-sm"
                    }`}
                  >
                    {message.role === "assistant" && (
                      <div className="flex items-center gap-2 mb-2 pb-2 border-b border-gray-100">
                        <Sparkles className="h-4 w-4 text-indigo-600" />
                        <span className="text-xs font-medium text-indigo-600">
                          Business Sidekick
                        </span>
                      </div>
                    )}
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
                    <div
                      className={`text-[10px] mt-2 ${
                        message.role === "user"
                          ? "text-white/60"
                          : "text-gray-400"
                      }`}
                    >
                      {new Date(message.timestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-white border border-gray-200 rounded-2xl px-5 py-3 shadow-sm">
                    <div className="flex items-center gap-3 text-gray-500">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm">Analyzing your data...</span>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Actions Bar */}
        {actions && actions.length > 0 && (
          <div className="px-6 py-3 border-t border-gray-100 bg-white flex flex-wrap gap-2">
            <span className="text-xs text-gray-500 mr-2 self-center">
              Quick actions:
            </span>
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

        {/* Suggestions Bar */}
        {suggestions.length > 0 && (
          <div className="px-6 py-3 border-t border-gray-100 bg-white">
            <span className="text-xs text-gray-500 mr-2">Follow up:</span>
            <div className="flex flex-wrap gap-2 mt-2">
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

        {/* Input Area */}
        <div className="p-4 border-t border-gray-200 bg-white">
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask me anything about your business..."
                className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none min-h-[52px] max-h-[150px]"
                rows={1}
                disabled={isLoading}
              />
            </div>
            <Button
              onClick={() => sendMessage()}
              disabled={!input.trim() || isLoading}
              className="h-[52px] px-6 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-lg shadow-indigo-500/25"
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <Send className="h-5 w-5 mr-2" />
                  Send
                </>
              )}
            </Button>
          </div>
          <p className="text-[10px] text-gray-400 mt-2 text-center">
            AI suggestions are educational only. Always consult qualified
            professionals for important business decisions.
          </p>
        </div>
      </div>

      {/* Sidebar */}
      <div className="w-80 space-y-4">
        {/* Connected Systems */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Connected Systems</CardTitle>
            <CardDescription className="text-xs">
              I have access to data from these sources
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between p-2 bg-emerald-50 rounded-lg">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                  <DollarSign className="h-4 w-4 text-emerald-600" />
                </div>
                <span className="text-sm font-medium text-gray-900">
                  CashFlow AI
                </span>
              </div>
              <Badge className="bg-emerald-100 text-emerald-700 border-0 text-xs">
                Active
              </Badge>
            </div>
            <div className="flex items-center justify-between p-2 bg-indigo-50 rounded-lg">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                  <Activity className="h-4 w-4 text-indigo-600" />
                </div>
                <span className="text-sm font-medium text-gray-900">
                  Business Chauffeur
                </span>
              </div>
              <Badge className="bg-indigo-100 text-indigo-700 border-0 text-xs">
                Active
              </Badge>
            </div>
            <Link href="/dashboard/chauffeur/integrations">
              <Button variant="ghost" size="sm" className="w-full mt-2 text-xs">
                Add More Integrations
                <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Tips */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Tips</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-xs text-gray-600">
              <p className="font-medium text-gray-900 mb-1">Ask specific questions</p>
              <p>&quot;Which clients are most likely to pay late this month?&quot;</p>
            </div>
            <div className="text-xs text-gray-600">
              <p className="font-medium text-gray-900 mb-1">Request analysis</p>
              <p>&quot;Compare my payroll costs to industry benchmarks&quot;</p>
            </div>
            <div className="text-xs text-gray-600">
              <p className="font-medium text-gray-900 mb-1">Get recommendations</p>
              <p>&quot;What should I focus on to improve cash flow?&quot;</p>
            </div>
          </CardContent>
        </Card>
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
    // Numbered lists
    .replace(/^\d+\. (.*?)$/gm, "<li>$1</li>")
    // Headers
    .replace(/^## (.*?)$/gm, "<h3 class='font-semibold text-gray-900 mt-3 mb-1'>$1</h3>")
    .replace(/^### (.*?)$/gm, "<h4 class='font-medium text-gray-800 mt-2 mb-1'>$1</h4>")
    // Line breaks
    .replace(/\n\n/g, "<br><br>")
    .replace(/\n/g, "<br>");
}
