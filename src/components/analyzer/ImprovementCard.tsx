"use client";

import { cn } from "@/lib/utils";
import {
  Shield,
  Smartphone,
  Search,
  Zap,
  Accessibility,
  Palette,
  CheckCircle,
  AlertTriangle,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import type { ImprovementItem, SeverityLevel } from "@/lib/analyzer/improvement-categories";

// Icon mapping
const iconMap: Record<string, React.ElementType> = {
  Shield,
  Smartphone,
  Search,
  Zap,
  Accessibility,
  Palette,
};

interface ImprovementCardProps {
  improvement: ImprovementItem;
  showBusinessImpact?: boolean;
  compact?: boolean;
}

function getSeverityStyles(severity: SeverityLevel) {
  switch (severity) {
    case "critical":
      return {
        badge: "bg-red-100 text-red-700 border-red-200",
        icon: "text-red-500",
        border: "border-red-200 hover:border-red-300",
        bg: "bg-red-50/50",
      };
    case "warning":
      return {
        badge: "bg-amber-100 text-amber-700 border-amber-200",
        icon: "text-amber-500",
        border: "border-amber-200 hover:border-amber-300",
        bg: "bg-amber-50/50",
      };
    default:
      return {
        badge: "bg-green-100 text-green-700 border-green-200",
        icon: "text-green-500",
        border: "border-gray-200 hover:border-gray-300",
        bg: "bg-white",
      };
  }
}

function getSeverityLabel(severity: SeverityLevel) {
  switch (severity) {
    case "critical":
      return "Critical";
    case "warning":
      return "Warning";
    default:
      return "Good";
  }
}

export function ImprovementCard({
  improvement,
  showBusinessImpact = true,
  compact = false,
}: ImprovementCardProps) {
  const styles = getSeverityStyles(improvement.severity);
  const Icon = iconMap[improvement.category.icon] || Shield;
  const isPassing = improvement.score >= 70;

  if (compact) {
    return (
      <div
        className={cn(
          "group relative rounded-xl border p-4 transition-all duration-300",
          styles.border,
          styles.bg,
          "hover:shadow-lg hover:-translate-y-0.5"
        )}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <div
              className={cn(
                "rounded-lg p-2 transition-colors",
                isPassing ? "bg-green-100" : "bg-gray-100 group-hover:bg-gray-200"
              )}
            >
              <Icon className={cn("h-5 w-5", styles.icon)} />
            </div>
            <span className="font-semibold text-gray-900">{improvement.category.name}</span>
          </div>
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium",
              styles.badge
            )}
          >
            {improvement.severity === "info" ? (
              <CheckCircle className="h-3 w-3" />
            ) : (
              <AlertTriangle className="h-3 w-3" />
            )}
            {getSeverityLabel(improvement.severity)}
          </span>
        </div>

        {/* Issue */}
        <p className="text-sm text-gray-600 mb-2 line-clamp-2">{improvement.issue}</p>

        {/* Auto-fix badge */}
        {improvement.canAutomate && !isPassing && (
          <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Auto-fix available</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "group relative rounded-xl border p-5 transition-all duration-300",
        styles.border,
        styles.bg,
        "hover:shadow-lg hover:-translate-y-0.5"
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "rounded-lg p-2.5 transition-colors",
              isPassing ? "bg-green-100" : "bg-gray-100 group-hover:bg-gray-200"
            )}
          >
            <Icon className={cn("h-6 w-6", styles.icon)} />
          </div>
          <div>
            <span className="font-semibold text-gray-900 text-lg">{improvement.category.name}</span>
            <div className="flex items-center gap-2 mt-0.5">
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium",
                  styles.badge
                )}
              >
                {improvement.severity === "info" ? (
                  <CheckCircle className="h-3 w-3" />
                ) : (
                  <AlertTriangle className="h-3 w-3" />
                )}
                {getSeverityLabel(improvement.severity)}
              </span>
              <span className="text-xs text-gray-400">Score: {improvement.score}/100</span>
            </div>
          </div>
        </div>
      </div>

      {/* Issue Description */}
      <div className="mb-4">
        <p className="text-sm font-medium text-gray-700 mb-1">Issue:</p>
        <p className="text-sm text-gray-600">{improvement.issue}</p>
      </div>

      {/* Solution */}
      <div className="mb-4">
        <p className="text-sm font-medium text-gray-700 mb-1">AI Solution:</p>
        <p className="text-sm text-gray-600">{improvement.solution}</p>
      </div>

      {/* Business Impact */}
      {showBusinessImpact && improvement.category.businessImpact && !isPassing && (
        <div className="mb-4 rounded-lg bg-gradient-to-r from-blue-50 to-purple-50 p-3 border border-blue-100">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="h-4 w-4 text-blue-600" />
            <span className="text-xs font-semibold text-blue-700 uppercase tracking-wide">
              {improvement.category.businessImpact.title}
            </span>
          </div>
          <p className="text-sm text-gray-700">{improvement.category.businessImpact.stat}</p>
          <p className="text-xs text-gray-500 mt-1">
            Source: {improvement.category.businessImpact.source}
          </p>
        </div>
      )}

      {/* Auto-fix badge */}
      {improvement.canAutomate && !isPassing ? (
        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          <div className="flex items-center gap-2 text-emerald-600">
            <Sparkles className="h-4 w-4" />
            <span className="text-sm font-medium">Can be fixed automatically</span>
          </div>
          <CheckCircle className="h-5 w-5 text-emerald-500" />
        </div>
      ) : !isPassing ? (
        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          <div className="flex items-center gap-2 text-purple-600">
            <span className="text-sm font-medium">Requires consultation</span>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          <div className="flex items-center gap-2 text-green-600">
            <CheckCircle className="h-4 w-4" />
            <span className="text-sm font-medium">Looking good!</span>
          </div>
        </div>
      )}
    </div>
  );
}

// Grid component for displaying multiple cards
interface ImprovementGridProps {
  improvements: ImprovementItem[];
  compact?: boolean;
  showBusinessImpact?: boolean;
}

export function ImprovementGrid({
  improvements,
  compact = false,
  showBusinessImpact = true,
}: ImprovementGridProps) {
  return (
    <div className={cn("grid gap-4", compact ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" : "grid-cols-1 md:grid-cols-2")}>
      {improvements.map((improvement) => (
        <ImprovementCard
          key={improvement.category.id}
          improvement={improvement}
          compact={compact}
          showBusinessImpact={showBusinessImpact}
        />
      ))}
    </div>
  );
}
