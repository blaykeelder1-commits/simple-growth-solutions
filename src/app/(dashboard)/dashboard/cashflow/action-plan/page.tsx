"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
import {
  Play,
  RefreshCw,
  AlertTriangle,
  TrendingUp,
  Mail,
  MessageSquare,
  Phone,
  DollarSign,
  Calendar,
  ChevronDown,
  ChevronUp,
  Check,
  Sparkles,
  Zap,
  Clock,
  ArrowLeft,
} from "lucide-react";

interface ActionPlan {
  id: string;
  status: string;
  totalInvoicesAnalyzed: number;
  totalAmountAtRisk: number;
  projectedRecovery: number;
  projectedSuccessFee: number;
  invoiceActions: InvoiceAction[];
  cashSqueezeAlerts: CashSqueezeAlert[];
  proactiveMeasures: ProactiveMeasure[];
}

interface InvoiceAction {
  invoiceId: string;
  analysis: {
    clientName: string;
    amountDue: number;
    daysOverdue: number;
    riskLevel: string;
    recoveryLikelihood: number;
    urgencyScore: number;
    recommendedActions: RecommendedAction[];
  };
  actions: ScheduledAction[];
  status: string;
}

interface RecommendedAction {
  type: string;
  priority: number;
  scheduledFor: string;
  message: string;
  reasoning: string;
}

interface ScheduledAction {
  id: string;
  type: string;
  scheduledFor: string;
  status: string;
  content: {
    subject?: string;
    body: string;
  };
  incentive?: {
    type: string;
    discountPercent?: number;
    paymentPlanMonths?: number;
  };
}

interface CashSqueezeAlert {
  type: string;
  severity: string;
  date: string;
  description: string;
  projectedShortfall: number;
  recommendations: Array<{
    action: string;
    potentialImpact: number;
  }>;
}

interface ProactiveMeasure {
  type: string;
  targetInvoices: string[];
  description: string;
  projectedImpact: number;
  status: string;
}

