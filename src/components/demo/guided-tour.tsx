"use client";

import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DEMO_TOUR_STEPS,
  formatRemainingTime,
  getDemoSession,
} from "@/lib/demo/demo-mode";

interface GuidedTourProps {
  sessionStartTime: Date;
  onComplete: () => void;
  onSkip: () => void;
}

export function GuidedTour({ sessionStartTime, onComplete, onSkip }: GuidedTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const [remainingTime, setRemainingTime] = useState<string>("");
  const [highlightedElement, setHighlightedElement] = useState<Element | null>(null);

  const step = DEMO_TOUR_STEPS[currentStep];
  const isLastStep = currentStep === DEMO_TOUR_STEPS.length - 1;
  const progress = ((currentStep + 1) / DEMO_TOUR_STEPS.length) * 100;

  // Update remaining time
  useEffect(() => {
    const interval = setInterval(() => {
      const session = getDemoSession(sessionStartTime);
      setRemainingTime(formatRemainingTime(session.remainingMs));

      if (session.isExpired) {
        onComplete();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [sessionStartTime, onComplete]);

  // Highlight target element
  useEffect(() => {
    if (step.target) {
      const element = document.querySelector(step.target);
      if (element) {
        setHighlightedElement(element);
        element.scrollIntoView({ behavior: "smooth", block: "center" });
        element.classList.add("tour-highlight");
      }
    }

    return () => {
      if (highlightedElement) {
        highlightedElement.classList.remove("tour-highlight");
      }
    };
  }, [step, highlightedElement]);

  const handleNext = useCallback(() => {
    if (highlightedElement) {
      highlightedElement.classList.remove("tour-highlight");
    }

    if (isLastStep) {
      onComplete();
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  }, [isLastStep, onComplete, highlightedElement]);

  const handlePrevious = useCallback(() => {
    if (highlightedElement) {
      highlightedElement.classList.remove("tour-highlight");
    }

    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  }, [currentStep, highlightedElement]);

  const handleSkipTour = useCallback(() => {
    if (highlightedElement) {
      highlightedElement.classList.remove("tour-highlight");
    }
    onSkip();
  }, [onSkip, highlightedElement]);

  if (!isVisible) return null;

  return (
    <>
      {/* Tour overlay */}
      <div className="fixed inset-0 bg-black/40 z-40 pointer-events-none" />

      {/* Tour card */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-lg px-4">
        <Card className="bg-white shadow-2xl border-0 overflow-hidden">
          {/* Progress bar */}
          <div className="h-1 bg-gray-200">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-6 py-3 border-b bg-gray-50">
            <div className="flex items-center gap-3">
              <Badge className="bg-blue-100 text-blue-700">
                Step {currentStep + 1} of {DEMO_TOUR_STEPS.length}
              </Badge>
              <span className="text-sm text-gray-500">
                Demo expires in {remainingTime}
              </span>
            </div>
            <button
              onClick={() => setIsVisible(false)}
              className="text-gray-400 hover:text-gray-600"
              aria-label="Minimize tour"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="px-6 py-5">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {step.title}
            </h3>
            <p className="text-gray-600 text-sm leading-relaxed">
              {step.description}
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between px-6 py-4 bg-gray-50 border-t">
            <button
              onClick={handleSkipTour}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Skip tour
            </button>

            <div className="flex gap-3">
              {currentStep > 0 && (
                <Button
                  variant="outline"
                  onClick={handlePrevious}
                  className="px-4"
                >
                  Previous
                </Button>
              )}
              <Button
                onClick={handleNext}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 px-6"
              >
                {isLastStep ? "Get Started" : "Next"}
              </Button>
            </div>
          </div>
        </Card>
      </div>

      {/* Minimized tour button */}
      {!isVisible && (
        <button
          onClick={() => setIsVisible(true)}
          className="fixed bottom-6 right-6 z-50 bg-blue-600 text-white p-4 rounded-full shadow-lg hover:bg-blue-700 transition-colors"
          aria-label="Show tour"
        >
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>
      )}

      {/* Tour highlight styles */}
      <style jsx global>{`
        .tour-highlight {
          position: relative;
          z-index: 45;
          box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.5), 0 0 20px rgba(59, 130, 246, 0.3);
          border-radius: 8px;
          transition: box-shadow 0.3s ease;
        }
      `}</style>
    </>
  );
}

// Session timer component
interface SessionTimerProps {
  sessionStartTime: Date;
  onExpire: () => void;
}

export function SessionTimer({ sessionStartTime, onExpire }: SessionTimerProps) {
  const [remainingTime, setRemainingTime] = useState<string>("");
  const [isWarning, setIsWarning] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      const session = getDemoSession(sessionStartTime);
      setRemainingTime(formatRemainingTime(session.remainingMs));

      // Warning when less than 2 minutes
      setIsWarning(session.remainingMs < 2 * 60 * 1000);

      if (session.isExpired) {
        onExpire();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [sessionStartTime, onExpire]);

  return (
    <div
      className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
        isWarning
          ? "bg-red-100 text-red-700 animate-pulse"
          : "bg-gray-100 text-gray-700"
      }`}
    >
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <span>Demo: {remainingTime}</span>
    </div>
  );
}

// Demo banner component
interface DemoBannerProps {
  onSignUp: () => void;
}

export function DemoBanner({ onSignUp }: DemoBannerProps) {
  return (
    <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-2">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Badge className="bg-white/20 text-white">Demo Mode</Badge>
          <span className="text-sm">
            You&apos;re viewing sample data. Sign up to connect your real business.
          </span>
        </div>
        <Button
          onClick={onSignUp}
          className="bg-white text-blue-600 hover:bg-gray-100"
          size="sm"
        >
          Start Free Trial
        </Button>
      </div>
    </div>
  );
}

// Demo expired modal
interface DemoExpiredModalProps {
  onSignUp: () => void;
  onRestart: () => void;
}

export function DemoExpiredModal({ onSignUp, onRestart }: DemoExpiredModalProps) {
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <Card className="max-w-md w-full bg-white p-8 text-center">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="h-8 w-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>

        <h2 className="text-2xl font-bold text-gray-900 mb-3">
          Demo Session Ended
        </h2>
        <p className="text-gray-600 mb-6">
          Thank you for exploring Business Chauffeur! Ready to see what we can do with your real data?
        </p>

        <div className="space-y-3">
          <Button
            onClick={onSignUp}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
          >
            Start Free Trial
          </Button>
          <Button
            onClick={onRestart}
            variant="outline"
            className="w-full"
          >
            Restart Demo
          </Button>
        </div>

        <p className="text-xs text-gray-500 mt-6">
          No credit card required. 14-day free trial.
        </p>
      </Card>
    </div>
  );
}

export default GuidedTour;
