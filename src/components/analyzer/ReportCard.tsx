"use client";

import { cn } from "@/lib/utils";
import {
  Gauge,
  Smartphone,
  Search,
  Shield,
  Zap,
  Globe,
  CheckCircle,
  AlertCircle,
  XCircle,
  Palette,
  AlertTriangle,
  TrendingDown,
  Lightbulb,
  Clock,
} from "lucide-react";

interface ScoreItemProps {
  label: string;
  score: number;
  icon: React.ElementType;
  description: string;
}

function getScoreColor(score: number) {
  if (score >= 80) return "text-green-500";
  if (score >= 50) return "text-yellow-500";
  return "text-red-500";
}

function getScoreIcon(score: number) {
  if (score >= 80) return CheckCircle;
  if (score >= 50) return AlertCircle;
  return XCircle;
}

function getScoreLabel(score: number) {
  if (score >= 80) return "Good";
  if (score >= 50) return "Needs Work";
  return "Poor";
}

function getSeverityColor(severity: string) {
  switch (severity) {
    case "critical":
      return "bg-red-100 text-red-800 border-red-200";
    case "high":
      return "bg-orange-100 text-orange-800 border-orange-200";
    case "medium":
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    default:
      return "bg-blue-100 text-blue-800 border-blue-200";
  }
}

function ScoreItem({ label, score, icon: Icon, description }: ScoreItemProps) {
  const ScoreIcon = getScoreIcon(score);
  const scoreColor = getScoreColor(score);

  return (
    <div className="flex items-start gap-4 rounded-lg border bg-card p-4">
      <div className="rounded-lg bg-primary/10 p-2 text-primary">
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex-1">
        <div className="mb-1 flex items-center justify-between">
          <h4 className="font-medium">{label}</h4>
          <div className={cn("flex items-center gap-1 text-sm font-medium", scoreColor)}>
            <ScoreIcon className="h-4 w-4" />
            <span>{score}/100</span>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">{description}</p>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
          <div
            className={cn(
              "h-full rounded-full transition-all",
              score >= 80 ? "bg-green-500" : score >= 50 ? "bg-yellow-500" : "bg-red-500"
            )}
            style={{ width: `${score}%` }}
          />
        </div>
      </div>
    </div>
  );
}

interface PainPoint {
  category: string;
  issue: string;
  impact: string;
  solution: string;
  severity: "critical" | "high" | "medium" | "low";
}

interface AIAnalysis {
  overallAssessment: string;
  painPoints: PainPoint[];
  missedOpportunities: string[];
  competitorAdvantage: string;
  urgencyStatement: string;
}

interface ReportCardProps {
  url: string;
  data: {
    overallScore: number;
    performance: number;
    mobile: number;
    seo: number;
    security: number;
    speed: number;
    accessibility: number;
    design?: number;
    recommendations: string[];
    aiAnalysis?: AIAnalysis;
  };
}

