"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  Check,
  ArrowRight,
  Mail,
  User,
  Phone,
  AlertCircle,
  Sparkles,
  Gift,
} from "lucide-react";

interface ClaimOfferFormProps {
  issueCount: number;
  onSubmit: (data: { email: string; name: string; phone?: string }) => Promise<void>;
  onBack?: () => void;
  className?: string;
}

interface ValueItem {
  label: string;
  value: string;
}

const valueItems: ValueItem[] = [
  { label: "Complete website rebuild", value: "$2,500+" },
  { label: "AI chatbot integration", value: "$500+" },
  { label: "Mobile optimization", value: "$400+" },
  { label: "SEO best practices", value: "$300+" },
];

export function ClaimOfferForm({
  issueCount,
  onSubmit,
  onBack,
  className,
}: ClaimOfferFormProps) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email.trim()) {
      setError("Please enter your email");
      return;
    }

    if (!name.trim()) {
      setError("Please enter your name");
      return;
    }

    setIsSubmitting(true);

    try {
      await onSubmit({
        email: email.trim(),
        name: name.trim(),
        phone: phone.trim() || undefined,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card variant="glass" className={cn("p-6 md:p-8", className)}>
      {/* Progress Indicator */}
      <div className="mb-6">
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="font-medium text-gray-700">Step 3 of 3: Claim Your Free Website</span>
          <span className="text-gray-500">80%</span>
        </div>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-500"
            style={{ width: "80%" }}
          />
        </div>
      </div>

      {/* Header */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 mb-4">
          <Gift className="h-8 w-8 text-white" />
        </div>
        <h3 className="text-2xl font-bold text-gray-900 mb-2">
          Claim Your Free Website
        </h3>
        <p className="text-gray-600">
          Just tell us where to send it and we&apos;ll get started on your transformation
        </p>
      </div>

      {/* Value List */}
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 mb-6 border border-green-200">
        <h4 className="text-sm font-semibold text-green-800 mb-3 flex items-center gap-2">
          <Sparkles className="h-4 w-4" />
          What you&apos;ll get (free):
        </h4>
        <ul className="space-y-2">
          {valueItems.map((item, index) => (
            <li key={index} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                <span className="text-sm text-green-800">{item.label}</span>
              </div>
              <span className="text-xs text-green-600 font-medium">Value: {item.value}</span>
            </li>
          ))}
          <li className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
              <span className="text-sm text-green-800">All {issueCount} issues fixed</span>
            </div>
            <span className="text-xs text-green-600 font-medium">Included</span>
          </li>
        </ul>
        <div className="mt-3 pt-3 border-t border-green-200 flex items-center justify-between">
          <span className="text-sm font-semibold text-green-800">Total Value</span>
          <span className="text-lg font-bold text-green-600">$3,700+</span>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="relative">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
            <Mail className="h-5 w-5" />
          </div>
          <Input
            type="email"
            placeholder="Your email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-12 pl-12 border-2 border-gray-200 focus:border-purple-400 rounded-xl"
            required
            disabled={isSubmitting}
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-gray-400">
            Required
          </span>
        </div>

        <div className="relative">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
            <User className="h-5 w-5" />
          </div>
          <Input
            type="text"
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-12 pl-12 border-2 border-gray-200 focus:border-purple-400 rounded-xl"
            required
            disabled={isSubmitting}
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-gray-400">
            Required
          </span>
        </div>

        <div className="relative">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
            <Phone className="h-5 w-5" />
          </div>
          <Input
            type="tel"
            placeholder="Phone number (optional)"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="h-12 pl-12 border-2 border-gray-200 focus:border-purple-400 rounded-xl"
            disabled={isSubmitting}
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-gray-400">
            Optional
          </span>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-red-600 text-sm">
            <AlertCircle className="h-4 w-4" />
            <span>{error}</span>
          </div>
        )}

        <Button
          type="submit"
          size="xl"
          disabled={isSubmitting}
          className="w-full h-14 text-lg bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
        >
          {isSubmitting ? (
            <>Processing...</>
          ) : (
            <>
              Build My Free Website
              <ArrowRight className="ml-2 h-5 w-5" />
            </>
          )}
        </Button>

        <p className="text-xs text-center text-gray-500">
          After your free build: optional $79/mo for hosting & management
        </p>
      </form>

      {/* Back button */}
      {onBack && (
        <div className="text-center mt-4">
          <button
            onClick={onBack}
            className="text-sm text-gray-500 hover:text-purple-600 underline underline-offset-4"
            disabled={isSubmitting}
          >
            Back to preview
          </button>
        </div>
      )}
    </Card>
  );
}
