"use client";

import * as React from "react";
import { cva } from "class-variance-authority";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "./card";
import { Badge } from "./badge";
import {
  type DisclaimerType,
  type DisclaimerLength,
  type AIContentBadgeType,
  type ConfidenceLevel,
  getDisclaimer,
  getConfidenceInfo,
  AI_CONTENT_BADGES,
  LEGAL_LINKS,
} from "@/lib/legal/disclaimers";

// Confidence badge variants
const confidenceBadgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
  {
    variants: {
      level: {
        high: "bg-green-100 text-green-800 border border-green-200",
        medium: "bg-yellow-100 text-yellow-800 border border-yellow-200",
        low: "bg-orange-100 text-orange-800 border border-orange-200",
      },
    },
    defaultVariants: {
      level: "medium",
    },
  }
);

// Confidence indicator component
interface ConfidenceBadgeProps {
  score: number;
  showPercentage?: boolean;
  className?: string;
}

export function ConfidenceBadge({
  score,
  showPercentage = true,
  className,
}: ConfidenceBadgeProps) {
  const info = getConfidenceInfo(score);

  return (
    <div
      className={cn(confidenceBadgeVariants({ level: info.level }), className)}
      title={info.description}
    >
      <svg
        className="h-3 w-3"
        fill="currentColor"
        viewBox="0 0 20 20"
        xmlns="http://www.w3.org/2000/svg"
      >
        {info.level === "high" && (
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
            clipRule="evenodd"
          />
        )}
        {info.level === "medium" && (
          <path
            fillRule="evenodd"
            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
            clipRule="evenodd"
          />
        )}
        {info.level === "low" && (
          <path
            fillRule="evenodd"
            d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
            clipRule="evenodd"
          />
        )}
      </svg>
      <span>
        {info.label}
        {showPercentage && ` (${info.percentage}%)`}
      </span>
    </div>
  );
}

// AI content badge component
interface AIBadgeProps {
  type: AIContentBadgeType;
  className?: string;
}

export function AIBadge({ type, className }: AIBadgeProps) {
  const badge = AI_CONTENT_BADGES[type];

  return (
    <Badge
      variant="secondary"
      className={cn(
        "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100",
        className
      )}
      title={badge.tooltip}
    >
      <svg
        className="h-3 w-3 mr-1"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
        />
      </svg>
      {badge.label}
    </Badge>
  );
}

// Disclaimer footer component
interface DisclaimerFooterProps {
  type?: DisclaimerType;
  length?: DisclaimerLength;
  showTermsLink?: boolean;
  className?: string;
}

export function DisclaimerFooter({
  type = "general",
  length = "short",
  showTermsLink = true,
  className,
}: DisclaimerFooterProps) {
  const disclaimer = getDisclaimer(type, length);

  return (
    <div
      className={cn(
        "text-xs text-gray-500 border-t border-gray-100 pt-3 mt-3",
        className
      )}
    >
      <p className="italic">{disclaimer}</p>
      {showTermsLink && (
        <Link
          href={LEGAL_LINKS.disclaimer}
          className="text-blue-600 hover:text-blue-800 underline mt-1 inline-block"
        >
          View full disclaimer
        </Link>
      )}
    </div>
  );
}

// Main InsightCard component
export interface InsightCardProps {
  title: string;
  description: string;
  type?: AIContentBadgeType;
  confidence?: number;
  priority?: "low" | "medium" | "high" | "critical";
  actions?: string[];
  reasoning?: string;
  disclaimerType?: DisclaimerType;
  disclaimerLength?: DisclaimerLength;
  showDisclaimer?: boolean;
  showBadge?: boolean;
  showConfidence?: boolean;
  showTermsLink?: boolean;
  className?: string;
  children?: React.ReactNode;
}

const priorityColors = {
  low: "border-l-gray-400",
  medium: "border-l-yellow-400",
  high: "border-l-orange-500",
  critical: "border-l-red-500",
};

export function InsightCard({
  title,
  description,
  type = "insight",
  confidence,
  priority,
  actions,
  reasoning,
  disclaimerType = "recommendation",
  disclaimerLength = "short",
  showDisclaimer = true,
  showBadge = true,
  showConfidence = true,
  showTermsLink = false,
  className,
  children,
}: InsightCardProps) {
  return (
    <Card
      variant="professional"
      className={cn(
        "border-l-4",
        priority ? priorityColors[priority] : "border-l-blue-400",
        className
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <CardTitle className="text-lg">{title}</CardTitle>
            <CardDescription className="mt-1">{description}</CardDescription>
          </div>
          <div className="flex flex-col items-end gap-2">
            {showBadge && <AIBadge type={type} />}
            {showConfidence && confidence !== undefined && (
              <ConfidenceBadge score={confidence} showPercentage={true} />
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {actions && actions.length > 0 && (
          <div className="mb-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">
              Possible Actions to Consider:
            </h4>
            <ul className="space-y-1">
              {actions.map((action, index) => (
                <li
                  key={index}
                  className="text-sm text-gray-600 flex items-start gap-2"
                >
                  <span className="text-blue-500 mt-1">
                    <svg
                      className="h-3 w-3"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </span>
                  {action}
                </li>
              ))}
            </ul>
          </div>
        )}

        {reasoning && (
          <div className="bg-gray-50 rounded-lg p-3 mb-4">
            <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
              Data-Based Reasoning
            </h4>
            <p className="text-sm text-gray-700">{reasoning}</p>
          </div>
        )}

        {children}
      </CardContent>

      {showDisclaimer && (
        <CardFooter className="pt-0">
          <DisclaimerFooter
            type={disclaimerType}
            length={disclaimerLength}
            showTermsLink={showTermsLink}
          />
        </CardFooter>
      )}
    </Card>
  );
}

// Simple insight display for inline use
export interface InlineInsightProps {
  text: string;
  confidence?: number;
  className?: string;
}

export function InlineInsight({
  text,
  confidence,
  className,
}: InlineInsightProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 bg-blue-50 text-blue-800 px-3 py-1.5 rounded-lg text-sm",
        className
      )}
    >
      <svg
        className="h-4 w-4 text-blue-500"
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
      <span>{text}</span>
      {confidence !== undefined && (
        <ConfidenceBadge score={confidence} showPercentage={false} />
      )}
    </div>
  );
}

// Export all components
export {
  type DisclaimerType,
  type DisclaimerLength,
  type AIContentBadgeType,
  type ConfidenceLevel,
};
