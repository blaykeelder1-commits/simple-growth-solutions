"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  InsightCard,
  ConfidenceBadge,
  DisclaimerFooter,
} from "@/components/ui/insight-card";

interface ROIMetrics {
  summary: {
    timeSavedHours: number;
    moneyRecovered: number;
    cashFlowDaysImproved: number;
    decisionsInformed: number;
    subscriptionCost: number;
  };
  projections: {
    monthly: {
      projectedSavings: number;
      confidenceLevel: string;
      disclaimer: string;
      breakdown: { category: string; amount: number; description: string }[];
    };
    annual: {
      projectedSavings: number;
      confidenceLevel: string;
      breakdown: { category: string; amount: number; description: string }[];
    };
    roi: {
      multiplier: number;
      isPositive: boolean;
      displayText: string;
      disclaimer: string;
    };
  };
  comparisons: {
    totalAlternativeCost: { low: number; high: number };
    savingsVsAlternatives: { low: number; high: number };
    comparison: { service: string; cost: { low: number; high: number }; description: string }[];
    disclaimer: string;
  };
  valueProposition: {
    headline: string;
    subheadline: string;
    bulletPoints: string[];
    disclaimer: string;
  };
  benchmarks: {
    comparisons: {
      metric: string;
      yourValue: number;
      industryAverage: number;
      percentile: number;
      trend: string;
      insight: string;
      confidence: number;
    }[];
    healthComparison: {
      yourScore: number;
      industryAverage: number;
      percentile: number;
      ranking: string;
      recommendations: string[];
    };
    overallInsight: string;
    currentIndustry: string;
  };
  meta: {
    calculatedAt: string;
    dataPoints: {
      invoices: number;
      clients: number;
      payments: number;
      recoveryEvents: number;
    };
    disclaimer: string;
    isDefault?: boolean;
  };
}

