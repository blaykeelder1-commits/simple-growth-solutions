"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
import { ArrowLeft, Loader2, Zap } from "lucide-react";
import Link from "next/link";

const requestSchema = z.object({
  projectId: z.string().min(1, "Please select a project"),
  title: z.string().min(5, "Title must be at least 5 characters"),
  description: z.string().min(20, "Please provide more details"),
  type: z.enum(["feature", "bug", "content", "design"]),
  priority: z.enum(["low", "normal", "high", "urgent"]),
  rushDelivery: z.boolean(),
});

type RequestFormData = z.infer<typeof requestSchema>;

interface Project {
  id: string;
  projectName: string;
}

function NewChangeRequestContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedProjectId = searchParams.get("projectId");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [activePlan, setActivePlan] = useState<string | null>(null);
  const [hasManagedSub, setHasManagedSub] = useState<boolean | null>(null);
  const [quota, setQuota] = useState<{
    used: number;
    included: number;
    remaining: number;
    planLabel: string;
    periodEndsAt: string | null;
    overageFeeCents: number;
  } | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<RequestFormData>({
    resolver: zodResolver(requestSchema),
    defaultValues: {
      projectId: preselectedProjectId || "",
      type: "feature",
      priority: "normal",
      rushDelivery: false,
    },
  });

  useEffect(() => {
    async function fetchProjects() {
      try {
        const res = await fetch("/api/projects");
        if (res.ok) {
          const data = await res.json();
          setProjects(data.projects || []);
        }
      } catch {
        // Error handled silently - UI shows empty state
      } finally {
        setLoadingProjects(false);
      }
    }

    async function fetchSubscriptions() {
      try {
        const res = await fetch("/api/billing/subscriptions");
        if (res.ok) {
          const data = await res.json();
          const managedKeys = new Set([
            "website_managed",
            "website_pro",
            "website_premium",
            "starter_bundle",
            "growth_bundle",
            "full_suite",
            "enterprise_suite",
          ]);
          interface SubRow { plan: string; status: string }
          const subs: SubRow[] = data.subscriptions || [];
          const managed = subs.find(
            (s) =>
              managedKeys.has(s.plan) &&
              (s.status === "active" || s.status === "trialing")
          );
          setHasManagedSub(!!managed);
          setActivePlan(managed?.plan ?? null);
        } else {
          setHasManagedSub(false);
        }
      } catch {
        setHasManagedSub(false);
      }
    }

    async function fetchQuota() {
      try {
        const res = await fetch("/api/billing/cr-quota");
        if (res.ok) {
          const data = await res.json();
          if (data.quota) setQuota(data.quota);
        }
      } catch {
        // Quota display is informational; ignore errors silently.
      }
    }

    fetchProjects();
    fetchSubscriptions();
    fetchQuota();
  }, []);

  useEffect(() => {
    if (preselectedProjectId) {
      setValue("projectId", preselectedProjectId);
    }
  }, [preselectedProjectId, setValue]);

  const submitRequest = async (data: RequestFormData, acceptOverageFee = false) => {
    const response = await fetch(`/api/projects/${data.projectId}/change-requests`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, acceptOverageFee }),
    });
    const responseData = await response.json().catch(() => ({}));
    return { response, responseData };
  };

  const onSubmit = async (data: RequestFormData) => {
    setLoading(true);
    setError(null);

    try {
      const { response, responseData } = await submitRequest(data);

      if (response.status === 402 && responseData.code === "cr_cap_reached") {
        const cap = responseData.capDetails;
        const overageDollars = (cap?.overageFeeCents ?? 2500) / 100;
        const confirmed = window.confirm(
          `You've used your ${cap?.included ?? "included"} change request${cap?.included === 1 ? "" : "s"} for this period.\n\nPay $${overageDollars} for this extra request, or click Cancel to upgrade your plan instead.`
        );
        if (!confirmed) {
          router.push("/portal/billing?reason=upgrade_for_more_requests");
          return;
        }
        const retry = await submitRequest(data, true);
        if (retry.responseData.paymentLinkUrl) {
          window.location.href = retry.responseData.paymentLinkUrl;
          return;
        }
        if (!retry.response.ok) {
          throw new Error(retry.responseData.message || "Failed to create request");
        }
        router.push("/portal/requests");
        return;
      }

      if (response.status === 402) {
        // Other subscription gates (no plan, plan_excludes_change_requests).
        router.push("/portal/billing?reason=upgrade_for_requests");
        return;
      }

      if (!response.ok) {
        throw new Error(responseData.message || "Failed to create request");
      }

      // If a rush or overage payment link was issued, send the customer to it.
      if (responseData.paymentLinkUrl) {
        window.location.href = responseData.paymentLinkUrl;
        return;
      }

      router.push("/portal/requests");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const selectedProjectId = watch("projectId");

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/portal/requests">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Submit Change Request</CardTitle>
          <CardDescription>
            Tell us what changes you need and we&apos;ll take care of it.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {hasManagedSub === false && (
            <div className="mb-6 rounded-lg border border-amber-300 bg-amber-50 p-4">
              <p className="text-sm font-medium text-amber-900">
                A management plan is required to submit change requests.
              </p>
              <p className="text-sm text-amber-800 mt-1">
                Add a Managed plan ($49/mo) and we&apos;ll start handling your
                site updates.
              </p>
              <Link href="/portal/billing">
                <Button size="sm" className="mt-3 bg-amber-600 hover:bg-amber-700 text-white">
                  Choose a Plan
                </Button>
              </Link>
            </div>
          )}

          {/* Quota indicator — always visible when the customer has a sub. */}
          {quota && quota.included > 0 && (
            <div
              className={`mb-6 rounded-xl border p-4 flex items-start gap-4 ${
                quota.remaining === 0
                  ? "border-amber-300 bg-amber-50"
                  : quota.remaining <= 1
                  ? "border-blue-200 bg-blue-50"
                  : "border-emerald-200 bg-emerald-50"
              }`}
            >
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-900">
                    {quota.planLabel} change requests this period
                  </span>
                  <span
                    className={`text-sm font-bold ${
                      quota.remaining === 0
                        ? "text-amber-700"
                        : "text-gray-900"
                    }`}
                  >
                    {quota.used} of {quota.included} used
                  </span>
                </div>
                <div className="mt-2 h-1.5 bg-white/70 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      quota.remaining === 0
                        ? "bg-amber-500"
                        : quota.remaining <= 1
                        ? "bg-blue-500"
                        : "bg-emerald-500"
                    }`}
                    style={{
                      width: `${Math.min(100, (quota.used / quota.included) * 100)}%`,
                    }}
                  />
                </div>
                <p className="text-xs text-gray-600 mt-2">
                  {quota.remaining === 0
                    ? `You're at your cap. Submitting another request costs $${(quota.overageFeeCents / 100).toFixed(0)} (or upgrade your plan).`
                    : `${quota.remaining} included request${quota.remaining === 1 ? "" : "s"} left until ${quota.periodEndsAt ? new Date(quota.periodEndsAt).toLocaleDateString() : "end of period"}.`}
                </p>
              </div>
            </div>
          )}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Project selection */}
            <div>
              <Label htmlFor="project">Project *</Label>
              {loadingProjects ? (
                <div className="h-10 bg-gray-100 animate-pulse rounded-md" />
              ) : projects.length === 0 ? (
                <div className="p-4 bg-gray-50 rounded-lg text-center">
                  <p className="text-gray-600 mb-2">No projects found</p>
                  <Link href="/portal/projects/new">
                    <Button variant="outline" size="sm">
                      Create a Project First
                    </Button>
                  </Link>
                </div>
              ) : (
                <Select
                  value={selectedProjectId}
                  onValueChange={(value) => setValue("projectId", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a project" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.projectName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {errors.projectId && (
                <p className="text-sm text-red-500 mt-1">
                  {errors.projectId.message}
                </p>
              )}
            </div>

            {/* Request title */}
            <div>
              <Label htmlFor="title">Request Title *</Label>
              <Input
                id="title"
                placeholder="e.g., Update contact information"
                {...register("title")}
              />
              {errors.title && (
                <p className="text-sm text-red-500 mt-1">{errors.title.message}</p>
              )}
            </div>

            {/* Type and priority */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="type">Request Type</Label>
                <Select
                  defaultValue="feature"
                  onValueChange={(value) =>
                    setValue("type", value as RequestFormData["type"])
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="feature">New Feature</SelectItem>
                    <SelectItem value="bug">Bug Fix</SelectItem>
                    <SelectItem value="content">Content Update</SelectItem>
                    <SelectItem value="design">Design Change</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="priority">Priority</Label>
                <Select
                  defaultValue="normal"
                  onValueChange={(value) =>
                    setValue("priority", value as RequestFormData["priority"])
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Description */}
            <div>
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                placeholder="Please describe the change you need in detail..."
                rows={5}
                {...register("description")}
              />
              {errors.description && (
                <p className="text-sm text-red-500 mt-1">
                  {errors.description.message}
                </p>
              )}
              <p className="text-sm text-gray-500 mt-1">
                Be as specific as possible. Include any relevant URLs, text
                content, or references.
              </p>
            </div>

            {/* Rush Delivery Option — hidden for Pro (Pro gets same-day free) */}
            {activePlan === "website_pro" ? (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-emerald-600" />
                  <span className="font-medium text-emerald-900">
                    Pro plan: 24-hour turnaround included
                  </span>
                </div>
                <p className="text-sm text-emerald-800 mt-1">
                  No rush fee needed — every ticket on Managed Pro is completed
                  within one business day.
                </p>
              </div>
            ) : (
              <div className="rounded-lg border-2 border-dashed border-amber-200 bg-amber-50/50 p-4">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    {...register("rushDelivery")}
                    className="mt-1 h-4 w-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-amber-500" />
                      <span className="font-medium text-gray-900">Same-Day Rush Delivery</span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                        +$49
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      Need it done today? You&apos;ll be redirected to Square to pay
                      $49 for same-day turnaround instead of the standard 3&ndash;5 business days.
                    </p>
                  </div>
                </label>
              </div>
            )}

            {/* Error message */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                {error}
              </div>
            )}

            {/* Submit */}
            <div className="flex justify-end gap-3">
              <Link href="/portal/requests">
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </Link>
              <Button
                type="submit"
                disabled={loading || projects.length === 0 || hasManagedSub === false}
              >
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Submit Request
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function NewChangeRequestPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      }
    >
      <NewChangeRequestContent />
    </Suspense>
  );
}
