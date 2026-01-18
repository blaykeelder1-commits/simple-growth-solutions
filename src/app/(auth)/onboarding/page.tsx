"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect } from "react";

type Step = "organization" | "products" | "complete";

interface ProductOption {
  id: string;
  name: string;
  description: string;
  price: string;
  priceNote?: string;
  features: string[];
}

const products: ProductOption[] = [
  {
    id: "website_management",
    name: "Website Management",
    description: "Professional websites built and managed for your business",
    price: "$79/mo",
    features: [
      "Custom website design",
      "Hosting & maintenance",
      "Monthly updates",
      "Analytics dashboard",
      "Priority support",
    ],
  },
  {
    id: "cashflow_ai",
    name: "Cash Flow AI",
    description: "Intelligent invoice tracking and cash flow optimization",
    price: "8% success fee",
    priceNote: "Only pay when we recover your money",
    features: [
      "Invoice tracking & reminders",
      "AI payment predictions",
      "Cash flow forecasting",
      "Automated follow-ups",
      "Recovery recommendations",
    ],
  },
  {
    id: "cybersecurity",
    name: "Cybersecurity Shield",
    description: "Protect your online presence from threats",
    price: "$39/mo",
    features: [
      "Weekly security scans",
      "SSL monitoring",
      "Vulnerability alerts",
      "Remediation guidance",
      "Security reports",
    ],
  },
  {
    id: "chauffeur",
    name: "Business Chauffeur",
    description: "AI-powered business intelligence and integrations",
    price: "$199/mo",
    features: [
      "POS integration",
      "Accounting sync",
      "Review monitoring",
      "Competitor analysis",
      "AI business insights",
    ],
  },
];

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

  const [orgData, setOrgData] = useState({
    name: "",
    industry: "",
  });

  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);

  // Redirect if not authenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  // Skip onboarding if user already has an organization
  useEffect(() => {
    if (session?.user?.organizationId) {
      router.push("/dashboard");
    }
  }, [session, router]);

  const handleOrgChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setOrgData((prev) => ({ ...prev, [name]: value }));
  };

  const toggleProduct = (productId: string) => {
    setSelectedProducts((prev) =>
      prev.includes(productId)
        ? prev.filter((id) => id !== productId)
        : [...prev, productId]
    );
  };

  const handleCreateOrganization = async () => {
    if (!orgData.name.trim()) {
      setError("Organization name is required");
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

      if (!response.ok) {
        throw new Error(data.error || "Failed to create organization");
      }

      // Update session with new organization ID
      await update({ organizationId: data.organization.id });

      setStep("products");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectProducts = async () => {
    if (selectedProducts.length === 0) {
      // Allow skipping product selection
      setStep("complete");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/onboarding/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ products: selectedProducts }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to set up products");
      }

      setStep("complete");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleComplete = () => {
    router.push("/dashboard");
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
      <div className="max-w-3xl mx-auto">
        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-center space-x-4">
            <StepIndicator
              step={1}
              label="Organization"
              isActive={step === "organization"}
              isComplete={step !== "organization"}
            />
            <div className="w-12 h-0.5 bg-gray-300" />
            <StepIndicator
              step={2}
              label="Products"
              isActive={step === "products"}
              isComplete={step === "complete"}
            />
            <div className="w-12 h-0.5 bg-gray-300" />
            <StepIndicator
              step={3}
              label="Complete"
              isActive={step === "complete"}
              isComplete={false}
            />
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        {/* Step 1: Organization */}
        {step === "organization" && (
          <div className="bg-white rounded-lg shadow-sm p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Set Up Your Organization
            </h2>
            <p className="text-gray-600 mb-6">
              Tell us about your business so we can personalize your experience.
            </p>

            <div className="space-y-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  Organization Name *
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  value={orgData.name}
                  onChange={handleOrgChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Your Business Name"
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
                className="w-full py-3 px-4 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? "Creating..." : "Continue"}
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Products */}
        {step === "products" && (
          <div className="bg-white rounded-lg shadow-sm p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Choose Your Services
            </h2>
            <p className="text-gray-600 mb-6">
              Select the services you want to get started with. You can add more later.
            </p>

            <div className="grid gap-4 sm:grid-cols-2">
              {products.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  isSelected={selectedProducts.includes(product.id)}
                  onToggle={() => toggleProduct(product.id)}
                />
              ))}
            </div>

            <div className="mt-8 flex gap-4">
              <button
                onClick={() => setStep("organization")}
                className="flex-1 py-3 px-4 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              >
                Back
              </button>
              <button
                onClick={handleSelectProducts}
                disabled={isLoading}
                className="flex-1 py-3 px-4 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading
                  ? "Setting up..."
                  : selectedProducts.length > 0
                  ? `Continue with ${selectedProducts.length} service${selectedProducts.length > 1 ? "s" : ""}`
                  : "Skip for now"}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Complete */}
        {step === "complete" && (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg
                className="w-8 h-8 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>

            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              You&apos;re All Set!
            </h2>
            <p className="text-gray-600 mb-8">
              Your organization has been created and your services are ready to go.
              Head to your dashboard to start growing your business.
            </p>

            <button
              onClick={handleComplete}
              className="py-3 px-8 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Go to Dashboard
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
        {isComplete ? (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          step
        )}
      </div>
      <span
        className={`mt-2 text-xs font-medium ${
          isActive ? "text-blue-600" : "text-gray-500"
        }`}
      >
        {label}
      </span>
    </div>
  );
}

function ProductCard({
  product,
  isSelected,
  onToggle,
}: {
  product: ProductOption;
  isSelected: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      onClick={onToggle}
      className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
        isSelected
          ? "border-blue-600 bg-blue-50"
          : "border-gray-200 hover:border-gray-300"
      }`}
    >
      <div className="flex items-start justify-between mb-2">
        <h3 className="font-semibold text-gray-900">{product.name}</h3>
        <div
          className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
            isSelected ? "bg-blue-600 border-blue-600" : "border-gray-300"
          }`}
        >
          {isSelected && (
            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          )}
        </div>
      </div>

      <p className="text-sm text-gray-600 mb-3">{product.description}</p>

      <div className="mb-3">
        <span className="text-lg font-bold text-blue-600">{product.price}</span>
        {product.priceNote && (
          <span className="block text-xs text-gray-500">{product.priceNote}</span>
        )}
      </div>

      <ul className="space-y-1">
        {product.features.slice(0, 3).map((feature, i) => (
          <li key={i} className="text-xs text-gray-600 flex items-center">
            <svg
              className="w-3 h-3 text-green-500 mr-1.5 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            {feature}
          </li>
        ))}
      </ul>
    </div>
  );
}
