"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  TrendingUp,
  TrendingDown,
  Users,
  Calendar,
  MapPin,
  Lightbulb,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  RefreshCw,
  Settings,
  BarChart3,
  Target,
  Zap,
} from "lucide-react";

interface InsightAction {
  title: string;
  description: string;
  potentialImpact: string;
  difficulty: "easy" | "medium" | "hard";
  timeframe: string;
}

interface GeneratedInsight {
  id: string;
  type: "opportunity" | "warning" | "achievement" | "recommendation" | "benchmark";
  priority: "high" | "medium" | "low";
  category: string;
  title: string;
  summary: string;
  details: string;
  dataPoints: string[];
  action?: InsightAction;
  confidence: "high" | "medium" | "low";
}

interface BusinessIntelligenceReport {
  generatedAt: string;
  businessName: string;
  industry: string;
  region: string;
  healthScore: number;
  healthFactors: { factor: string; score: number; impact: "positive" | "neutral" | "negative" }[];
  keyMetrics: { metric: string; value: string; vsIndustry: string; trend: "up" | "stable" | "down" }[];
  insights: GeneratedInsight[];
  topActions: InsightAction[];
}

const INDUSTRY_OPTIONS = [
  { value: "pet_grooming", label: "Pet Grooming" },
  { value: "hair_salon", label: "Hair Salon / Barbershop" },
  { value: "fast_casual", label: "Fast Casual Restaurant" },
  { value: "auto_repair", label: "Auto Repair Shop" },
];

