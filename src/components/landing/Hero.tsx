"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, Star, Rocket, CheckCircle } from "lucide-react";
import { ScrollAnimation } from "@/components/ui/scroll-animation";
import { UrlAnalyzer } from "./UrlAnalyzer";

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100 pt-24 pb-16 md:pt-32 md:pb-24">
      {/* Animated background elements */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(59,130,246,0.25),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(16,185,129,0.2),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(139,92,246,0.15),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(236,72,153,0.15),transparent_40%)]" />
      </div>

      {/* Floating decorative elements - More prominent */}
      <div className="absolute top-16 left-10 float opacity-40">
        <div className="h-32 w-32 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 blur-2xl" />
      </div>
      <div className="absolute top-20 right-10 float opacity-40" style={{ animationDelay: "2s" }}>
        <div className="h-40 w-40 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-500 blur-2xl" />
      </div>
      <div className="absolute bottom-10 left-1/4 float opacity-35" style={{ animationDelay: "4s" }}>
        <div className="h-36 w-36 rounded-full bg-gradient-to-br from-pink-400 to-orange-400 blur-2xl" />
      </div>
      <div className="absolute bottom-20 right-1/4 float opacity-30" style={{ animationDelay: "3s" }}>
        <div className="h-28 w-28 rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 blur-2xl" />
      </div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 float opacity-20" style={{ animationDelay: "1s" }}>
        <div className="h-64 w-64 rounded-full bg-gradient-to-br from-violet-400 to-indigo-500 blur-3xl" />
      </div>

      <div className="container mx-auto px-4 md:px-6">
        <div className="mx-auto max-w-4xl text-center">
          {/* Badge */}
          <ScrollAnimation animation="fade-scale" delay={0}>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-purple-200 bg-gradient-to-r from-purple-100 to-blue-100 px-4 py-1.5 text-sm font-medium text-purple-700 shadow-sm">
              <Sparkles className="h-4 w-4 text-purple-500" />
              <span>Free Website Analysis</span>
              <Star className="h-4 w-4 text-yellow-500 fill-yellow-400" />
            </div>
          </ScrollAnimation>

          {/* Headline */}
          <ScrollAnimation animation="fade-up" delay={100}>
            <h1 className="mb-6 text-4xl font-bold tracking-tight text-gray-900 md:text-5xl lg:text-6xl">
              Discover What&apos;s{" "}
              <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-emerald-500 bg-clip-text text-transparent">
                Holding Your Website Back
              </span>
            </h1>
          </ScrollAnimation>

          {/* Subheadline */}
          <ScrollAnimation animation="fade-up" delay={200}>
            <p className="mx-auto mb-8 max-w-2xl text-lg text-gray-600 md:text-xl">
              Paste your URL below for an instant AI analysis. See exactly what&apos;s costing you
              customers and how we can fix it for free.
            </p>
          </ScrollAnimation>

          {/* URL Analyzer - The main CTA */}
          <ScrollAnimation animation="fade-up" delay={300}>
            <UrlAnalyzer />
          </ScrollAnimation>

          {/* Alternative CTA for users who prefer traditional flow */}
          <ScrollAnimation animation="fade-up" delay={400}>
            <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <span className="text-sm text-gray-500">Or skip the analysis:</span>
              <Link href="/questionnaire">
                <Button
                  variant="outline"
                  size="lg"
                  className="border-2 border-gray-300 hover:border-purple-400 hover:bg-purple-50 transition-all duration-300 btn-press"
                >
                  <Rocket className="mr-2 h-4 w-4" />
                  Get Your Free Website
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="#how-it-works">
                <Button
                  variant="ghost"
                  size="lg"
                  className="text-gray-600 hover:text-purple-600"
                >
                  See How It Works
                </Button>
              </Link>
            </div>
          </ScrollAnimation>

          {/* Trust indicators */}
          <ScrollAnimation animation="fade-up" delay={500}>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-6 text-sm text-gray-500">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-emerald-500" />
                <span>No credit card required</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-emerald-500" />
                <span>100% free to start</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-emerald-500" />
                <span>Launch in days</span>
              </div>
            </div>
          </ScrollAnimation>
        </div>
      </div>
    </section>
  );
}
