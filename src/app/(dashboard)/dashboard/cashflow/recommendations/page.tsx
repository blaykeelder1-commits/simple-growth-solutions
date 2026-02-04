"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  RefreshCw,
  ArrowLeft,
  Lightbulb,
  TrendingUp,
  AlertTriangle,
  DollarSign,
  Users,
  ChevronDown,
  ChevronUp,
  Info,
  CheckCircle2,
} from "lucide-react";

interface Recommendation {
  type: "collection_strategy" | "payment_terms" | "client_risk" | "cash_flow";
  title: string;
  description: string;
  priority: "low" | "medium" | "high" | "critical";
  actions: string[];
  reasoning: string;
  confidence: number;
  disclaimer: string;
  confidenceLevel: "high" | "medium" | "low";
  isEducational: boolean;
}

interface ClientRecommendations {
  clientId: string;
  clientName: string;
  recommendations: Recommendation[];
}

interface RecommendationsResponse {
  success: boolean;
  recommendations: ClientRecommendations[];
  totalClients: number;
  totalRecommendations: number;
}

export default function RecommendationsPage() {
  const [data, setData] = useState<RecommendationsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedClients, setExpandedClients] = useState<Set<string>>(new Set());
  const [expandedRecs, setExpandedRecs] = useState<Set<string>>(new Set());

  const fetchRecommendations = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const res = await fetch("/api/cashflow/recommendations");
      if (res.ok) {
        const data = await res.json();
        setData(data);
        // Expand first client by default
        if (data.recommendations.length > 0 && expandedClients.size === 0) {
          setExpandedClients(new Set([data.recommendations[0].clientId]));
        }
      }
    } catch (error) {
      console.error("Failed to fetch recommendations:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchRecommendations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleClient = (clientId: string) => {
    const newExpanded = new Set(expandedClients);
    if (newExpanded.has(clientId)) {
      newExpanded.delete(clientId);
    } else {
      newExpanded.add(clientId);
    }
    setExpandedClients(newExpanded);
  };

  const toggleRec = (recKey: string) => {
    const newExpanded = new Set(expandedRecs);
    if (newExpanded.has(recKey)) {
      newExpanded.delete(recKey);
    } else {
      newExpanded.add(recKey);
    }
    setExpandedRecs(newExpanded);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "critical":
        return "bg-red-100 text-red-800 border-red-200";
      case "high":
        return "bg-orange-100 text-orange-800 border-orange-200";
      case "medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      default:
        return "bg-green-100 text-green-800 border-green-200";
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "collection_strategy":
        return <TrendingUp className="h-4 w-4" />;
      case "payment_terms":
        return <DollarSign className="h-4 w-4" />;
      case "client_risk":
        return <AlertTriangle className="h-4 w-4" />;
      case "cash_flow":
        return <Lightbulb className="h-4 w-4" />;
      default:
        return <Sparkles className="h-4 w-4" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "collection_strategy":
        return "Collection Strategy";
      case "payment_terms":
        return "Payment Terms";
      case "client_risk":
        return "Client Risk";
      case "cash_flow":
        return "Cash Flow";
      default:
        return "Insight";
    }
  };

  const getConfidenceColor = (level: string) => {
    switch (level) {
      case "high":
        return "text-green-600";
      case "medium":
        return "text-yellow-600";
      default:
        return "text-gray-500";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto" />
          <p className="text-gray-500 mt-4">Analyzing your business data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/cashflow">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-purple-500" />
              AI Recommendations
            </h1>
            <p className="text-gray-500 mt-1">
              Educational insights to help improve your cash flow
            </p>
          </div>
        </div>
        <Button
          onClick={() => fetchRecommendations(true)}
          disabled={refreshing}
          variant="outline"
          className="bg-white"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
          {refreshing ? "Analyzing..." : "Refresh"}
        </Button>
      </div>

      {/* Disclaimer Banner */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-blue-800">
                <strong>Educational Insights:</strong> These recommendations are AI-generated
                observations based on your data patterns. They are intended as educational
                possibilities to consider, not financial or legal advice. Always consult with
                qualified professionals before making business decisions.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      {data && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-purple-600 font-medium">Clients Analyzed</p>
                  <p className="text-2xl font-bold text-purple-900">{data.totalClients}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
                  <Users className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-amber-50 border-orange-200">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-orange-600 font-medium">Total Insights</p>
                  <p className="text-2xl font-bold text-orange-900">{data.totalRecommendations}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center">
                  <Lightbulb className="h-6 w-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-600 font-medium">High Priority</p>
                  <p className="text-2xl font-bold text-green-900">
                    {data.recommendations.reduce(
                      (sum, r) =>
                        sum + r.recommendations.filter((rec) => rec.priority === "high" || rec.priority === "critical").length,
                      0
                    )}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                  <AlertTriangle className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Recommendations List */}
      {!data || data.recommendations.length === 0 ? (
        <Card className="text-center py-16">
          <CardContent>
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center mx-auto mb-6">
              <Sparkles className="h-10 w-10 text-purple-500" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              No Recommendations Yet
            </h2>
            <p className="text-gray-500 mb-6 max-w-md mx-auto">
              Add clients and create invoices to get AI-powered insights about your cash flow.
              Our system will analyze payment patterns and provide educational suggestions.
            </p>
            <Link href="/dashboard/cashflow/clients">
              <Button className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700">
                <Users className="h-4 w-4 mr-2" />
                Add Your First Client
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {data.recommendations.map((clientRec) => (
            <Card key={clientRec.clientId} className="overflow-hidden">
              {/* Client Header */}
              <div
                className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => toggleClient(clientRec.clientId)}
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-semibold">
                    {clientRec.clientName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{clientRec.clientName}</h3>
                    <p className="text-sm text-gray-500">
                      {clientRec.recommendations.length} insight{clientRec.recommendations.length !== 1 ? "s" : ""} available
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex gap-1">
                    {clientRec.recommendations.slice(0, 3).map((rec, idx) => (
                      <Badge key={idx} className={`${getPriorityColor(rec.priority)} text-xs`}>
                        {rec.priority}
                      </Badge>
                    ))}
                  </div>
                  {expandedClients.has(clientRec.clientId) ? (
                    <ChevronUp className="h-5 w-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-gray-400" />
                  )}
                </div>
              </div>

              {/* Expanded Recommendations */}
              {expandedClients.has(clientRec.clientId) && (
                <div className="border-t border-gray-100 p-4 bg-gray-50/50 space-y-3">
                  {clientRec.recommendations.map((rec, recIdx) => {
                    const recKey = `${clientRec.clientId}-${recIdx}`;
                    const isExpanded = expandedRecs.has(recKey);

                    return (
                      <div
                        key={recIdx}
                        className="bg-white rounded-lg border border-gray-200 overflow-hidden"
                      >
                        <div
                          className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                          onClick={() => toggleRec(recKey)}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-3">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                                rec.priority === "critical" ? "bg-red-100 text-red-600" :
                                rec.priority === "high" ? "bg-orange-100 text-orange-600" :
                                rec.priority === "medium" ? "bg-yellow-100 text-yellow-600" :
                                "bg-green-100 text-green-600"
                              }`}>
                                {getTypeIcon(rec.type)}
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <Badge variant="outline" className="text-xs">
                                    {getTypeLabel(rec.type)}
                                  </Badge>
                                  <Badge className={`${getPriorityColor(rec.priority)} text-xs`}>
                                    {rec.priority}
                                  </Badge>
                                </div>
                                <h4 className="font-medium text-gray-900">{rec.title}</h4>
                                <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                                  {rec.description}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`text-xs font-medium ${getConfidenceColor(rec.confidenceLevel)}`}>
                                {Math.round(rec.confidence * 100)}% confidence
                              </span>
                              {isExpanded ? (
                                <ChevronUp className="h-4 w-4 text-gray-400" />
                              ) : (
                                <ChevronDown className="h-4 w-4 text-gray-400" />
                              )}
                            </div>
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="border-t border-gray-100 p-4 bg-gray-50/50">
                            {/* Reasoning */}
                            <div className="mb-4">
                              <h5 className="text-sm font-medium text-gray-700 mb-2">Why this insight?</h5>
                              <p className="text-sm text-gray-600">{rec.reasoning}</p>
                            </div>

                            {/* Suggested Actions */}
                            {rec.actions.length > 0 && (
                              <div className="mb-4">
                                <h5 className="text-sm font-medium text-gray-700 mb-2">Possible actions to consider:</h5>
                                <ul className="space-y-2">
                                  {rec.actions.map((action, actionIdx) => (
                                    <li key={actionIdx} className="flex items-start gap-2 text-sm text-gray-600">
                                      <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                                      {action}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {/* Disclaimer */}
                            <div className="pt-3 border-t border-gray-200">
                              <p className="text-xs text-gray-500 italic">
                                {rec.disclaimer}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Action CTA */}
      {data && data.recommendations.length > 0 && (
        <Card className="bg-gradient-to-r from-purple-600 to-pink-600 border-0 text-white">
          <CardContent className="py-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Ready to take action?</h3>
                <p className="text-purple-100 mt-1">
                  Let our AI automation work your invoices based on these insights
                </p>
              </div>
              <Link href="/dashboard/cashflow/action-plan">
                <Button
                  size="lg"
                  className="bg-white text-purple-600 hover:bg-purple-50"
                >
                  <Sparkles className="h-5 w-5 mr-2" />
                  Create Action Plan
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
