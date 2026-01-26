"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DisclaimerFooter } from "@/components/ui/insight-card";
import {
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Zap,
  DollarSign,
  Users,
  Star,
  Activity,
  ArrowRight,
  RefreshCw,
  Settings,
} from "lucide-react";

// Sample unified data for demonstration
const SAMPLE_UNIFIED_DATA = {
  healthAssessment: {
    overallScore: 74,
    scoreBreakdown: [
      {
        category: "Cash Flow",
        score: 78,
        weight: 0.3,
        insight: "Cash flow appears healthy",
      },
      {
        category: "Customer Satisfaction",
        score: 88,
        weight: 0.25,
        insight: "Customer feedback appears positive",
      },
      {
        category: "Operations",
        score: 65,
        weight: 0.25,
        insight: "There could be opportunities to improve operational efficiency",
      },
      {
        category: "Growth",
        score: 62,
        weight: 0.2,
        insight: "Growth could benefit from strategic focus",
      },
    ],
    summary:
      "Your business shows solid fundamentals with some areas that could benefit from attention. The insights below highlight potential opportunities.",
    topPriorities: [
      "Consider reviewing operations - There could be opportunities to improve operational efficiency",
      "Consider exploring growth opportunities when strategically appropriate",
    ],
  },
  crossSystemInsights: [
    {
      id: "unified-1",
      category: "opportunity" as const,
      title: "Sales Growth Could Support Profit Sharing",
      description:
        "Your sales appear to have grown approximately 18% while payroll has remained relatively flat at 32% of revenue. This positive margin trend could indicate an opportunity to explore employee incentive programs or strategic reinvestment.",
      impact: "medium" as const,
      actionItems: [
        "You could consider reviewing current profit margins",
        "Optionally explore performance-based bonus structures",
        "Consider consulting with a financial advisor about reinvestment timing",
      ],
      dataSources: ["Square POS", "Gusto Payroll"],
      confidence: 0.72,
      timeframe: "short_term" as const,
    },
    {
      id: "unified-2",
      category: "health" as const,
      title: "Positive Customer-Sales Correlation Observed",
      description:
        "Your 4.6-star average rating correlates with 15% sales growth this quarter. This suggests customer satisfaction could be driving business growth. Maintaining current service quality practices might help sustain this momentum.",
      impact: "low" as const,
      actionItems: [
        "Consider documenting what's working well",
        "You could encourage satisfied customers to leave reviews",
        "Optionally create recognition programs for staff contributing to positive experiences",
      ],
      dataSources: ["Google Reviews", "Square POS"],
      confidence: 0.68,
      timeframe: "long_term" as const,
    },
    {
      id: "unified-3",
      category: "efficiency" as const,
      title: "Overtime Patterns Worth Reviewing",
      description:
        "Your team logged approximately 52 overtime hours this period, correlating with peak sales days. Analyzing whether additional hiring could be more cost-effective than overtime premium pay might be worthwhile.",
      impact: "medium" as const,
      actionItems: [
        "Consider tracking which shifts generate the most overtime",
        "You could analyze revenue per labor hour by day of week",
        "Optionally consult with HR about part-time staffing options",
      ],
      dataSources: ["Gusto Payroll", "Square POS"],
      confidence: 0.65,
      timeframe: "short_term" as const,
    },
    {
      id: "unified-4",
      category: "risk" as const,
      title: "Cash Flow Timing Observation",
      description:
        "Cash flow dips appear to align with your bi-weekly payroll cycle. Adjusting invoice due dates or exploring a line of credit could help smooth these variations.",
      impact: "high" as const,
      actionItems: [
        "Consider reviewing payment collection timing",
        "You could explore adjusting invoice due dates to precede payroll",
        "Optionally discuss cash flow timing with a financial advisor",
      ],
      dataSources: ["QuickBooks", "Gusto Payroll"],
      confidence: 0.75,
      timeframe: "immediate" as const,
    },
  ],
  integrationStatus: {
    connected: 4,
    total: 8,
    percentage: 50,
    label: "Well connected",
    connectedServices: ["QuickBooks", "Square", "Google Business", "Gusto"],
    availableServices: ["Xero", "Clover", "Toast", "Yelp"],
  },
};

const categoryConfig: Record<
  string,
  { icon: React.ElementType; color: string; bgColor: string }
