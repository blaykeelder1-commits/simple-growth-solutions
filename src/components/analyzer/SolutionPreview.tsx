"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AIFeatureGrid } from "./AIFeatureCard";
import { cn } from "@/lib/utils";
import {
  Check,
  X,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import type { ImprovementItem } from "@/lib/analyzer/improvement-categories";

interface SolutionPreviewProps {
  currentScore: number;
  improvements: ImprovementItem[];
  onClaimOffer: () => void;
  className?: string;
}

interface ComparisonItem {
  label: string;
  current: boolean;
}

function getComparisonItems(improvements: ImprovementItem[]): ComparisonItem[] {
  const items: ComparisonItem[] = [];

  // Check for SSL/security issues
  const securityIssue = improvements.find((i) => i.category.id === "security");
  if (securityIssue) {
    items.push({
      label: securityIssue.score < 70 ? "No SSL" : "SSL Secured",
      current: securityIssue.score >= 70,
    });
  }

  // Check for speed issues
  const speedIssue = improvements.find((i) => i.category.id === "speed");
  if (speedIssue) {
    items.push({
      label: speedIssue.score < 70 ? "Slow loading" : "Fast loading",
      current: speedIssue.score >= 70,
    });
  }

  // Check for mobile issues
  const mobileIssue = improvements.find((i) => i.category.id === "mobile");
  if (mobileIssue) {
    items.push({
      label: mobileIssue.score < 70 ? "Not mobile-friendly" : "Mobile optimized",
      current: mobileIssue.score >= 70,
    });
  }

  // Always show no chatbot as a current gap (we're selling AI features)
  items.push({
    label: "No chatbot",
    current: false,
  });

  return items.slice(0, 4); // Limit to 4 items for visual balance
}

export function SolutionPreview({
  currentScore,
  improvements,
  onClaimOffer,
  className,
}: SolutionPreviewProps) {
  const comparisonItems = getComparisonItems(improvements);
  const projectedScore = Math.min(95, currentScore + 20); // Projected score improvement

  return (
    <div className={cn("space-y-6", className)}>
      {/* Section Header */}
      <div className="text-center">
        <div className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-100 to-blue-100 rounded-full px-4 py-1.5 mb-4">
          <Sparkles className="h-4 w-4 text-purple-600" />
          <span className="text-sm font-medium text-purple-700">Your Transformation Preview</span>
        </div>
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
          See what your site could look like
        </h2>
        <p className="text-gray-600 max-w-xl mx-auto">
          We&apos;ll rebuild your website with AI-powered features and fix all identified issues - completely free.
        </p>
      </div>

      {/* Before/After Comparison */}
      <Card className="overflow-hidden">
        <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-gray-200">
          {/* Current Site */}
          <div className="p-6 bg-gray-50">
            <h3 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-gray-400" />
              Your Current Site
            </h3>
            <ul className="space-y-3 mb-6">
              {comparisonItems.map((item, index) => (
                <li key={index} className="flex items-center gap-3">
                  {item.current ? (
                    <Check className="h-5 w-5 text-green-500 flex-shrink-0" />
                  ) : (
                    <X className="h-5 w-5 text-red-400 flex-shrink-0" />
                  )}
                  <span className={cn("text-sm", item.current ? "text-gray-700" : "text-gray-500")}>
                    {item.label}
                  </span>
                </li>
              ))}
            </ul>
            <div className="flex items-center gap-2 pt-4 border-t border-gray-200">
              <span className="text-sm text-gray-500">Score:</span>
              <span className={cn(
                "text-2xl font-bold",
                currentScore >= 70 ? "text-amber-500" : "text-red-500"
              )}>
                {currentScore}
              </span>
            </div>
          </div>

          {/* Upgraded Site */}
          <div className="p-6 bg-gradient-to-br from-green-50 to-emerald-50">
            <h3 className="text-lg font-semibold text-emerald-700 mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Your New Site
            </h3>
            <ul className="space-y-3 mb-6">
              <li className="flex items-center gap-3">
                <Check className="h-5 w-5 text-emerald-500 flex-shrink-0" />
                <span className="text-sm text-emerald-800 font-medium">All issues fixed</span>
              </li>
              <li className="flex items-center gap-3">
                <Check className="h-5 w-5 text-emerald-500 flex-shrink-0" />
                <span className="text-sm text-emerald-800 font-medium">AI Chatbot active</span>
              </li>
              <li className="flex items-center gap-3">
                <Check className="h-5 w-5 text-emerald-500 flex-shrink-0" />
                <span className="text-sm text-emerald-800 font-medium">Smart lead capture</span>
              </li>
              <li className="flex items-center gap-3">
                <Check className="h-5 w-5 text-emerald-500 flex-shrink-0" />
                <span className="text-sm text-emerald-800 font-medium">Mobile optimized</span>
              </li>
            </ul>
            <div className="flex items-center gap-2 pt-4 border-t border-emerald-200">
              <span className="text-sm text-emerald-600">Score:</span>
              <span className="text-2xl font-bold text-emerald-600">{projectedScore}+</span>
            </div>
          </div>
        </div>
      </Card>

      {/* AI Features Section */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">
          Included AI-Powered Features
        </h3>
        <AIFeatureGrid />
      </div>

      {/* CTA */}
      <Card variant="gradient" className="p-6 md:p-8 text-center">
        <h3 className="text-xl md:text-2xl font-bold text-white mb-2">
          Ready to transform your website?
        </h3>
        <p className="text-blue-100 mb-6">
          Get your complete website rebuild with AI features - absolutely free
        </p>
        <Button
          onClick={onClaimOffer}
          size="xl"
          className="bg-white text-blue-600 hover:bg-blue-50 shadow-lg"
        >
          <Sparkles className="mr-2 h-5 w-5" />
          Claim My Free Website Upgrade
          <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
        <p className="text-xs text-blue-200 mt-4">
          No credit card required. Optional $79/mo management after launch.
        </p>
      </Card>
    </div>
  );
}
