"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

type Step = "organization" | "activate" | "complete";

const industries = [
  "Restaurant / Food Service",
  "Retail",
  "Professional Services",
  "Healthcare",
  "Construction",
  "Technology",
  "Manufacturing",
  "Real Estate",
  "Other",
];

export default function OnboardingPage() {
  const router = useRouter();
  const { data: session, status, update } = useSession();
  const [step, setStep] = useState<Step>("organization");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [orgData, setOrgData] = useState({ name: "", industry: "" });

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  // Skip onboarding if the user *arrived* with an org already (returning user).
  // We must NOT redirect once they create an org in-flow, otherwise they'd be
  // bounced before Step 2 ("Start my free build") ever renders.
  useEffect(() => {
    if (step === "organization" && session?.user?.organizationId) {
      router.push("/portal");
    }
    // intentionally only depends on step + org; once step advances we stay put
  }, [step, session?.user?.organizationId, router]);

  const handleOrgChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setOrgData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCreateOrganization = async () => {
    if (!orgData.name.trim()) {
      setError("Business name is required");
      return;
    }
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/onboarding/organization", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orgData),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to create organization");

      await update({ organizationId: data.organization.id, role: "owner" });
      setStep("activate");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  // The "free build" path: mark the org as entering the website-build stage
  // (no trial subscription — the build is free and billing starts at go-live),
  // then drop them straight into the project intake form. This matches the
  // funnel: free analyzer → free build → founding/managed plan at go-live.
  const handleStartFreeBuild = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/onboarding/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ products: ["website_managed"] }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to start free build");
      router.push("/portal/projects/new");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setIsLoading(false);
    }
  };

  const handleExploreLater = () => {
    router.push("/portal");
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8 flex items-center justify-center space-x-4">
          <StepIndicator step={1} label="Your business" isActive={step === "organization"} isComplete={step !== "organization"} />
          <div className="w-12 h-0.5 bg-gray-300" />
          <StepIndicator step={2} label="Free build" isActive={step === "activate"} isComplete={step === "complete"} />
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        {step === "organization" && (
          <div className="bg-white rounded-lg shadow-sm p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Tell us about your business</h2>
            <p className="text-gray-600 mb-6">
              Just two quick details so we can personalize your free website.
            </p>

            <div className="space-y-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  Business Name *
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  value={orgData.name}
                  onChange={handleOrgChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Acme Co."
                />
              </div>

              <div>
                <label htmlFor="industry" className="block text-sm font-medium text-gray-700 mb-1">
                  Industry
                </label>
                <select
                  id="industry"
                  name="industry"
                  value={orgData.industry}
                  onChange={handleOrgChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select an industry</option>
                  {industries.map((industry) => (
                    <option key={industry} value={industry}>
                      {industry}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={handleCreateOrganization}
                disabled={isLoading}
                className="w-full py-3 px-4 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {isLoading ? "Saving..." : "Continue"}
              </button>
            </div>
          </div>
        )}

        {step === "activate" && (
          <div className="bg-white rounded-lg shadow-sm p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Start with your free website</h2>
            <p className="text-gray-600 mb-6">
              We&apos;ll build the first draft for free. You only pay for hosting and updates after
              you&apos;re happy with it.
            </p>

            <ul className="space-y-3 mb-8 text-sm text-gray-700">
              <li className="flex items-start gap-3">
                <Check />
                <span>Custom design tailored to your business</span>
              </li>
              <li className="flex items-start gap-3">
                <Check />
                <span>Mobile-responsive and SEO-ready out of the gate</span>
              </li>
              <li className="flex items-start gap-3">
                <Check />
                <span>Go live whenever you&apos;re ready — hosting, updates &amp; change requests from $29/mo founding rate</span>
              </li>
              <li className="flex items-start gap-3">
                <Check />
                <span>No card required to start your build. You only pay once your site goes live.</span>
              </li>
            </ul>

            <button
              onClick={handleStartFreeBuild}
              disabled={isLoading}
              className="w-full py-3 px-4 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? "Setting up..." : "Start my free build"}
            </button>

            <button
              onClick={handleExploreLater}
              disabled={isLoading}
              className="w-full mt-3 py-2 text-sm text-gray-600 hover:text-gray-900"
            >
              I&apos;ll explore on my own first
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function StepIndicator({
  step,
  label,
  isActive,
  isComplete,
}: {
  step: number;
  label: string;
  isActive: boolean;
  isComplete: boolean;
}) {
  return (
    <div className="flex flex-col items-center">
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
          isComplete
            ? "bg-green-600 text-white"
            : isActive
            ? "bg-blue-600 text-white"
            : "bg-gray-200 text-gray-600"
        }`}
      >
        {isComplete ? <Check className="w-4 h-4" /> : step}
      </div>
      <span className={`mt-2 text-xs font-medium ${isActive ? "text-blue-600" : "text-gray-500"}`}>
        {label}
      </span>
    </div>
  );
}

function Check({ className = "w-5 h-5 text-green-600 flex-shrink-0" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
}
