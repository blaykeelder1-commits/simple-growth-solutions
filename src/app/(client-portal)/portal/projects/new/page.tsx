"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";

const projectSchema = z.object({
  projectName: z.string().min(2, "Project name is required"),
  projectType: z.enum(["new_build", "redesign", "migration"]),
  existingUrl: z.string().url().optional().or(z.literal("")),
  targetAudience: z.string().optional(),
  desiredFeatures: z.array(z.string()),
  designPreferences: z.object({
    style: z.string().optional(),
    colors: z.string().optional(),
    references: z.string().optional(),
  }),
  additionalNotes: z.string().optional(),
});

type ProjectFormData = z.infer<typeof projectSchema>;

const featureOptions = [
  { id: "responsive", label: "Mobile Responsive Design" },
  { id: "contact_form", label: "Contact Form" },
  { id: "blog", label: "Blog / News Section" },
  { id: "ecommerce", label: "E-commerce / Online Store" },
  { id: "booking", label: "Appointment Booking" },
  { id: "gallery", label: "Photo/Video Gallery" },
  { id: "testimonials", label: "Testimonials / Reviews" },
  { id: "social_integration", label: "Social Media Integration" },
  { id: "newsletter", label: "Newsletter Signup" },
  { id: "analytics", label: "Analytics Dashboard" },
  { id: "seo", label: "SEO Optimization" },
  { id: "chat", label: "Live Chat Widget" },
];

const styleOptions = [
  { value: "modern", label: "Modern & Minimalist" },
  { value: "professional", label: "Professional & Corporate" },
  { value: "creative", label: "Creative & Bold" },
  { value: "elegant", label: "Elegant & Sophisticated" },
  { value: "friendly", label: "Friendly & Approachable" },
  { value: "other", label: "Other (describe below)" },
];

export default function NewProjectPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([
    "responsive",
    "contact_form",
    "seo",
  ]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<ProjectFormData>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      projectType: "new_build",
      desiredFeatures: ["responsive", "contact_form", "seo"],
      designPreferences: {},
    },
  });

  const projectType = watch("projectType");

  const toggleFeature = (featureId: string) => {
    setSelectedFeatures((prev) => {
      const newFeatures = prev.includes(featureId)
        ? prev.filter((f) => f !== featureId)
        : [...prev, featureId];
      setValue("desiredFeatures", newFeatures);
      return newFeatures;
    });
  };

  const onSubmit = async (data: ProjectFormData) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          desiredFeatures: selectedFeatures,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to create project");
      }

      const result = await response.json();
      router.push(`/portal/projects/${result.project.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/portal/projects">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Request Your Free Website Build</CardTitle>
          <CardDescription>
            Tell us about your project and we&apos;ll create a professional
            website tailored to your business needs.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Project basics */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="projectName">Project Name *</Label>
                <Input
                  id="projectName"
                  placeholder="e.g., My Business Website"
                  {...register("projectName")}
                />
                {errors.projectName && (
                  <p className="text-sm text-red-500 mt-1">
                    {errors.projectName.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="projectType">Project Type *</Label>
                <Select
                  value={projectType}
                  onValueChange={(value) =>
                    setValue("projectType", value as ProjectFormData["projectType"])
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select project type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new_build">
                      New Website Build (no existing site)
                    </SelectItem>
                    <SelectItem value="redesign">
                      Website Redesign (improve existing site)
                    </SelectItem>
                    <SelectItem value="migration">
                      Website Migration (move to new platform)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {(projectType === "redesign" || projectType === "migration") && (
                <div>
                  <Label htmlFor="existingUrl">Existing Website URL</Label>
                  <Input
                    id="existingUrl"
                    placeholder="https://www.example.com"
                    {...register("existingUrl")}
                  />
                  {errors.existingUrl && (
                    <p className="text-sm text-red-500 mt-1">
                      {errors.existingUrl.message}
                    </p>
                  )}
                </div>
              )}

              <div>
                <Label htmlFor="targetAudience">Target Audience</Label>
                <Input
                  id="targetAudience"
                  placeholder="e.g., Local homeowners aged 30-55"
                  {...register("targetAudience")}
                />
                <p className="text-sm text-gray-500 mt-1">
                  Who are your ideal customers?
                </p>
              </div>
            </div>

            {/* Features */}
            <div>
              <Label className="mb-3 block">Desired Features</Label>
              <div className="grid grid-cols-2 gap-3">
                {featureOptions.map((feature) => (
                  <div
                    key={feature.id}
                    className="flex items-center space-x-2"
                  >
                    <Checkbox
                      id={feature.id}
                      checked={selectedFeatures.includes(feature.id)}
                      onCheckedChange={() => toggleFeature(feature.id)}
                    />
                    <label
                      htmlFor={feature.id}
                      className="text-sm cursor-pointer"
                    >
                      {feature.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Design preferences */}
            <div className="space-y-4">
              <Label className="block">Design Preferences</Label>

              <div>
                <Label htmlFor="style" className="text-sm text-gray-600">
                  Preferred Style
                </Label>
                <Select
                  onValueChange={(value) =>
                    setValue("designPreferences.style", value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a style" />
                  </SelectTrigger>
                  <SelectContent>
                    {styleOptions.map((style) => (
                      <SelectItem key={style.value} value={style.value}>
                        {style.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="colors" className="text-sm text-gray-600">
                  Brand Colors
                </Label>
                <Input
                  id="colors"
                  placeholder="e.g., Blue and white, or #1a73e8"
                  {...register("designPreferences.colors")}
                />
              </div>

              <div>
                <Label htmlFor="references" className="text-sm text-gray-600">
                  Reference Websites
                </Label>
                <Textarea
                  id="references"
                  placeholder="Share URLs of websites you like..."
                  {...register("designPreferences.references")}
                />
              </div>
            </div>

            {/* Additional notes */}
            <div>
              <Label htmlFor="additionalNotes">Additional Notes</Label>
              <Textarea
                id="additionalNotes"
                placeholder="Anything else we should know about your project?"
                rows={4}
                {...register("additionalNotes")}
              />
            </div>

            {/* Error message */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                {error}
              </div>
            )}

            {/* Submit */}
            <div className="flex justify-end gap-3">
              <Link href="/portal/projects">
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </Link>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Submit Project Request
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
