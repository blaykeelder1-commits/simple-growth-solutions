"use client";

import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ImprovementGrid } from "@/components/analyzer/ImprovementCard";
import { RevenueImpact } from "@/components/analyzer/RevenueImpact";
import { SolutionPreview } from "@/components/analyzer/SolutionPreview";
import { ClaimOfferForm } from "@/components/analyzer/ClaimOfferForm";
import {
  mapChecksToImprovements,
  getTotalImprovements,
  getScoreBasedMessage,
  type ImprovementItem,
} from "@/lib/analyzer/improvement-categories";
import {
  Link as LinkIcon,
  ArrowRight,
  Loader2,
  Sparkles,
  AlertCircle,
  CheckCircle,
  Eye,
  Calendar,
  Clock,
  Rocket,
  PartyPopper,
} from "lucide-react";
import { cn } from "@/lib/utils";

type AnalyzerState = "idle" | "loading" | "results" | "solution-preview" | "claim-offer" | "success";

interface AnalysisData {
  url: string;
  overallScore: number;
  checks: {
    ssl: { passed: boolean; score: number; message: string; details?: string };
    mobile: { passed: boolean; score: number; message: string; details?: string };
    seo: { passed: boolean; score: number; message: string; details?: string };
    speed: { passed: boolean; score: number; message: string; details?: string };
    accessibility: { passed: boolean; score: number; message: string; details?: string };
    design: { passed: boolean; score: number; message: string; details?: string };
  };
}