export default function ActionPlanPage() {
  const router = useRouter();
  const [plan, setPlan] = useState<ActionPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [approving, setApproving] = useState(false);
  const [expandedInvoices, setExpandedInvoices] = useState<Set<string>>(new Set());
  const [selectedInvoices, setSelectedInvoices] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchPendingPlan();
  }, []);

  const fetchPendingPlan = async () => {
    try {
      const res = await fetch("/api/ar-engine/analyze");
      if (res.ok) {
        const data = await res.json();
        if (data.hasPendingPlan && data.plan) {
          setPlan(data.plan);
          // Select all invoices by default
          setSelectedInvoices(new Set(data.plan.invoiceActions.map((ia: InvoiceAction) => ia.invoiceId)));
        }
      }
    } catch (error) {
      console.error("Failed to fetch plan:", error);
    } finally {
      setLoading(false);
    }
  };

  const generateNewPlan = async () => {
    setGenerating(true);
    try {
      const res = await fetch("/api/ar-engine/analyze", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setPlan(data.plan);
        setSelectedInvoices(new Set(data.plan.invoiceActions.map((ia: InvoiceAction) => ia.invoiceId)));

        // Save the plan
        await fetch("/api/ar-engine/plan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plan: data.plan }),
        });
      }
    } catch (error) {
      console.error("Failed to generate plan:", error);
    } finally {
      setGenerating(false);
    }
  };

  const approvePlan = async () => {
    if (!plan) return;
    setApproving(true);
    try {
      const res = await fetch("/api/ar-engine/plan", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId: plan.id,
          selectedInvoiceIds: Array.from(selectedInvoices),
        }),
      });

      if (res.ok) {
        router.push("/dashboard/cashflow?activated=true");
      }
    } catch (error) {
      console.error("Failed to approve plan:", error);
    } finally {
      setApproving(false);
    }
  };

  const toggleInvoice = (invoiceId: string) => {
    const newExpanded = new Set(expandedInvoices);
    if (newExpanded.has(invoiceId)) {
      newExpanded.delete(invoiceId);
    } else {
      newExpanded.add(invoiceId);
    }
    setExpandedInvoices(newExpanded);
  };

  const toggleSelectInvoice = (invoiceId: string) => {
    const newSelected = new Set(selectedInvoices);
    if (newSelected.has(invoiceId)) {
      newSelected.delete(invoiceId);
    } else {
      newSelected.add(invoiceId);
    }
    setSelectedInvoices(newSelected);
  };

  const formatCurrency = (cents: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);

  const getActionIcon = (type: string) => {
    switch (type) {
      case "email":
      case "discount_offer":
      case "payment_plan":
        return <Mail className="h-4 w-4" />;
      case "sms":
        return <MessageSquare className="h-4 w-4" />;
      case "call":
        return <Phone className="h-4 w-4" />;
      default:
        return <Zap className="h-4 w-4" />;
    }
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case "low":
        return "bg-green-100 text-green-800";
      case "medium":
        return "bg-yellow-100 text-yellow-800";
      case "high":
        return "bg-orange-100 text-orange-800";
      case "critical":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
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
              AR Action Plan
            </h1>
            <p className="text-gray-500 mt-1">
              Review and approve automated collection actions
            </p>
          </div>
        </div>
        <Button
          onClick={generateNewPlan}
          disabled={generating}
          variant="outline"
          className="bg-white"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${generating ? "animate-spin" : ""}`} />
          {generating ? "Analyzing..." : "Re-Analyze"}
        </Button>
      </div>

      {!plan ? (
        /* No plan - prompt to generate */
        <Card className="text-center py-16">
          <CardContent>
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center mx-auto mb-6">
              <Sparkles className="h-10 w-10 text-purple-500" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Ready to Work Your Invoices?
            </h2>
            <p className="text-gray-500 mb-6 max-w-md mx-auto">
              Our AI will analyze your outstanding invoices, detect cash flow risks, and create a personalized action plan to get you paid faster.
            </p>
            <Button
              onClick={generateNewPlan}
              disabled={generating}
              size="lg"
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
            >
              {generating ? (
                <>
                  <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
                  Analyzing Your Business...
                </>
              ) : (
                <>
                  <Play className="h-5 w-5 mr-2" />
                  Generate Action Plan
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-blue-600 font-medium">At Risk</p>
                    <p className="text-2xl font-bold text-blue-900">
                      {formatCurrency(plan.totalAmountAtRisk)}
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                    <AlertTriangle className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
                <p className="text-xs text-blue-600 mt-2">
                  {plan.invoiceActions.length} invoices need attention
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-green-600 font-medium">Projected Recovery</p>
                    <p className="text-2xl font-bold text-green-900">
                      {formatCurrency(plan.projectedRecovery)}
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                    <TrendingUp className="h-6 w-6 text-green-600" />
                  </div>
                </div>
                <p className="text-xs text-green-600 mt-2">
                  Based on AI predictions
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-purple-600 font-medium">Success Fee (8%)</p>
                    <p className="text-2xl font-bold text-purple-900">
                      {formatCurrency(plan.projectedSuccessFee)}
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
                    <DollarSign className="h-6 w-6 text-purple-600" />
                  </div>
                </div>
                <p className="text-xs text-purple-600 mt-2">
                  Only paid when we recover
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-orange-50 to-amber-50 border-orange-200">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-orange-600 font-medium">Cash Alerts</p>
                    <p className="text-2xl font-bold text-orange-900">
                      {plan.cashSqueezeAlerts.length}
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center">
                    <Clock className="h-6 w-6 text-orange-600" />
                  </div>
                </div>
                <p className="text-xs text-orange-600 mt-2">
                  Upcoming cash flow issues
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Cash Squeeze Alerts */}
          {plan.cashSqueezeAlerts.length > 0 && (
            <Card className="border-orange-200 bg-orange-50/50">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2 text-orange-800">
                  <AlertTriangle className="h-5 w-5" />
                  Cash Flow Alerts
                </CardTitle>
                <CardDescription>
                  Potential issues detected in the next 30 days
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {plan.cashSqueezeAlerts.map((alert, idx) => (
                    <div
                      key={idx}
                      className={`p-4 rounded-lg border ${
                        alert.severity === "critical"
                          ? "bg-red-50 border-red-200"
                          : "bg-orange-50 border-orange-200"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium text-gray-900">{alert.description}</p>
                          <p className="text-sm text-gray-500 mt-1">
                            Potential shortfall: {formatCurrency(alert.projectedShortfall)}
                          </p>
                        </div>
                        <Badge variant={alert.severity === "critical" ? "destructive" : "secondary"}>
                          {alert.severity}
                        </Badge>
                      </div>
                      {alert.recommendations.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <p className="text-sm font-medium text-gray-700 mb-2">Recommendations:</p>
                          <ul className="text-sm text-gray-600 space-y-1">
                            {alert.recommendations.map((rec, rIdx) => (
                              <li key={rIdx} className="flex items-center gap-2">
                                <Check className="h-3 w-3 text-green-500" />
                                {rec.action} (potential: {formatCurrency(rec.potentialImpact)})
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Invoice Actions */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Planned Actions</CardTitle>
                  <CardDescription>
                    Select which invoices to work ({selectedInvoices.size} of {plan.invoiceActions.length} selected)
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setSelectedInvoices(new Set(plan.invoiceActions.map((ia) => ia.invoiceId)))
                    }
                  >
                    Select All
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedInvoices(new Set())}
                  >
                    Clear All
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {plan.invoiceActions.map((invoiceAction) => (
                  <div
                    key={invoiceAction.invoiceId}
                    className={`border rounded-lg overflow-hidden transition-all ${
                      selectedInvoices.has(invoiceAction.invoiceId)
                        ? "border-blue-300 bg-blue-50/50"
                        : "border-gray-200 bg-white"
                    }`}
                  >
                    {/* Invoice Header */}
                    <div
                      className="p-4 flex items-center justify-between cursor-pointer"
                      onClick={() => toggleInvoice(invoiceAction.invoiceId)}
                    >
                      <div className="flex items-center gap-4">
                        <input
                          type="checkbox"
                          checked={selectedInvoices.has(invoiceAction.invoiceId)}
                          onChange={(e) => {
                            e.stopPropagation();
                            toggleSelectInvoice(invoiceAction.invoiceId);
                          }}
                          className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <div>
                          <p className="font-medium text-gray-900">
                            {invoiceAction.analysis.clientName}
                          </p>
                          <p className="text-sm text-gray-500">
                            {formatCurrency(invoiceAction.analysis.amountDue)} •{" "}
                            {invoiceAction.analysis.daysOverdue > 0
                              ? `${invoiceAction.analysis.daysOverdue} days overdue`
                              : "Due soon"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge className={getRiskColor(invoiceAction.analysis.riskLevel)}>
                          {invoiceAction.analysis.riskLevel} risk
                        </Badge>
                        <span className="text-sm text-gray-500">
                          {invoiceAction.actions.length} actions
                        </span>
                        {expandedInvoices.has(invoiceAction.invoiceId) ? (
                          <ChevronUp className="h-5 w-5 text-gray-400" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-gray-400" />
                        )}
                      </div>
                    </div>

                    {/* Expanded Actions */}
                    {expandedInvoices.has(invoiceAction.invoiceId) && (
                      <div className="px-4 pb-4 pt-0 border-t border-gray-100">
                        <div className="mt-3 space-y-2">
                          {invoiceAction.actions.map((action, idx) => (
                            <div
                              key={action.id || idx}
                              className="flex items-start gap-3 p-3 bg-white rounded-lg border border-gray-100"
                            >
                              <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                                {getActionIcon(action.type)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="font-medium text-gray-900 capitalize">
                                    {action.type.replace(/_/g, " ")}
                                  </p>
                                  {action.incentive && (
                                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                                      {action.incentive.discountPercent
                                        ? `${action.incentive.discountPercent}% off`
                                        : `${action.incentive.paymentPlanMonths} mo plan`}
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-sm text-gray-500 mt-1">
                                  {action.content.subject || action.content.body.slice(0, 100)}...
                                </p>
                                <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  Scheduled: {new Date(action.scheduledFor).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Approve Button */}
          <div className="flex justify-between items-center p-6 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl text-white">
            <div>
              <h3 className="text-lg font-semibold">Ready to start working your invoices?</h3>
              <p className="text-purple-100 mt-1">
                {selectedInvoices.size} invoices selected • Projected recovery: {formatCurrency(plan.projectedRecovery)}
              </p>
            </div>
            <Button
              onClick={approvePlan}
              disabled={approving || selectedInvoices.size === 0}
              size="lg"
              className="bg-white text-purple-600 hover:bg-purple-50"
            >
              {approving ? (
                <>
                  <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
                  Activating...
                </>
              ) : (
                <>
                  <Play className="h-5 w-5 mr-2" />
                  Approve & Start Automation
                </>
              )}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
