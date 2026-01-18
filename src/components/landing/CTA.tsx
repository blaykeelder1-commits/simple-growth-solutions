"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, Zap } from "lucide-react";
import { ScrollAnimation } from "@/components/ui/scroll-animation";

export function CTA() {
  return (
    <section className="relative overflow-hidden py-20 md:py-28">
      {/* Vibrant gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600" />

      {/* Animated overlay patterns */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.2),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(255,255,255,0.15),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_90%_10%,rgba(255,200,100,0.15),transparent_40%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_10%_90%,rgba(100,200,255,0.15),transparent_40%)]" />
      </div>

      {/* Floating decorative elements - More prominent */}
      <div className="absolute top-10 left-10 float opacity-40">
        <div className="h-28 w-28 rounded-full bg-white blur-2xl" />
      </div>
      <div className="absolute top-20 right-20 float opacity-35" style={{ animationDelay: "1s" }}>
        <div className="h-20 w-20 rounded-full bg-cyan-300 blur-2xl" />
      </div>
      <div className="absolute bottom-10 right-10 float opacity-35" style={{ animationDelay: "3s" }}>
        <div className="h-36 w-36 rounded-full bg-yellow-300 blur-2xl" />
      </div>
      <div className="absolute bottom-20 left-20 float opacity-30" style={{ animationDelay: "2s" }}>
        <div className="h-24 w-24 rounded-full bg-pink-300 blur-2xl" />
      </div>
      <div className="absolute top-1/2 left-1/4 float opacity-25" style={{ animationDelay: "4s" }}>
        <div className="h-32 w-32 rounded-full bg-emerald-300 blur-2xl" />
      </div>

      <div className="container relative mx-auto px-4 md:px-6">
        <div className="mx-auto max-w-3xl text-center">
          {/* Badge */}
          <ScrollAnimation animation="fade-scale">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-white/20 backdrop-blur-sm px-4 py-1.5 text-sm font-medium text-white">
              <Sparkles className="h-4 w-4" />
              <span>Limited Time Offer</span>
            </div>
          </ScrollAnimation>

          <ScrollAnimation animation="fade-up" delay={100}>
            <h2 className="mb-4 text-3xl font-bold tracking-tight text-white md:text-4xl lg:text-5xl">
              Ready to Get Started?
            </h2>
          </ScrollAnimation>
          <ScrollAnimation animation="fade-up" delay={200}>
            <p className="mb-8 text-lg text-white/90 md:text-xl">
              Join hundreds of businesses that have transformed their online
              presence. Your free website is just a few clicks away.
            </p>
          </ScrollAnimation>
          <ScrollAnimation animation="fade-up" delay={300}>
            <Link href="/questionnaire">
              <Button
                size="xl"
                className="group bg-white text-purple-700 hover:bg-gray-100 shadow-xl shadow-black/20 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 btn-press"
              >
                <Zap className="mr-2 h-5 w-5" />
                Start Your Free Website
                <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
          </ScrollAnimation>
          <ScrollAnimation animation="fade-up" delay={400}>
            <p className="mt-6 text-sm text-white/70">
              No commitment required • Takes less than 2 minutes
            </p>
          </ScrollAnimation>
        </div>
      </div>
    </section>
  );
}
