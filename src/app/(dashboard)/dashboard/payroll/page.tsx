"use client";

import { useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { InsightCard, DisclaimerFooter } from "@/components/ui/insight-card";
import { ManualPayrollEntry, PayrollCSVUpload } from "@/components/payroll/manual-entry";

// Sample data for demonstration
const SAMPLE_PAYROLL_DATA = {
  currentPeriod: {
    totalGrossPay: 4250000, // $42,500
    totalNetPay: 3187500, // $31,875
    employeeCount: 8,
    payrollAsPercentOfRevenue: 0.32,
    overtimeHours: 45,
    benefitsCost: 425000, // $4,250
  },
  trends: {
    payrollGrowth: 0.05, // 5% month-over-month
    headcountChange: 1,
    overtimeTrend: -0.1, // -10% (good)
  },
  departmentBreakdown: [
    { name: "Operations", cost: 1700000, employees: 3 },
    { name: "Service", cost: 1275000, employees: 3 },
    { name: "Management", cost: 850000, employees: 1 },
    { name: "Admin", cost: 425000, employees: 1 },
  ],
  hiringInsights: [
    {
      title: "You could consider adding kitchen staff",
      description:
        "Based on your overtime hours trend and revenue growth of approximately 15%, you might benefit from adding capacity in Operations. Similar businesses at your revenue level typically have 4-5 kitchen staff.",
      urgency: "consider" as const,
      confidence: 0.72,
    },
    {
      title: "Staffing levels appear appropriate for current revenue",
      description:
        "Your payroll as a percentage of revenue (32%) is within the typical range for restaurant businesses (30-38%). This suggests your current staffing could be well-aligned with your operations.",
      urgency: "informational" as const,
      confidence: 0.68,
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

export default function PayrollDashboard() {
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [showCSVUpload, setShowCSVUpload] = useState(false);

  const { currentPeriod, trends, departmentBreakdown, hiringInsights } =
    SAMPLE_PAYROLL_DATA;

  const handleManualSubmit = async (data: {
    periodStart: string;
    periodEnd: string;
    payDate: string;
    entries: { employeeName: string; grossPay: number }[];
  }) => {
    try {
      const response = await fetch('/api/payroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save payroll data');
      }

      // Successfully saved - refresh the page to show new data
      setShowManualEntry(false);
      window.location.reload();
    } catch (error) {
      console.error('Failed to save payroll:', error);
      alert(error instanceof Error ? error.message : 'Failed to save payroll data');
    }
  };

  const handleCSVUpload = async (
    entries: { employeeName: string; grossPay: number }[]
  ) => {
    try {
      // Create a payroll snapshot with the CSV data
      const today = new Date();
      const twoWeeksAgo = new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000);

      const response = await fetch('/api/payroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          periodStart: twoWeeksAgo.toISOString().split('T')[0],
          periodEnd: today.toISOString().split('T')[0],
          payDate: today.toISOString().split('T')[0],
          entries,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to import payroll data');
      }

      setShowCSVUpload(false);
      window.location.reload();
    } catch (error) {
      console.error('Failed to import CSV:', error);
      alert(error instanceof Error ? error.message : 'Failed to import payroll data');
    }
  };

  if (showManualEntry) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => setShowManualEntry(false)}>
            &larr; Back to Dashboard
          </Button>
          <h1 className="text-2xl font-bold text-gray-900">
            Enter Payroll Data
          </h1>
        </div>
        <ManualPayrollEntry
          onSubmit={handleManualSubmit}
          onCancel={() => setShowManualEntry(false)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Payroll Analytics</h1>
          <p className="text-gray-500 mt-1">
            Monitor payroll costs and get hiring insights
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => setShowCSVUpload(!showCSVUpload)}
          >
            Upload CSV
          </Button>
          <Button
            onClick={() => setShowManualEntry(true)}
            className="bg-gradient-to-r from-blue-600 to-indigo-600"
          >
            + Add Payroll Entry
          </Button>
        </div>
      </div>

      {/* CSV Upload Section */}
      {showCSVUpload && (
        <Card>
          <CardHeader>
            <CardTitle>Import Payroll Data</CardTitle>
            <CardDescription>
              Upload a CSV file to import payroll entries
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PayrollCSVUpload onUpload={handleCSVUpload} />
          </CardContent>
        </Card>
      )}

      {/* Summary Stats */}
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Total Payroll
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {formatCurrency(currentPeriod.totalGrossPay)}
            </div>
            <p className="text-sm text-gray-500 mt-1">
              {currentPeriod.employeeCount} employees
            </p>
            <div className="flex items-center gap-1 mt-2 text-sm">
              <span
                className={
                  trends.payrollGrowth > 0 ? "text-orange-600" : "text-green-600"
                }
              >
                {trends.payrollGrowth > 0 ? "+" : ""}
                {(trends.payrollGrowth * 100).toFixed(1)}%
              </span>
              <span className="text-gray-400">vs last period</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              % of Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {(currentPeriod.payrollAsPercentOfRevenue * 100).toFixed(1)}%
            </div>
            <p className="text-sm text-gray-500 mt-1">Industry avg: 30-38%</p>
            <Badge
              variant={
                currentPeriod.payrollAsPercentOfRevenue > 0.38
                  ? "destructive"
                  : "secondary"
              }
              className="mt-2"
            >
              {currentPeriod.payrollAsPercentOfRevenue <= 0.38
                ? "Within range"
                : "Above average"}
            </Badge>
          </CardContent>
        </Card>

        <Card className="bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Overtime Hours
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {currentPeriod.overtimeHours}
            </div>
            <p className="text-sm text-gray-500 mt-1">This pay period</p>
            <div className="flex items-center gap-1 mt-2 text-sm">
              <span
                className={
                  trends.overtimeTrend < 0 ? "text-green-600" : "text-orange-600"
                }
              >
                {trends.overtimeTrend > 0 ? "+" : ""}
                {(trends.overtimeTrend * 100).toFixed(0)}%
              </span>
              <span className="text-gray-400">vs last period</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Benefits Cost
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {formatCurrency(currentPeriod.benefitsCost)}
            </div>
            <p className="text-sm text-gray-500 mt-1">
              {(
                (currentPeriod.benefitsCost / currentPeriod.totalGrossPay) *
                100
              ).toFixed(1)}
              % of payroll
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Department Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Department Breakdown</CardTitle>
            <CardDescription>Payroll costs by department</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {departmentBreakdown.map((dept, index) => {
                const percentage =
                  (dept.cost / currentPeriod.totalGrossPay) * 100;
                return (
                  <div key={index}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-medium text-gray-700">
                        {dept.name}
                      </span>
                      <span className="text-sm text-gray-500">
                        {formatCurrency(dept.cost)} ({dept.employees})
                      </span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Integration Status */}
        <Card>
          <CardHeader>
            <CardTitle>Payroll Integrations</CardTitle>
            <CardDescription>Connect your payroll provider</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <span className="text-lg font-bold text-green-600">G</span>
                </div>
                <div>
                  <p className="font-medium text-gray-900">Gusto</p>
                  <p className="text-sm text-gray-500">Payroll & HR</p>
                </div>
              </div>
              <Button variant="outline" size="sm">
                Connect
              </Button>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <span className="text-lg font-bold text-blue-600">A</span>
                </div>
                <div>
                  <p className="font-medium text-gray-900">ADP</p>
                  <p className="text-sm text-gray-500">Coming soon</p>
                </div>
              </div>
              <Badge variant="secondary">Coming Soon</Badge>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <span className="text-lg font-bold text-purple-600">QP</span>
                </div>
                <div>
                  <p className="font-medium text-gray-900">QuickBooks Payroll</p>
                  <p className="text-sm text-gray-500">Coming soon</p>
                </div>
              </div>
              <Badge variant="secondary">Coming Soon</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Hiring Insights */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">
            Hiring Insights
          </h2>
          <Badge variant="secondary">AI-Powered</Badge>
        </div>

        {hiringInsights.map((insight, index) => (
          <InsightCard
            key={index}
            title={insight.title}
            description={insight.description}
            type="recommendation"
            confidence={insight.confidence}
            priority={insight.urgency === "consider" ? "medium" : "low"}
            disclaimerType="hiring"
            disclaimerLength="medium"
            showTermsLink={true}
          />
        ))}
      </div>

      {/* Cost per Employee Analysis */}
      <Card>
        <CardHeader>
          <CardTitle>Cost Analysis</CardTitle>
          <CardDescription>
            Payroll metrics and industry comparisons
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500 mb-1">
                Avg Cost per Employee
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(
                  currentPeriod.totalGrossPay / currentPeriod.employeeCount
                )}
              </p>
              <p className="text-xs text-gray-400 mt-1">per pay period</p>
            </div>

            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500 mb-1">Overtime Cost</p>
              <p className="text-2xl font-bold text-orange-600">
                {formatCurrency(currentPeriod.overtimeHours * 2500)}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                ~{currentPeriod.overtimeHours} hours @ $25/hr avg
              </p>
            </div>

            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500 mb-1">
                Revenue per Employee
              </p>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(
                  currentPeriod.totalGrossPay /
                    currentPeriod.payrollAsPercentOfRevenue /
                    currentPeriod.employeeCount
                )}
              </p>
              <p className="text-xs text-gray-400 mt-1">per pay period</p>
            </div>
          </div>
        </CardContent>
        <CardContent className="pt-0">
          <DisclaimerFooter
            type="benchmark"
            length="medium"
            showTermsLink={true}
          />
        </CardContent>
      </Card>
    </div>
  );
}