export default function IndustryIntelligencePage() {
  const [report, setReport] = useState<BusinessIntelligenceReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIndustry, setSelectedIndustry] = useState<string>("");
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    fetchReport();
  }, []);

  async function fetchReport() {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/intelligence");
      if (!res.ok) throw new Error("Failed to load intelligence report");
      const data = await res.json();
      setReport(data);
      // Find matching industry option
      const matchingOption = INDUSTRY_OPTIONS.find(opt =>
        data.industry?.toLowerCase().includes(opt.label.toLowerCase().split(" ")[0])
      );
      setSelectedIndustry(matchingOption?.value || "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  async function updateIndustry(subtype: string) {
    try {
      setSelectedIndustry(subtype);
      await fetch("/api/intelligence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ industrySubtype: subtype }),
      });
      fetchReport();
    } catch {
      // Silent fail - settings update
    }
  }

  function getInsightIcon(type: string) {
    switch (type) {
      case "opportunity": return <TrendingUp className="h-5 w-5 text-green-500" />;
      case "warning": return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case "achievement": return <CheckCircle2 className="h-5 w-5 text-blue-500" />;
      case "recommendation": return <Lightbulb className="h-5 w-5 text-purple-500" />;
      case "benchmark": return <MapPin className="h-5 w-5 text-orange-500" />;
      default: return <Lightbulb className="h-5 w-5" />;
    }
  }

  function getPriorityColor(priority: string) {
    switch (priority) {
      case "high": return "bg-red-100 text-red-800 border-red-200";
      case "medium": return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "low": return "bg-green-100 text-green-800 border-green-200";
      default: return "bg-gray-100 text-gray-800";
    }
  }

  function getDifficultyColor(difficulty: string) {
    switch (difficulty) {
      case "easy": return "bg-green-100 text-green-700";
      case "medium": return "bg-yellow-100 text-yellow-700";
      case "hard": return "bg-red-100 text-red-700";
      default: return "bg-gray-100 text-gray-700";
    }
  }

  function getTrendIcon(trend: string) {
    if (trend === "up") return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (trend === "down") return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <span className="h-4 w-4 text-gray-400">-</span>;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Industry Intelligence</h1>
          <p className="text-muted-foreground">AI-powered insights for your business</p>
        </div>
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p className="text-destructive">{error}</p>
            <Button onClick={fetchReport} className="mt-4">Try Again</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Industry Intelligence</h1>
          <p className="text-muted-foreground">
            {report?.industry || "Configure your industry"} insights for {report?.businessName || "your business"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setShowSettings(!showSettings)}>
            <Settings className="h-4 w-4 mr-2" />
            Industry Settings
          </Button>
          <Button variant="outline" onClick={fetchReport}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <Card className="border-blue-200 bg-blue-50/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-blue-600" />
              Configure Industry Profile
            </CardTitle>
            <CardDescription>
              Select your industry to get tailored benchmarks, seasonal insights, and acquisition analysis
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm font-medium">Industry Type</label>
                <Select
                  value={selectedIndustry}
                  onValueChange={updateIndustry}
                >
                  <SelectTrigger className="mt-1 bg-white">
                    <SelectValue placeholder="Select your industry" />
                  </SelectTrigger>
                  <SelectContent>
                    {INDUSTRY_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  This helps us provide industry-specific benchmarks and seasonal patterns
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Health Score & Key Metrics */}
      {report && (
        <div className="grid gap-6 md:grid-cols-4">
          <Card className="md:col-span-1 bg-gradient-to-br from-slate-50 to-slate-100">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-blue-600" />
                Business Health
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div
                  className={`text-5xl font-bold ${
                    report.healthScore >= 70
                      ? "text-green-600"
                      : report.healthScore >= 50
                      ? "text-yellow-600"
                      : "text-red-600"
                  }`}
                >
                  {report.healthScore}
                </div>
                <div className="text-sm text-muted-foreground">/ 100</div>
              </div>
              <div className="mt-4 space-y-2">
                {report.healthFactors.map((factor) => (
                  <div key={factor.factor} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{factor.factor}</span>
                    <span
                      className={`font-medium ${
                        factor.impact === "positive"
                          ? "text-green-600"
                          : factor.impact === "negative"
                          ? "text-red-600"
                          : "text-gray-500"
                      }`}
                    >
                      {factor.score}/25
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Key Metrics */}
          <Card className="md:col-span-3">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Key Performance Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-4">
                {report.keyMetrics.map((metric) => (
                  <div key={metric.metric} className="space-y-1">
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      {metric.metric}
                      {getTrendIcon(metric.trend)}
                    </div>
                    <div className="text-2xl font-bold">{metric.value}</div>
                    <div className="text-xs text-muted-foreground">{metric.vsIndustry}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Top Actions */}
      {report && report.topActions && report.topActions.length > 0 && (
        <Card className="border-purple-200 bg-gradient-to-r from-purple-50 to-pink-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-purple-600" />
              Top Recommended Actions
            </CardTitle>
            <CardDescription>High-impact opportunities based on your business data</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              {report.topActions.map((action, i) => (
                <div
                  key={i}
                  className="p-4 bg-white border rounded-lg hover:border-purple-300 hover:shadow-md transition-all"
                >
                  <div className="flex items-start justify-between">
                    <h3 className="font-medium">{action.title}</h3>
                    <Badge className={getDifficultyColor(action.difficulty)}>
                      {action.difficulty}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">{action.description}</p>
                  <div className="mt-3 text-sm">
                    <span className="font-medium text-green-600">{action.potentialImpact}</span>
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {action.timeframe}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* All Insights */}
      {report && report.insights && report.insights.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>All Business Insights</CardTitle>
            <CardDescription>
              {report.insights.length} insights generated from your business data and industry analysis
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {report.insights.map((insight) => (
                <div
                  key={insight.id}
                  className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    {getInsightIcon(insight.type)}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-medium">{insight.title}</h3>
                        <Badge
                          variant="outline"
                          className={getPriorityColor(insight.priority)}
                        >
                          {insight.priority}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {insight.category}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {insight.summary}
                      </p>
                      {insight.dataPoints && insight.dataPoints.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {insight.dataPoints.map((point, i) => (
                            <span
                              key={i}
                              className="text-xs bg-muted px-2 py-1 rounded"
                            >
                              {point}
                            </span>
                          ))}
                        </div>
                      )}
                      {insight.action && (
                        <div className="mt-3 p-3 bg-muted/50 rounded-lg">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">
                              {insight.action.title}
                            </span>
                            <Badge className={getDifficultyColor(insight.action.difficulty)}>
                              {insight.action.difficulty}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {insight.action.potentialImpact}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Data / Setup State */}
      {(!report || !report.insights || report.insights.length === 0) && !loading && (
        <Card className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white">
          <CardContent className="pt-12 pb-12 text-center">
            <div className="h-20 w-20 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center mx-auto mb-6">
              <Lightbulb className="h-10 w-10 text-white" />
            </div>
            <h3 className="text-2xl font-bold mb-2">Set Up Industry Intelligence</h3>
            <p className="text-white/80 max-w-md mx-auto mb-6">
              Select your industry type and connect your integrations to receive personalized
              insights about customer acquisition, seasonal patterns, and regional benchmarks.
            </p>
            <div className="flex items-center justify-center gap-4">
              <Button
                onClick={() => setShowSettings(true)}
                className="bg-white text-indigo-600 hover:bg-white/90"
              >
                <Target className="h-4 w-4 mr-2" />
                Configure Industry
              </Button>
              <Link href="/dashboard/chauffeur/integrations">
                <Button variant="outline" className="border-white/50 text-white hover:bg-white/10">
                  Connect Integrations
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Links */}
      <div className="grid gap-4 md:grid-cols-3">
        <Link href="/dashboard/chat">
          <Card className="hover:border-blue-300 hover:shadow-md transition-all cursor-pointer">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Users className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-medium">Chat with Business Chauffeur</h3>
                  <p className="text-sm text-muted-foreground">Ask questions about your data</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/dashboard/chauffeur/integrations">
          <Card className="hover:border-green-300 hover:shadow-md transition-all cursor-pointer">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
                  <Settings className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <h3 className="font-medium">Manage Integrations</h3>
                  <p className="text-sm text-muted-foreground">Connect POS, accounting, reviews</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/dashboard/chauffeur/unified">
          <Card className="hover:border-purple-300 hover:shadow-md transition-all cursor-pointer">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
                  <BarChart3 className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-medium">Unified Dashboard</h3>
                  <p className="text-sm text-muted-foreground">View all business metrics</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