// Validate URL format
function isValidUrl(string: string): boolean {
  try {
    const url = string.startsWith("http") ? string : `https://${string}`;
    new URL(url);
    // Basic domain validation
    return /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?\.[a-zA-Z]{2,}/.test(
      url.replace(/^https?:\/\//, "").split("/")[0]
    );
  } catch {
    return false;
  }
}

// Scanning animation messages
const scanningMessages = [
  "Checking SSL security...",
  "Testing mobile responsiveness...",
  "Analyzing SEO elements...",
  "Measuring page speed...",
  "Evaluating accessibility...",
  "Reviewing design patterns...",
];

export function UrlAnalyzer() {
  const [state, setState] = useState<AnalyzerState>("idle");
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [scanMessage, setScanMessage] = useState(scanningMessages[0]);
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);
  const [improvements, setImprovements] = useState<ImprovementItem[]>([]);

  // Animate scanning messages
  useEffect(() => {
    if (state !== "loading") return;

    let index = 0;
    const interval = setInterval(() => {
      index = (index + 1) % scanningMessages.length;
      setScanMessage(scanningMessages[index]);
    }, 800);

    return () => clearInterval(interval);
  }, [state]);

  // Analyze the URL
  const handleAnalyze = useCallback(async (urlToAnalyze?: string) => {
    const targetUrl = urlToAnalyze || url;

    if (!targetUrl.trim()) {
      setError("Please enter a website URL");
      return;
    }

    if (!isValidUrl(targetUrl)) {
      setError("Please enter a valid website URL (e.g., example.com)");
      return;
    }

    setError("");
    setState("loading");

    try {
      const normalizedUrl = targetUrl.startsWith("http") ? targetUrl : `https://${targetUrl}`;
      const response = await fetch(`/api/analyze/public?url=${encodeURIComponent(normalizedUrl)}`);

      if (!response.ok) {
        const data = await response.json();
        if (response.status === 429) {
          setError("You've reached the free analysis limit. Enter your email to get unlimited access!");
          setState("claim-offer");
          return;
        }
        throw new Error(data.error || "Failed to analyze website");
      }

      const data = await response.json();
      setAnalysisData(data);

      // Map to improvements
      const mappedImprovements = mapChecksToImprovements(data.checks);
      setImprovements(mappedImprovements);

      setState("results");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to analyze website. Please try again.");
      setState("idle");
    }
  }, [url]);

  // Handle paste event to auto-trigger analysis
  const handlePaste = useCallback(
    (e: React.ClipboardEvent<HTMLInputElement>) => {
      const pastedText = e.clipboardData.getData("text").trim();
      if (isValidUrl(pastedText)) {
        setUrl(pastedText);
        // Small delay to let the input update visually
        setTimeout(() => handleAnalyze(pastedText), 100);
      }
    },
    [handleAnalyze]
  );

  // Handle lead capture submission
  const handleLeadSubmit = async (data: { email: string; name: string; phone?: string }) => {
    const response = await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: data.email,
        name: data.name,
        phone: data.phone,
        source: "url-analyzer",
        websiteUrl: url,
        analysisData: analysisData
          ? {
              score: analysisData.overallScore,
              improvements: getTotalImprovements(improvements),
            }
          : undefined,
      }),
    });

    if (!response.ok) {
      const responseData = await response.json();
      throw new Error(responseData.error || "Failed to submit");
    }

    setState("success");
  };

  // Get score color
  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-500";
    if (score >= 50) return "text-amber-500";
    return "text-red-500";
  };

  const totalIssues = improvements.filter((i) => i.score < 70).length;
  const criticalIssues = improvements.filter((i) => i.severity === "critical").length;
  const warningIssues = improvements.filter((i) => i.severity === "warning").length;

  // Get dynamic message based on score
  const scoreMessage = analysisData ? getScoreBasedMessage(analysisData.overallScore) : null;

  // Reset to start
  const handleReset = () => {
    setState("idle");
    setUrl("");
    setAnalysisData(null);
    setImprovements([]);
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* URL Input Section */}
      {(state === "idle" || state === "loading") && (
        <Card variant="glass" className="p-6 md:p-8">
          <div className="space-y-4">
            {/* Input with icon */}
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                <LinkIcon className="h-5 w-5" />
              </div>
              <Input
                type="text"
                placeholder="Paste your website URL (e.g., mybusiness.com)"
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  setError("");
                }}
                onPaste={handlePaste}
                onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
                disabled={state === "loading"}
                className="h-14 pl-12 pr-4 text-lg border-2 border-gray-200 focus:border-purple-400 rounded-xl transition-colors"
              />
            </div>

            {/* Error message */}
            {error && (
              <div className="flex items-center gap-2 text-red-600 text-sm">
                <AlertCircle className="h-4 w-4" />
                <span>{error}</span>
              </div>
            )}

            {/* Analyze button */}
            <Button
              onClick={() => handleAnalyze()}
              disabled={state === "loading" || !url.trim()}
              size="xl"
              className="w-full h-14 text-lg bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg shadow-blue-500/25 hover:shadow-xl transition-all duration-300"
            >
              {state === "loading" ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  {scanMessage}
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-5 w-5" />
                  Analyze My Site
                  <ArrowRight className="ml-2 h-5 w-5" />
                </>
              )}
            </Button>

            {/* Trust indicators */}
            <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-gray-500 pt-2">
              <span className="flex items-center gap-1">
                <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                Free instant analysis
              </span>
              <span className="flex items-center gap-1">
                <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                No signup required
              </span>
              <span className="flex items-center gap-1">
                <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                AI-powered insights
              </span>
            </div>
          </div>
        </Card>
      )}

      {/* Results Section (Redesigned) */}
      {state === "results" && analysisData && scoreMessage && (
        <div className="space-y-6">
          {/* Dynamic Headline Card */}
          <Card variant="glass" className="p-6">
            <div className="text-center">
              <div className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-100 to-blue-100 rounded-full px-4 py-1.5 mb-4">
                <Sparkles className="h-4 w-4 text-purple-600" />
                <span className="text-sm font-medium text-purple-700">Analysis Complete</span>
              </div>

              {/* Dynamic headline based on score */}
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
                {scoreMessage.headline}
              </h2>
              <p className="text-gray-600 mb-4">{scoreMessage.subheadline}</p>

              <p className="text-gray-500 text-sm">
                <span className="font-mono bg-gray-100 px-2 py-1 rounded">
                  {analysisData.url.replace(/^https?:\/\//, "")}
                </span>
              </p>

              {/* Score display */}
              <div className="flex items-center justify-center gap-8 py-4 mt-4">
                <div className="text-center">
                  <div className={cn("text-5xl font-bold", getScoreColor(analysisData.overallScore))}>
                    {analysisData.overallScore}
                  </div>
                  <div className="text-sm text-gray-500 mt-1">Overall Score</div>
                </div>
                <div className="h-16 w-px bg-gray-200" />
                <div className="text-center">
                  <div className="text-5xl font-bold text-red-500">{totalIssues}</div>
                  <div className="text-sm text-gray-500 mt-1">Issues Found</div>
                </div>
              </div>
            </div>
          </Card>

          {/* Revenue Impact Card */}
          <RevenueImpact score={analysisData.overallScore} issueCount={totalIssues} />

          {/* Condensed Issue Summary - Only Critical and Warning */}
          {(criticalIssues > 0 || warningIssues > 0) && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Key Issues Identified</h3>
              <ImprovementGrid
                improvements={improvements.filter((i) => i.severity !== "info")}
                compact
                showBusinessImpact={false}
              />
            </div>
          )}

          {/* Transformation CTA Card */}
          <Card className="p-6 md:p-8 bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 border-0 text-center relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRjMC0yIDItNCAyLTRzLTItMi00LTJoLThjLTIgMC00IDItNCAyczIgNCAyIDRIMjB2NGMwIDIgMiA0IDIgNHMyLTIgMi00di00aDhjMiAwIDQtMiA0LTJzLTItMi0yLTRWMzR6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-30" />

            <div className="relative">
              <h3 className="text-xl md:text-2xl font-bold text-white mb-2">
                See What Your Site Could Look Like
              </h3>
              <p className="text-blue-100 mb-6 max-w-lg mx-auto">
                We&apos;ll rebuild it with AI-powered features - completely free. No catch.
              </p>
              <Button
                onClick={() => setState("solution-preview")}
                size="xl"
                className="bg-white text-blue-600 hover:bg-blue-50 shadow-lg"
              >
                <Eye className="mr-2 h-5 w-5" />
                Preview My Upgraded Site
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </Card>

          {/* Analyze another link */}
          <div className="text-center">
            <button
              type="button"
              onClick={handleReset}
              className="text-sm text-gray-500 hover:text-purple-600 underline underline-offset-4"
            >
              Analyze a different website
            </button>
          </div>
        </div>
      )}

      {/* Solution Preview Section */}
      {state === "solution-preview" && analysisData && (
        <div className="space-y-6">
          <SolutionPreview
            currentScore={analysisData.overallScore}
            improvements={improvements}
            onClaimOffer={() => setState("claim-offer")}
          />

          {/* Back to results */}
          <div className="text-center">
            <button
              type="button"
              onClick={() => setState("results")}
              className="text-sm text-gray-500 hover:text-purple-600 underline underline-offset-4"
            >
              Back to results
            </button>
          </div>
        </div>
      )}

      {/* Claim Offer Section (Enhanced Lead Capture) */}
      {state === "claim-offer" && (
        <div className="space-y-6">
          <ClaimOfferForm
            issueCount={totalIssues}
            onSubmit={handleLeadSubmit}
            onBack={analysisData ? () => setState("solution-preview") : undefined}
          />
        </div>
      )}

      {/* Success State (Enhanced) */}
      {state === "success" && (
        <Card variant="glass" className="p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 mb-6">
              <PartyPopper className="h-10 w-10 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">
              Your Free Website is Queued!
            </h3>
            <p className="text-gray-600 max-w-md mx-auto">
              Our team is excited to transform your website. Here&apos;s what happens next:
            </p>
          </div>

          {/* Timeline */}
          <div className="max-w-md mx-auto mb-8">
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-6 top-8 bottom-8 w-0.5 bg-gradient-to-b from-blue-500 to-purple-500" />

              {/* Timeline items */}
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 relative z-10">
                    <Clock className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="pt-2">
                    <h4 className="font-semibold text-gray-900">Site Review</h4>
                    <p className="text-sm text-gray-600">Our team reviews your current site</p>
                    <span className="text-xs text-blue-600 font-medium">1-2 days</span>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0 relative z-10">
                    <Sparkles className="h-5 w-5 text-purple-600" />
                  </div>
                  <div className="pt-2">
                    <h4 className="font-semibold text-gray-900">Design & Build</h4>
                    <p className="text-sm text-gray-600">We design your new AI-powered site</p>
                    <span className="text-xs text-purple-600 font-medium">2-3 days</span>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 relative z-10">
                    <CheckCircle className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div className="pt-2">
                    <h4 className="font-semibold text-gray-900">Review & Approve</h4>
                    <p className="text-sm text-gray-600">You review and we make adjustments</p>
                    <span className="text-xs text-emerald-600 font-medium">1-2 days</span>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center flex-shrink-0 relative z-10">
                    <Rocket className="h-5 w-5 text-white" />
                  </div>
                  <div className="pt-2">
                    <h4 className="font-semibold text-gray-900">Go Live!</h4>
                    <p className="text-sm text-gray-600">Your new website launches</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button onClick={handleReset} variant="outline" size="lg">
              Analyze another site
            </Button>
            <Button asChild size="lg" className="bg-gradient-to-r from-blue-600 to-purple-600">
              <a href="/book" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Book a 15-min Kickoff Call
              </a>
            </Button>
          </div>

          <p className="text-xs text-center text-gray-500 mt-4">
            Questions? We&apos;ll be in touch within 24 hours.
          </p>
        </Card>
      )}
    </div>
  );
}
