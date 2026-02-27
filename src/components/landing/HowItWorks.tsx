"use client";

import { ClipboardList, Globe, Brain, ArrowDown } from "lucide-react";
import { ScrollAnimation } from "@/components/ui/scroll-animation";

const steps = [
  {
    number: "01",
    icon: ClipboardList,
    title: "Tell Us About Your Business",
    description:
      "Fill out a quick questionnaire about your goals, industry, and challenges. We'll analyze your current web presence for free.",
    color: "from-blue-500 to-cyan-500",
    bgColor: "bg-blue-100",
    textColor: "text-blue-600",
  },
  {
    number: "02",
    icon: Globe,
    title: "We Build Your Website — Free",
    description:
      "Our team designs and builds a professional website for your business at no cost. Add managed services starting at $49/mo when you're ready.",
    color: "from-purple-500 to-pink-500",
    bgColor: "bg-purple-100",
    textColor: "text-purple-600",
  },
  {
    number: "03",
    icon: Brain,
    title: "Grow with AI-Powered Tools",
    description:
      "Collect past-due invoices at 8%, get cash flow predictions, and let Geoffrey — your AI business mentor — guide smarter decisions with your real data.",
    color: "from-emerald-500 to-teal-500",
    bgColor: "bg-emerald-100",
    textColor: "text-emerald-600",
  },
];

export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="relative py-20 md:py-28 bg-gradient-to-br from-cyan-50 via-blue-100 to-indigo-100 overflow-hidden"
    >
      {/* Background decorations */}
      <div className="absolute inset-0">
        <div className="absolute -top-20 -right-20 h-96 w-96 rounded-full bg-gradient-to-br from-blue-300/40 to-cyan-300/40 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-96 w-96 rounded-full bg-gradient-to-br from-purple-300/40 to-pink-300/40 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-80 w-80 rounded-full bg-gradient-to-br from-emerald-300/30 to-teal-300/30 blur-3xl" />
        <div className="absolute top-20 left-1/4 h-64 w-64 rounded-full bg-gradient-to-br from-indigo-300/30 to-violet-300/30 blur-3xl" />
      </div>

      <div className="container relative mx-auto px-4 md:px-6">
        {/* Section header */}
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <ScrollAnimation animation="fade-scale">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-emerald-100 to-blue-100 px-4 py-1.5 text-sm font-medium text-emerald-700">
              Simple Process
            </div>
          </ScrollAnimation>
          <ScrollAnimation animation="fade-up" delay={100}>
            <h2 className="mb-4 text-3xl font-bold tracking-tight md:text-4xl bg-gradient-to-r from-gray-900 via-purple-800 to-blue-800 bg-clip-text text-transparent">
              How It Works
            </h2>
          </ScrollAnimation>
          <ScrollAnimation animation="fade-up" delay={200}>
            <p className="text-lg text-gray-600">
              Start with a free website, then layer on cash flow recovery and AI
              mentoring as your business grows.
            </p>
          </ScrollAnimation>
        </div>

        {/* Steps */}
        <div className="mx-auto max-w-5xl">
          <div className="grid gap-8 md:grid-cols-3">
            {steps.map((step, index) => (
              <ScrollAnimation key={step.number} animation="fade-up" delay={index * 150}>
                <div className="relative">
                  {/* Arrow connector (hidden on mobile) */}
                  {index < steps.length - 1 && (
                    <div className="absolute -right-4 top-1/2 z-10 hidden -translate-y-1/2 md:block">
                      <ArrowDown className="h-8 w-8 rotate-[-90deg] text-gray-300" />
                    </div>
                  )}

                  <div className="group h-full rounded-2xl border-2 border-gray-100 bg-white p-6 shadow-lg transition-all duration-300 hover:-translate-y-2 hover:shadow-xl card-animate digital-hover">
                    {/* Step number badge */}
                    <div className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${step.color} text-lg font-bold text-white shadow-lg`}>
                      {step.number}
                    </div>

                    {/* Icon */}
                    <div className={`mb-4 inline-flex rounded-xl ${step.bgColor} p-3 ${step.textColor}`}>
                      <step.icon className="h-6 w-6" />
                    </div>

                    <h3 className="mb-2 text-xl font-semibold text-gray-900">{step.title}</h3>
                    <p className="text-gray-600">{step.description}</p>
                  </div>
                </div>
              </ScrollAnimation>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
