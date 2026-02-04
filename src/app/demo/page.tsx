"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  GuidedTour,
  SessionTimer,
  DemoBanner,
  DemoExpiredModal,
} from "@/components/demo/guided-tour";
import { ROICalculator } from "@/components/dashboard/roi-calculator";
import {
  InsightCard,
} from "@/components/ui/insight-card";
import {
  DEMO_ORG_NAME,
  getDemoSession,
  getDemoRestrictionMessage,
} from "@/lib/demo/demo-mode";

// Sample data for demo display (not from API to avoid DB dependency)
const DEMO_DATA = {
  stats: {
    totalReceivables: 4875000, // $48,750 in cents
    overdueReceivables: 1245000, // $12,450
    collectedThisMonth: 3250000, // $32,500
    projectedInflow30d: 3800000, // $38,000
    healthScore: 78,
    overdueInvoices: 8,
    totalClients: 50,
    pendingRecommendations: 5,
  },
  topClients: [
    { name: "City Events Co.", score: 95, outstanding: 125000, tier: "A" },
    { name: "Metropolitan Hotels", score: 88, outstanding: 285000, tier: "A" },
    { name: "Construction Co. Inc", score: 52, outstanding: 450000, tier: "C" },
    { name: "Seasonal Rentals LLC", score: 35, outstanding: 180000, tier: "D" },
  ],
  recommendations: [
    {
      title: "Consider following up on Invoice INV-202501-0042",
      description: "This invoice for Construction Co. Inc is 45 days overdue. Based on their payment history, you could consider a phone call follow-up.",
      priority: "high" as const,
      confidence: 0.82,
    },
    {
      title: "Consider early payment incentive for Seasonal Rentals",
      description: "This client typically pays late but has a strong relationship. You might consider offering a 2% discount for early payment.",
      priority: "medium" as const,
      confidence: 0.75,
    },
  ],
};

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export default function DemoPage() {
  const router = useRouter();
  const [sessionStartTime] = useState(() => new Date());
  const [showTour, setShowTour] = useState(true);
  const [isExpired, setIsExpired] = useState(false);
  const [activeTab, setActiveTab] = useState<"dashboard" | "roi" | "insights">("dashboard");

  const handleTourComplete = useCallback(() => {
    setShowTour(false);
  }, []);

  const handleTourSkip = useCallback(() => {
    setShowTour(false);
  }, []);

  const handleSessionExpire = useCallback(() => {
    setIsExpired(true);
  }, []);

  const handleSignUp = useCallback(() => {
    router.push("/signup?ref=demo");
  }, [router]);

  const handleRestartDemo = useCallback(() => {
    window.location.reload();
  }, []);

  // Check session status on mount
  useEffect(() => {
    const session = getDemoSession(sessionStartTime);
    if (session.isExpired) {
      setIsExpired(true);
    }
  }, [sessionStartTime]);

  const { stats } = DEMO_DATA;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Demo banner */}
      <DemoBanner onSignUp={handleSignUp} />

      {/* Header */}
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/" className="flex items-center gap-2">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
                  <span className="text-white font-bold text-lg">BC</span>
                </div>
                <span className="font-bold text-xl text-gray-900">
                  Business Chauffeur
                </span>
              </Link>
              <Badge variant="secondary">{DEMO_ORG_NAME}</Badge>
            </div>

            <div className="flex items-center gap-4">
              <SessionTimer
                sessionStartTime={sessionStartTime}
                onExpire={handleSessionExpire}
              />
              <Button
                onClick={handleSignUp}
                className="bg-gradient-to-r from-blue-600 to-indigo-600"
              >
                Start Free Trial
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation tabs */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4">
          <nav className="flex gap-6">
            {[
              { id: "dashboard", label: "Dashboard" },
              { id: "roi", label: "ROI Calculator" },
              { id: "insights", label: "AI Insights" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`py-4 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {activeTab === "dashboard" && (
          <div className="space-y-8">
            {/* Header */}
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Cash Flow Dashboard</h1>
              <p className="text-gray-500 mt-1">
                Sample data for {DEMO_ORG_NAME} - {getDemoRestrictionMessage()}
              </p>
            </div>

            {/* Health Score Banner */}
            <Card
              data-tour="health-score"
              className="bg-gradient-to-br from-emerald-400 to-green-600 text-white overflow-hidden"
            >
              <CardContent className="py-8">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-6">
                    <div className="w-24 h-24 rounded-full bg-white/20 flex items-center justify-center">
                      <span className="text-4xl font-bold">{stats.healthScore}</span>
                    </div>
                    <div>
                      <p className="text-white/80 text-sm uppercase tracking-wider">
                        Cash Flow Health Score
                      </p>
                      <p className="text-2xl font-bold mt-1">Good</p>
                      <p className="text-white/70 text-sm mt-1">
                        Based on payment patterns and outstanding invoices
                      </p>
                    </div>
                  </div>
                  <div className="text-right bg-white/10 rounded-2xl p-5">
                    <p className="text-white/80 text-sm">30-Day Projected Inflow</p>
                    <p className="text-3xl font-bold mt-1">
                      {formatCurrency(stats.projectedInflow30d)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Stats grid */}
            <div data-tour="stats-grid" className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
              <Card className="bg-white">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500">
                    Total Receivables
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-900">
                    {formatCurrency(stats.totalReceivables)}
                  </div>
                  <p className="text-sm text-gray-500">Outstanding invoices</p>
                </CardContent>
              </Card>

              <Card className="bg-white">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500">
                    Overdue Amount
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-600">
                    {formatCurrency(stats.overdueReceivables)}
                  </div>
                  <p className="text-sm text-gray-500">
                    {stats.overdueInvoices} overdue invoices
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-white">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500">
                    Collected This Month
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-emerald-600">
                    {formatCurrency(stats.collectedThisMonth)}
                  </div>
                  <p className="text-sm text-gray-500">Payments received</p>
                </CardContent>
              </Card>

              <Card className="bg-white">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500">
                    AI Recommendations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-900">
                    {stats.pendingRecommendations}
                  </div>
                  <p className="text-sm text-gray-500">Pending actions</p>
                </CardContent>
              </Card>
            </div>

            {/* Client list */}
            <Card data-tour="client-list" className="bg-white">
              <CardHeader>
                <CardTitle>Top Clients by Outstanding</CardTitle>
                <CardDescription>Client payment scores and balances</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {DEMO_DATA.topClients.map((client, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${
                            client.tier === "A"
                              ? "bg-green-500"
                              : client.tier === "B"
                              ? "bg-blue-500"
                              : client.tier === "C"
                              ? "bg-yellow-500"
                              : "bg-red-500"
                          }`}
                        >
                          {client.tier}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{client.name}</p>
                          <p className="text-sm text-gray-500">
                            Payment Score: {client.score}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-gray-900">
                          {formatCurrency(client.outstanding)}
                        </p>
                        <p className="text-sm text-gray-500">Outstanding</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === "roi" && (
          <div data-tour="roi">
            <ROICalculator />
          </div>
        )}

        {activeTab === "insights" && (
          <div data-tour="ai-insights" className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">AI Insights</h1>
              <p className="text-gray-500 mt-1">
                Educational suggestions based on your data patterns
              </p>
            </div>

            {DEMO_DATA.recommendations.map((rec, index) => (
              <InsightCard
                key={index}
                title={rec.title}
                description={rec.description}
                type="recommendation"
                confidence={rec.confidence}
                priority={rec.priority}
                actions={[
                  "Consider reviewing the client's payment history",
                  "You could schedule a follow-up call",
                  "Optionally update your collection strategy",
                ]}
                disclaimerType="recommendation"
                disclaimerLength="medium"
                showTermsLink={true}
              />
            ))}

            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                    <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-blue-900">
                      Want personalized insights?
                    </h3>
                    <p className="text-blue-700 text-sm mt-1">
                      Connect your real business data to get AI insights tailored to your specific situation.
                    </p>
                    <Button
                      onClick={handleSignUp}
                      className="mt-4 bg-blue-600 hover:bg-blue-700"
                    >
                      Start Free Trial
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>

      {/* Guided tour */}
      {showTour && (
        <GuidedTour
          sessionStartTime={sessionStartTime}
          onComplete={handleTourComplete}
          onSkip={handleTourSkip}
        />
      )}

      {/* Expired modal */}
      {isExpired && (
        <DemoExpiredModal
          onSignUp={handleSignUp}
          onRestart={handleRestartDemo}
        />
      )}
    </div>
  );
}
