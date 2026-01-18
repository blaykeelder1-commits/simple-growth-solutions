"use client";

import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { TrendingDown, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";

interface RevenueImpactProps {
  score: number;
  issueCount: number;
  className?: string;
}

// Calculate estimated monthly revenue loss based on score and issues
function calculateRevenueLoss(score: number, issueCount: number): number {
  // Base loss calculation - lower scores = higher potential loss
  const scoreFactor = Math.max(0, (100 - score) / 100);
  const issueFactor = Math.min(issueCount * 150, 1200);

  // Base estimated loss between $200 - $2500/month depending on severity
  const baseLoss = 200 + (scoreFactor * 1500) + issueFactor;

  // Round to nearest 50
  return Math.round(baseLoss / 50) * 50;
}

// Animated counter hook
function useAnimatedCounter(target: number, duration: number = 1500): number {
  const [count, setCount] = useState(0);
  const frameRef = useRef<number>();
  const startTimeRef = useRef<number>();

  useEffect(() => {
    startTimeRef.current = undefined;

    const animate = (timestamp: number) => {
      if (!startTimeRef.current) {
        startTimeRef.current = timestamp;
      }

      const progress = Math.min((timestamp - startTimeRef.current) / duration, 1);

      // Easing function for smoother animation
      const easeOutQuad = (t: number) => t * (2 - t);
      const easedProgress = easeOutQuad(progress);

      setCount(Math.floor(easedProgress * target));

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      }
    };

    frameRef.current = requestAnimationFrame(animate);

    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, [target, duration]);

  return count;
}

export function RevenueImpact({ score, issueCount, className }: RevenueImpactProps) {
  const estimatedLoss = calculateRevenueLoss(score, issueCount);
  const animatedValue = useAnimatedCounter(estimatedLoss);

  // Determine severity text based on score
  const getSeverityMessage = () => {
    if (score < 40) return "Critical issues detected";
    if (score < 70) return "Multiple issues affecting growth";
    return "Room for optimization";
  };

  return (
    <Card
      className={cn(
        "bg-gradient-to-r from-red-50 to-orange-50 border-red-200 p-5 overflow-hidden relative",
        className
      )}
    >
      {/* Background decoration */}
      <div className="absolute -right-4 -top-4 w-24 h-24 bg-red-100/50 rounded-full blur-2xl" />

      <div className="relative flex items-center gap-4">
        <div className="flex-shrink-0">
          <div className="rounded-full bg-red-100 p-3">
            <TrendingDown className="h-6 w-6 text-red-600" />
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-red-800 mb-1">
            {getSeverityMessage()}
          </p>
          <div className="flex items-baseline gap-1">
            <span className="text-sm text-red-700">These issues may cost you</span>
            <span className="text-2xl font-bold text-red-600 flex items-center">
              <DollarSign className="h-5 w-5" />
              {animatedValue.toLocaleString()}
            </span>
            <span className="text-sm text-red-700">/month</span>
          </div>
          <p className="text-xs text-red-600/80 mt-1">
            Based on industry conversion rate studies
          </p>
        </div>
      </div>
    </Card>
  );
}
