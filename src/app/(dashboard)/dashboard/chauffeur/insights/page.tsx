"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Clock,
  DollarSign,
  Users,
  Star,
  ArrowRight,
  Zap,
  Settings,
} from "lucide-react";

interface Insight {
  id: string;
  category: string;
  type: string;
  title: string;
  description: string;
  confidence: number | null;
  actionRequired: boolean;
  actionTaken: boolean;
  createdAt: string;
}

const categoryConfig: Record<string, { icon: React.ElementType; color: string; bgColor: string }> = {
  sales: { icon: DollarSign, color: "text-emerald-600", bgColor: "bg-emerald-100" },
  costs: { icon: TrendingDown, color: "text-red-600", bgColor: "bg-red-100" },
  staffing: { icon: Users, color: "text-blue-600", bgColor: "bg-blue-100" },
  marketing: { icon: TrendingUp, color: "text-purple-600", bgColor: "bg-purple-100" },
  competitors: { icon: Star, color: "text-amber-600", bgColor: "bg-amber-100" },
};

const typeConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  trend: { label: "Trend", color: "text-blue-700", bgColor: "bg-blue-100 border border-blue-200" },
  alert: { label: "Alert", color: "text-red-700", bgColor: "bg-red-100 border border-red-200" },
  opportunity: { label: "Opportunity", color: "text-emerald-700", bgColor: "bg-emerald-100 border border-emerald-200" },
  recommendation: { label: "Recommendation", color: "text-purple-700", bgColor: "bg-purple-100 border border-purple-200" },
};

export default function InsightsPage() {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    async function fetchInsights() {
      try {
        const res = await fetch("/api/chauffeur/insights");
        if (res.ok) {
          const data = await res.json();
          setInsights(data.insights || []);
        }
      } catch {
        // Failed to fetch insights
      } finally {
        setLoading(false);
      }
    }

    fetchInsights();
  }, []);

  const filteredInsights = filter === "all"
    ? insights
    : insights.filter(i => i.category === filter || i.type === filter);

  const handleMarkComplete = async (insightId: string) => {
    try {
      const res = await fetch(`/api/chauffeur/insights/${insightId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actionTaken: true }),
      });
      if (res.ok) {
        setInsights(prev =>
          prev.map(i => i.id === insightId ? { ...i, actionTaken: true } : i)
        );
      }
    } catch {
      // Failed to update insight
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">AI Insights</h1>
          <p className="text-gray-500 mt-1">
            AI-powered recommendations to grow your business
          </p>
        </div>
        <Link href="/dashboard/chauffeur/integrations">
          <Button className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-lg shadow-purple-500/25">
            <Settings className="h-4 w-4 mr-2" />
            Manage Integrations
          </Button>
        </Link>
      </div>

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2">
        {["all", "sales", "costs", "marketing", "opportunity", "alert"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              filter === f
                ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md"
                : "bg-white/60 text-gray-600 hover:bg-white hover:text-gray-900"
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* No insights state */}
      {filteredInsights.length === 0 && (
        <Card variant="gradient" className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 overflow-hidden relative">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=%2260%22 height=%2260%22 viewBox=%220 0 60 60%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cg fill=%22none%22 fill-rule=%22evenodd%22%3E%3Cg fill=%22%23ffffff%22 fill-opacity=%220.1%22%3E%3Cpath d=%22M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-30" />
          <CardContent className="py-12 relative">
            <div className="flex flex-col items-center text-center">
              <div className="h-20 w-20 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center mb-6">
                <Zap className="h-10 w-10 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">
                No insights yet
              </h3>
              <p className="text-white/80 max-w-md mb-6">
                Connect your business tools to start receiving AI-powered insights and recommendations
              </p>
              <Link href="/dashboard/chauffeur/integrations">
                <Button className="bg-white text-indigo-600 hover:bg-white/90 shadow-lg">
                  Connect Integrations
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Insights grid */}
      {filteredInsights.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          {filteredInsights.map((insight) => {
            const category = categoryConfig[insight.category] || categoryConfig.sales;
            const type = typeConfig[insight.type] || typeConfig.recommendation;
            const CategoryIcon = category.icon;

            return (
              <Card key={insight.id} variant="professional" hover="lift" className={insight.actionTaken ? "opacity-60" : ""}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`h-10 w-10 rounded-xl ${category.bgColor} flex items-center justify-center`}>
                        <CategoryIcon className={`h-5 w-5 ${category.color}`} />
                      </div>
                      <div>
                        <CardTitle className="text-base">{insight.title}</CardTitle>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge className={`${type.bgColor} ${type.color} text-xs`}>
                            {type.label}
                          </Badge>
                          {insight.confidence && (
                            <span className="text-xs text-gray-400">
                              {Math.round(insight.confidence * 100)}% confidence
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    {insight.actionRequired && !insight.actionTaken && (
                      <Badge className="bg-amber-100 text-amber-700 border border-amber-200">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        Action Required
                      </Badge>
                    )}
                    {insight.actionTaken && (
                      <Badge className="bg-emerald-100 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Completed
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 mb-4">{insight.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(insight.createdAt).toLocaleDateString()}
                    </span>
                    {insight.actionRequired && !insight.actionTaken && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleMarkComplete(insight.id)}
                        className="bg-white/50 hover:bg-white"
                      >
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Mark Complete
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Summary cards */}
      <div className="grid gap-5 md:grid-cols-3">
        <Card variant="professional">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Total Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">
              {insights.length}
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Generated this month
            </p>
          </CardContent>
        </Card>

        <Card variant="professional">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Actions Required
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-600">
              {insights.filter(i => i.actionRequired && !i.actionTaken).length}
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Pending your attention
            </p>
          </CardContent>
        </Card>

        <Card variant="professional">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Actions Completed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-emerald-600">
              {insights.filter(i => i.actionTaken).length}
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Implemented this month
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
