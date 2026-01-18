"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { leadFormSchema, LeadFormData, industries } from "@/lib/validations";
import { Loader2, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function LeadForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<LeadFormData>({
    resolver: zodResolver(leadFormSchema),
    defaultValues: {
      hasWebsite: "no",
      phone: "",
      websiteUrl: "",
    },
  });

  const hasWebsite = watch("hasWebsite");

  const onSubmit = async (data: LeadFormData) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error("Failed to submit form");
      }

      // If they have a website URL, go to analyze page
      if (data.hasWebsite === "yes" && data.websiteUrl) {
        router.push(`/analyze?url=${encodeURIComponent(data.websiteUrl)}`);
      } else {
        // Otherwise, go to booking page
        router.push("/book");
      }
    } catch {
      setError("Something went wrong. Please try again.");
      setIsSubmitting(false);
    }
  };

  const inputClassName =
    "w-full rounded-lg border border-input bg-background px-4 py-3 text-sm transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20";
  const labelClassName = "mb-2 block text-sm font-medium text-foreground";
  const errorClassName = "mt-1 text-sm text-destructive";

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Business Name */}
      <div>
        <label htmlFor="businessName" className={labelClassName}>
          Business Name *
        </label>
        <input
          id="businessName"
          type="text"
          placeholder="Your Business Name"
          className={cn(inputClassName, errors.businessName && "border-destructive")}
          {...register("businessName")}
        />
        {errors.businessName && (
          <p className={errorClassName}>{errors.businessName.message}</p>
        )}
      </div>

      {/* Contact Name */}
      <div>
        <label htmlFor="contactName" className={labelClassName}>
          Your Name *
        </label>
        <input
          id="contactName"
          type="text"
          placeholder="John Smith"
          className={cn(inputClassName, errors.contactName && "border-destructive")}
          {...register("contactName")}
        />
        {errors.contactName && (
          <p className={errorClassName}>{errors.contactName.message}</p>
        )}
      </div>

      {/* Email & Phone Row */}
      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <label htmlFor="email" className={labelClassName}>
            Email Address *
          </label>
          <input
            id="email"
            type="email"
            placeholder="john@example.com"
            className={cn(inputClassName, errors.email && "border-destructive")}
            {...register("email")}
          />
          {errors.email && (
            <p className={errorClassName}>{errors.email.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="phone" className={labelClassName}>
            Phone Number
          </label>
          <input
            id="phone"
            type="tel"
            placeholder="(555) 123-4567"
            className={cn(inputClassName, errors.phone && "border-destructive")}
            {...register("phone")}
          />
          {errors.phone && (
            <p className={errorClassName}>{errors.phone.message}</p>
          )}
        </div>
      </div>

      {/* Has Website */}
      <div>
        <label className={labelClassName}>Do you have a website? *</label>
        <div className="flex gap-4">
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="radio"
              value="yes"
              className="h-4 w-4 accent-primary"
              {...register("hasWebsite")}
            />
            <span className="text-sm">Yes</span>
          </label>
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="radio"
              value="no"
              className="h-4 w-4 accent-primary"
              {...register("hasWebsite")}
            />
            <span className="text-sm">No</span>
          </label>
        </div>
      </div>

      {/* Website URL (conditional) */}
      {hasWebsite === "yes" && (
        <div>
          <label htmlFor="websiteUrl" className={labelClassName}>
            Website URL
          </label>
          <input
            id="websiteUrl"
            type="url"
            placeholder="https://www.example.com"
            className={cn(inputClassName, errors.websiteUrl && "border-destructive")}
            {...register("websiteUrl")}
          />
          {errors.websiteUrl && (
            <p className={errorClassName}>{errors.websiteUrl.message}</p>
          )}
          <p className="mt-1 text-xs text-muted-foreground">
            We&apos;ll analyze your current website and provide a free report
          </p>
        </div>
      )}

      {/* Industry */}
      <div>
        <label htmlFor="industry" className={labelClassName}>
          Industry *
        </label>
        <select
          id="industry"
          className={cn(inputClassName, errors.industry && "border-destructive")}
          {...register("industry")}
        >
          <option value="">Select your industry</option>
          {industries.map((industry) => (
            <option key={industry} value={industry}>
              {industry}
            </option>
          ))}
        </select>
        {errors.industry && (
          <p className={errorClassName}>{errors.industry.message}</p>
        )}
      </div>

      {/* Challenges */}
      <div>
        <label htmlFor="challenges" className={labelClassName}>
          What challenges are you facing? *
        </label>
        <textarea
          id="challenges"
          rows={4}
          placeholder="Tell us about your business goals and any challenges you're facing with your online presence..."
          className={cn(inputClassName, errors.challenges && "border-destructive")}
          {...register("challenges")}
        />
        {errors.challenges && (
          <p className={errorClassName}>{errors.challenges.message}</p>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Submit Button */}
      <Button
        type="submit"
        size="lg"
        className="group w-full"
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Submitting...
          </>
        ) : (
          <>
            {hasWebsite === "yes" ? "Get Your Free Website Report" : "Book Your Free Consultation"}
            <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
          </>
        )}
      </Button>

      <p className="text-center text-xs text-muted-foreground">
        By submitting, you agree to receive communications from us. We respect your
        privacy and will never share your information.
      </p>
    </form>
  );
}