> = {
  growth: {
    icon: TrendingUp,
    color: "text-emerald-600",
    bgColor: "bg-emerald-100",
  },
  efficiency: {
    icon: Activity,
    color: "text-blue-600",
    bgColor: "bg-blue-100",
  },
  risk: {
    icon: AlertTriangle,
    color: "text-red-600",
    bgColor: "bg-red-100",
  },
  opportunity: {
    icon: Zap,
    color: "text-purple-600",
    bgColor: "bg-purple-100",
  },
  health: {
    icon: Star,
    color: "text-amber-600",
    bgColor: "bg-amber-100",
  },
};

const impactConfig: Record<string, { label: string; color: string }> = {
  high: { label: "High Impact", color: "bg-red-100 text-red-700 border-red-200" },
  medium: { label: "Medium Impact", color: "bg-amber-100 text-amber-700 border-amber-200" },
  low: { label: "Low Impact", color: "bg-blue-100 text-blue-700 border-blue-200" },
};

function getScoreColor(score: number): string {
  if (score >= 80) return "text-emerald-600";
  if (score >= 60) return "text-amber-600";
  return "text-red-600";
}

function getScoreLabel(score: number): string {
  if (score >= 80) return "Excellent";
  if (score >= 70) return "Good";
  if (score >= 60) return "Fair";
  return "Needs Attention";
}