function formatCurrency(cents: number): string {
  return `$${(cents / 100).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

function SummaryCard({
  title,
  value,
  subtitle,
  icon,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ReactNode;
}) {
  return (
    <Card variant="professional" className="relative overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">{title}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
            <p className="text-xs text-gray-400 mt-1">{subtitle}</p>
          </div>
          <div className="text-blue-500">{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function BenchmarkBar({
  metric,
  yourValue,
  industryAverage,
  percentile,
  trend,
  isPercentage = false,
}: {
  metric: string;
  yourValue: number;
  industryAverage: number;
  percentile: number;
  trend: string;
  isPercentage?: boolean;
}) {
  const formatValue = (v: number) =>
    isPercentage ? `${(v * 100).toFixed(1)}%` : v.toFixed(1);

  const trendColor =
    trend === "better"
      ? "text-green-600"
      : trend === "worse"
        ? "text-orange-600"
        : "text-gray-600";

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-sm font-medium text-gray-700">{metric}</span>
        <Badge
          variant={
            trend === "better"
              ? "default"
              : trend === "worse"
                ? "destructive"
                : "secondary"
          }
          className="text-xs"
        >
          {percentile}th percentile
        </Badge>
      </div>
      <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`absolute h-full rounded-full ${
            trend === "better"
              ? "bg-green-500"
              : trend === "worse"
                ? "bg-orange-500"
                : "bg-blue-500"
          }`}
          style={{ width: `${percentile}%` }}
        />
      </div>
      <div className="flex justify-between text-xs text-gray-500">
        <span>
          Yours: <span className={trendColor}>{formatValue(yourValue)}</span>
        </span>
        <span>Industry Avg: {formatValue(industryAverage)}</span>
      </div>
    </div>
  );
}

export function ROICalculator() {
  const [metrics, setMetrics] = useState<ROIMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchMetrics() {
      try {
        const response = await fetch("/api/metrics/roi");
        const data = await response.json();

        if (data.success) {
          setMetrics(data.metrics);
        } else {
          setError(data.message || "Failed to load ROI metrics");
        }
      } catch {
        setError("Failed to connect to server");
      } finally {
        setLoading(false);
      }
    }

    fetchMetrics();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-32 bg-gray-200 rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-gray-200 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !metrics) {
    return (
      <Card variant="professional" className="p-6">
        <p className="text-red-600">
          {error || "Unable to load ROI metrics"}
        </p>
      </Card>
    );
  }

  const { summary, projections, comparisons, benchmarks, meta } = metrics;

  return (
    <div className="space-y-8">
      {/* Hero ROI Section */}
      <Card
        variant="gradient"
        className="relative overflow-hidden"
      >
        <CardContent className="p-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <Badge className="bg-white/20 text-white mb-4">
                Your ROI Calculator
              </Badge>
              <h2 className="text-3xl font-bold text-white mb-2">
                {projections.roi.isPositive
                  ? `${projections.roi.multiplier.toFixed(1)}x Potential Return`
                  : "Building Value"}
              </h2>
              <p className="text-white/80 max-w-md">
                {projections.roi.displayText}
              </p>
            </div>
            <div className="text-center md:text-right">
              <p className="text-white/60 text-sm">Projected Annual Savings</p>
              <p className="text-4xl font-bold text-white">
                {formatCurrency(projections.annual.projectedSavings)}
              </p>
              <p className="text-white/60 text-sm mt-1">
                vs {formatCurrency(summary.subscriptionCost * 12)}/year
                subscription
              </p>
            </div>
          </div>
        </CardContent>
        <CardFooter className="bg-white/10 px-8 py-3">
          <p className="text-white/70 text-xs italic">
            {projections.roi.disclaimer}
          </p>
        </CardFooter>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          title="Time Saved"
          value={`${summary.timeSavedHours} hrs/mo`}
          subtitle="Could save on manual analysis"
          icon={
            <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <SummaryCard
          title="Money Recovered"
          value={formatCurrency(summary.moneyRecovered)}
          subtitle="Via AI-assisted follow-ups"
          icon={
            <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <SummaryCard
          title="Cash Flow Improved"
          value={`${summary.cashFlowDaysImproved} days`}
          subtitle="Faster payment collection"
          icon={
            <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          }
        />
        <SummaryCard
          title="Decisions Informed"
          value={summary.decisionsInformed.toString()}
          subtitle="Insights viewed & acted upon"
          icon={
            <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          }
        />
      </div>

      {/* Savings Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card variant="professional">
          <CardHeader>
            <CardTitle className="text-lg">Monthly Savings Breakdown</CardTitle>
            <CardDescription>
              Potential value from platform usage
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {projections.monthly.breakdown.map((item, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div>
                  <p className="font-medium text-gray-900">{item.category}</p>
                  <p className="text-sm text-gray-500">{item.description}</p>
                </div>
                <p className="text-lg font-bold text-green-600">
                  {formatCurrency(item.amount)}
                </p>
              </div>
            ))}
            <div className="border-t pt-4 flex justify-between items-center">
              <div>
                <p className="font-bold text-gray-900">Total Monthly Value</p>
                <ConfidenceBadge
                  score={
                    projections.monthly.confidenceLevel === "high"
                      ? 0.85
                      : projections.monthly.confidenceLevel === "medium"
                        ? 0.6
                        : 0.4
                  }
                />
              </div>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(projections.monthly.projectedSavings)}
              </p>
            </div>
          </CardContent>
          <CardFooter>
            <DisclaimerFooter type="roi" length="short" showTermsLink={false} />
          </CardFooter>
        </Card>

        <Card variant="professional">
          <CardHeader>
            <CardTitle className="text-lg">Alternative Cost Comparison</CardTitle>
            <CardDescription>
              What similar services could cost separately
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {comparisons.comparison.map((item, index) => (
              <div
                key={index}
                className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
              >
                <div>
                  <p className="font-medium text-gray-900">{item.service}</p>
                  <p className="text-xs text-gray-500">{item.description}</p>
                </div>
                <p className="text-sm text-gray-600">
                  {formatCurrency(item.cost.low)} - {formatCurrency(item.cost.high)}/mo
                </p>
              </div>
            ))}
            <div className="bg-blue-50 p-4 rounded-lg mt-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-blue-600">
                    Potential Savings vs Alternatives
                  </p>
                  <p className="text-xs text-blue-500">
                    Compared to hiring separate services
                  </p>
                </div>
                <p className="text-lg font-bold text-blue-700">
                  {formatCurrency(comparisons.savingsVsAlternatives.low)} -{" "}
                  {formatCurrency(comparisons.savingsVsAlternatives.high)}/mo
                </p>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <DisclaimerFooter type="benchmark" length="short" showTermsLink={false} />
          </CardFooter>
        </Card>
      </div>

      {/* Industry Benchmarks */}
      <Card variant="professional">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">
                Industry Benchmarks
              </CardTitle>
              <CardDescription>
                How your metrics could compare to{" "}
                {benchmarks.currentIndustry.replace("_", " ")} industry averages
              </CardDescription>
            </div>
            <Badge variant="secondary" className="capitalize">
              {benchmarks.currentIndustry.replace("_", " ")}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            {benchmarks.comparisons.map((comparison, index) => (
              <BenchmarkBar
                key={index}
                metric={comparison.metric}
                yourValue={comparison.yourValue}
                industryAverage={comparison.industryAverage}
                percentile={comparison.percentile}
                trend={comparison.trend}
                isPercentage={comparison.metric.includes("Rate")}
              />
            ))}
          </div>

          {/* Health Score Comparison */}
          <div className="bg-gray-50 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="font-semibold text-gray-900">
                  Overall Cash Flow Health
                </h4>
                <p className="text-sm text-gray-500">
                  {benchmarks.healthComparison.ranking}
                </p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-blue-600">
                  {benchmarks.healthComparison.yourScore}
                </p>
                <p className="text-sm text-gray-500">
                  vs {benchmarks.healthComparison.industryAverage} industry avg
                </p>
              </div>
            </div>

            <div className="relative h-4 bg-gray-200 rounded-full overflow-hidden mb-4">
              <div
                className="absolute h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full transition-all duration-500"
                style={{
                  width: `${benchmarks.healthComparison.yourScore}%`,
                }}
              />
              <div
                className="absolute h-full w-1 bg-gray-400"
                style={{
                  left: `${benchmarks.healthComparison.industryAverage}%`,
                }}
                title={`Industry average: ${benchmarks.healthComparison.industryAverage}`}
              />
            </div>

            <p className="text-sm text-gray-600 italic">
              {benchmarks.overallInsight}
            </p>
          </div>
        </CardContent>
        <CardFooter>
          <DisclaimerFooter type="benchmark" length="medium" showTermsLink={true} />
        </CardFooter>
      </Card>

      {/* Recommendations from Benchmarks */}
      {benchmarks.healthComparison.recommendations.length > 0 && (
        <InsightCard
          title="Potential Opportunities Based on Your Data"
          description="Based on how your metrics compare to industry benchmarks, here are some areas you could consider exploring."
          type="recommendation"
          confidence={0.7}
          actions={benchmarks.healthComparison.recommendations}
          disclaimerType="recommendation"
          disclaimerLength="medium"
          showTermsLink={true}
        />
      )}

      {/* Data Quality Notice */}
      {meta.isDefault && (
        <Card className="bg-yellow-50 border-yellow-200">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <svg
                className="h-5 w-5 text-yellow-600 mt-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div>
                <p className="font-medium text-yellow-800">
                  Limited Data Available
                </p>
                <p className="text-sm text-yellow-700">
                  These projections are based on default estimates. As you add
                  clients, invoices, and use the platform features, your ROI
                  calculations will become more accurate and personalized.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Full Disclaimer */}
      <Card className="bg-gray-50">
        <CardContent className="p-4">
          <p className="text-xs text-gray-500 leading-relaxed">
            {meta.disclaimer}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default ROICalculator;
