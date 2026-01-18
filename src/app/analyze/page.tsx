"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { Header, Footer } from "@/components/landing";
import { ReportCard } from "@/components/analyzer/ReportCard";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";

interface AnalysisData {
  overallScore: number;
  performance: number;
  mobile: number;
  seo: number;
  security: number;
  speed: number;
  accessibility: number;
  recommendations: string[];
}

function AnalyzeContent() {
  const searchParams = useSearchParams();
  const url = searchParams.get("url");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<AnalysisData | null>(null);

  useEffect(() => {
    async function fetchAnalysis() {
      if (!url) {
        setError("No URL provided");
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(
          `/api/analyze?url=${encodeURIComponent(url)}`
        );

        if (!response.ok) {
          throw new Error("Failed to analyze website");
        }

        const result = await response.json();
        setData(result);
      } catch {
        setError("Unable to analyze this website. Please try again later.");
      } finally {
        setLoading(false);
      }
    }

    fetchAnalysis();
  }, [url]);

  if (!url) {
    return (
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="mb-4 text-2xl font-bold">No URL Provided</h1>
        <p className="mb-6 text-muted-foreground">
          Please go back and submit a website URL to analyze.
        </p>
        <Link href="/questionnaire">
          <Button>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Questionnaire
          </Button>
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl text-center">
        <div className="mb-6 flex justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
        <h1 className="mb-4 text-2xl font-bold">Analyzing Your Website</h1>
        <p className="text-muted-foreground">
          We&apos;re scanning {url} for performance, SEO, security, and more...
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          This usually takes 15-30 seconds
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="mb-4 text-2xl font-bold text-destructive">
          Analysis Failed
        </h1>
        <p className="mb-6 text-muted-foreground">{error}</p>
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <Link href="/questionnaire">
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Try Again
            </Button>
          </Link>
          <Link href="/book">
            <Button>
              Book a Call Instead
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="mb-4 text-3xl font-bold tracking-tight md:text-4xl">
          Your Website Report Card
        </h1>
        <p className="text-lg text-muted-foreground">
          Here&apos;s how your website is performing across key metrics
        </p>
      </div>

      {/* Report Card */}
      {data && <ReportCard url={url} data={data} />}

      {/* CTA Section */}
      <div className="mt-10 rounded-2xl border bg-gradient-to-br from-primary/5 to-secondary/5 p-6 text-center md:p-8">
        <h2 className="mb-3 text-xl font-semibold">
          Want to Improve These Scores?
        </h2>
        <p className="mb-6 text-muted-foreground">
          Book a free consultation and we&apos;ll show you exactly how to fix
          these issues and boost your online presence.
        </p>
        <Link href="/book">
          <Button size="lg" className="group">
            Book Your Free Consultation
            <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
          </Button>
        </Link>
      </div>
    </div>
  );
}

export default function AnalyzePage() {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-gradient-to-b from-muted/30 to-background pt-24 pb-16">
        <div className="container mx-auto px-4 md:px-6">
          {/* Back link */}
          <Link
            href="/questionnaire"
            className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to questionnaire
          </Link>

          <Suspense
            fallback={
              <div className="mx-auto max-w-2xl text-center">
                <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
              </div>
            }
          >
            <AnalyzeContent />
          </Suspense>
        </div>
      </main>
      <Footer />
    </>
  );
}