export default function UnifiedInsightsPage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const { healthAssessment, crossSystemInsights, integrationStatus } =
    SAMPLE_UNIFIED_DATA;

  useEffect(() => {
    // Simulate loading
    const timer = setTimeout(() => setLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    // In production, this would trigger a new AI analysis
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setRefreshing(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-500">Analyzing your business data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Unified Business Intelligence
          </h1>
          <p className="text-gray-500 mt-1">
            Your AI-powered business sidekick - insights from all your connected systems
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`}
            />
            {refreshing ? "Analyzing..." : "Refresh Analysis"}
          </Button>
          <Link href="/dashboard/chauffeur/integrations">
            <Button className="bg-gradient-to-r from-blue-600 to-indigo-600">
              <Settings className="h-4 w-4 mr-2" />
              Manage Integrations
            </Button>
          </Link>
        </div>
      </div>

      {/* Integration Status Banner */}
      <Card className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white overflow-hidden relative">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=%2260%22 height=%2260%22 viewBox=%220 0 60 60%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cg fill=%22none%22 fill-rule=%22evenodd%22%3E%3Cg fill=%22%23ffffff%22 fill-opacity=%220.1%22%3E%3Cpath d=%22M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-30" />
        <CardContent className="py-6 relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="h-16 w-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <Zap className="h-8 w-8 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-semibold">
                  {integrationStatus.label}
                </h3>
                <p className="text-white/80">
                  {integrationStatus.connected} of {integrationStatus.total}{" "}
                  integrations connected
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm text-white/70">Connected</p>
                <p className="font-medium">
                  {integrationStatus.connectedServices.join(", ")}
                </p>
              </div>
              <div className="h-12 w-px bg-white/20" />
              <div className="text-right">
                <p className="text-sm text-white/70">Available</p>
                <p className="font-medium text-white/60">
                  +{integrationStatus.availableServices.length} more
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Health Assessment */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Overall Score */}
        <Card className="lg:row-span-2">
          <CardHeader>
            <CardTitle>Business Health Score</CardTitle>
            <CardDescription>
              Holistic assessment across all connected systems
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center mb-6">
              <div
                className={`text-6xl font-bold ${getScoreColor(healthAssessment.overallScore)}`}
              >
                {healthAssessment.overallScore}
              </div>
              <p className="text-gray-500 mt-1">
                {getScoreLabel(healthAssessment.overallScore)}
              </p>
            </div>

            <div className="space-y-4">
              {healthAssessment.scoreBreakdown.map((item, index) => (
                <div key={index}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium text-gray-700">
                      {item.category}
                    </span>
                    <span className={`text-sm font-bold ${getScoreColor(item.score)}`}>
                      {item.score}
                    </span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        item.score >= 80
                          ? "bg-emerald-500"
                          : item.score >= 60
                            ? "bg-amber-500"
                            : "bg-red-500"
                      }`}
                      style={{ width: `${item.score}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{item.insight}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Summary */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-blue-600" />
              Executive Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700 mb-4">{healthAssessment.summary}</p>
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-500">
                Top Priorities:
              </p>
              {healthAssessment.topPriorities.map((priority, index) => (
                <div
                  key={index}
                  className="flex items-start gap-2 p-3 bg-amber-50 rounded-lg border border-amber-100"
                >
                  <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-amber-800">{priority}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Data Sources Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-emerald-50 rounded-lg">
                <DollarSign className="h-6 w-6 text-emerald-600 mx-auto mb-2" />
                <p className="text-sm text-gray-500">Cash Flow</p>
                <p className="font-semibold text-gray-900">QuickBooks</p>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <TrendingUp className="h-6 w-6 text-blue-600 mx-auto mb-2" />
                <p className="text-sm text-gray-500">Sales</p>
                <p className="font-semibold text-gray-900">Square</p>
              </div>
              <div className="text-center p-4 bg-amber-50 rounded-lg">
                <Star className="h-6 w-6 text-amber-600 mx-auto mb-2" />
                <p className="text-sm text-gray-500">Reviews</p>
                <p className="font-semibold text-gray-900">Google</p>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <Users className="h-6 w-6 text-purple-600 mx-auto mb-2" />
                <p className="text-sm text-gray-500">Payroll</p>
                <p className="font-semibold text-gray-900">Gusto</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cross-System Insights */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              Cross-System Insights
            </h2>
            <p className="text-gray-500 text-sm">
              AI-powered correlations across your connected data sources
            </p>
          </div>
          <Badge className="bg-gradient-to-r from-purple-600 to-pink-600 text-white border-0">
            <Zap className="h-3 w-3 mr-1" />
            AI-Powered
          </Badge>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {crossSystemInsights.map((insight) => {
            const category = categoryConfig[insight.category] || categoryConfig.opportunity;
            const impact = impactConfig[insight.impact] || impactConfig.medium;
            const CategoryIcon = category.icon;

            return (
              <Card key={insight.id} hover="lift">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div
                        className={`h-10 w-10 rounded-xl ${category.bgColor} flex items-center justify-center flex-shrink-0`}
                      >
                        <CategoryIcon className={`h-5 w-5 ${category.color}`} />
                      </div>
                      <div>
                        <CardTitle className="text-base">{insight.title}</CardTitle>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          <Badge className={`${impact.color} border text-xs`}>
                            {impact.label}
                          </Badge>
                          <span className="text-xs text-gray-400">
                            {Math.round(insight.confidence * 100)}% confidence
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 mb-4">
                    {insight.description}
                  </p>

                  <div className="space-y-2 mb-4">
                    <p className="text-xs font-medium text-gray-500">
                      Possible Actions:
                    </p>
                    {insight.actionItems.slice(0, 2).map((action, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-2 text-xs text-gray-600"
                      >
                        <CheckCircle2 className="h-3 w-3 text-gray-400 mt-0.5 flex-shrink-0" />
                        <span>{action}</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                    <div className="flex flex-wrap gap-1">
                      {insight.dataSources.map((source, idx) => (
                        <Badge
                          key={idx}
                          variant="outline"
                          className="text-xs bg-gray-50"
                        >
                          {source}
                        </Badge>
                      ))}
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {insight.timeframe === "immediate"
                        ? "Act Now"
                        : insight.timeframe === "short_term"
                          ? "This Month"
                          : "Long Term"}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Call to Action for More Integrations */}
      {integrationStatus.connected < integrationStatus.total && (
        <Card className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white overflow-hidden relative">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=%2260%22 height=%2260%22 viewBox=%220 0 60 60%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cg fill=%22none%22 fill-rule=%22evenodd%22%3E%3Cg fill=%22%23ffffff%22 fill-opacity=%220.1%22%3E%3Cpath d=%22M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-30" />
          <CardContent className="py-8 relative">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div>
                <h3 className="text-xl font-semibold mb-2">
                  Unlock More Insights
                </h3>
                <p className="text-white/80 max-w-md">
                  Connect more business tools to get even richer cross-system
                  correlations and AI-powered recommendations.
                </p>
              </div>
              <Link href="/dashboard/chauffeur/integrations">
                <Button className="bg-white text-indigo-600 hover:bg-white/90 shadow-lg whitespace-nowrap">
                  Add More Integrations
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Disclaimer Footer */}
      <DisclaimerFooter
        type="general"
        length="full"
        showTermsLink={true}
      />
    </div>
  );
}