export function ReportCard({ url, data }: ReportCardProps) {
  const overallColor = getScoreColor(data.overallScore);
  const OverallIcon = getScoreIcon(data.overallScore);

  return (
    <div className="space-y-6">
      {/* Overall Score Card */}
      <div className="rounded-2xl border bg-gradient-to-br from-card to-muted/30 p-6 text-center md:p-8">
        <p className="mb-2 text-sm text-muted-foreground">Analysis for</p>
        <p className="mb-4 truncate font-mono text-sm text-primary">{url}</p>

        <div className={cn("mb-2 text-6xl font-bold md:text-7xl", overallColor)}>
          {data.overallScore}
        </div>
        <div className={cn("flex items-center justify-center gap-2", overallColor)}>
          <OverallIcon className="h-5 w-5" />
          <span className="font-medium">{getScoreLabel(data.overallScore)}</span>
        </div>
        <p className="mt-4 text-sm text-muted-foreground">Overall Website Score</p>
      </div>

      {/* AI Overall Assessment */}
      {data.aiAnalysis?.overallAssessment && (
        <div className="rounded-xl border border-orange-200 bg-orange-50 p-6">
          <div className="mb-3 flex items-center gap-2 text-orange-800">
            <AlertTriangle className="h-5 w-5" />
            <h3 className="font-semibold">AI Analysis Summary</h3>
          </div>
          <p className="text-orange-900">{data.aiAnalysis.overallAssessment}</p>
        </div>
      )}

      {/* Individual Scores */}
      <div className="grid gap-4 md:grid-cols-2">
        <ScoreItem
          label="Performance"
          score={data.performance}
          icon={Gauge}
          description="How fast your website loads and responds to user interactions"
        />
        <ScoreItem
          label="Mobile Friendliness"
          score={data.mobile}
          icon={Smartphone}
          description="How well your site works on phones and tablets"
        />
        <ScoreItem
          label="SEO"
          score={data.seo}
          icon={Search}
          description="How discoverable your site is in search engines"
        />
        <ScoreItem
          label="Security"
          score={data.security}
          icon={Shield}
          description="SSL certificate, HTTPS, and security best practices"
        />
        <ScoreItem
          label="Page Speed"
          score={data.speed}
          icon={Zap}
          description="Time to first contentful paint and largest contentful paint"
        />
        <ScoreItem
          label="Accessibility"
          score={data.accessibility}
          icon={Globe}
          description="How accessible your site is to users with disabilities"
        />
        {data.design !== undefined && (
          <ScoreItem
            label="Design Quality"
            score={data.design}
            icon={Palette}
            description="Modern design patterns, typography, and visual structure"
          />
        )}
      </div>

      {/* AI Pain Points */}
      {data.aiAnalysis?.painPoints && data.aiAnalysis.painPoints.length > 0 && (
        <div className="rounded-xl border bg-card p-6">
          <div className="mb-4 flex items-center gap-2">
            <TrendingDown className="h-5 w-5 text-red-500" />
            <h3 className="text-lg font-semibold">Issues Costing You Customers</h3>
          </div>
          <div className="space-y-4">
            {data.aiAnalysis.painPoints.map((point, index) => (
              <div
                key={index}
                className={cn(
                  "rounded-lg border p-4",
                  getSeverityColor(point.severity)
                )}
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="font-medium">{point.category}</span>
                  <span className="rounded-full bg-white/50 px-2 py-0.5 text-xs font-medium uppercase">
                    {point.severity}
                  </span>
                </div>
                <p className="mb-2 font-medium text-gray-900">{point.issue}</p>
                <p className="mb-2 text-sm">
                  <strong>Impact:</strong> {point.impact}
                </p>
                <p className="text-sm">
                  <strong>Solution:</strong> {point.solution}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Missed Opportunities */}
      {data.aiAnalysis?.missedOpportunities && data.aiAnalysis.missedOpportunities.length > 0 && (
        <div className="rounded-xl border bg-card p-6">
          <div className="mb-4 flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-yellow-500" />
            <h3 className="text-lg font-semibold">Opportunities You&apos;re Missing</h3>
          </div>
          <ul className="space-y-3">
            {data.aiAnalysis.missedOpportunities.map((opportunity, index) => (
              <li key={index} className="flex items-start gap-3">
                <div className="mt-0.5 rounded-full bg-yellow-100 p-1">
                  <AlertCircle className="h-4 w-4 text-yellow-600" />
                </div>
                <span className="text-muted-foreground">{opportunity}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Competitor Advantage */}
      {data.aiAnalysis?.competitorAdvantage && (
        <div className="rounded-xl border border-purple-200 bg-purple-50 p-6">
          <div className="mb-3 flex items-center gap-2 text-purple-800">
            <TrendingDown className="h-5 w-5" />
            <h3 className="font-semibold">What Your Competitors Know</h3>
          </div>
          <p className="text-purple-900">{data.aiAnalysis.competitorAdvantage}</p>
        </div>
      )}

      {/* Urgency Statement */}
      {data.aiAnalysis?.urgencyStatement && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-6">
          <div className="mb-3 flex items-center gap-2 text-blue-800">
            <Clock className="h-5 w-5" />
            <h3 className="font-semibold">Why This Matters Now</h3>
          </div>
          <p className="text-blue-900">{data.aiAnalysis.urgencyStatement}</p>
        </div>
      )}

      {/* Basic Recommendations (fallback if no AI analysis) */}
      {(!data.aiAnalysis || !data.aiAnalysis.painPoints?.length) &&
        data.recommendations.length > 0 && (
          <div className="rounded-xl border bg-card p-6">
            <h3 className="mb-4 text-lg font-semibold">Key Recommendations</h3>
            <ul className="space-y-3">
              {data.recommendations.map((rec, index) => (
                <li key={index} className="flex items-start gap-3">
                  <div className="mt-0.5 rounded-full bg-primary/10 p-1 text-primary">
                    <AlertCircle className="h-4 w-4" />
                  </div>
                  <span className="text-sm text-muted-foreground">{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
    </div>
  );
}
