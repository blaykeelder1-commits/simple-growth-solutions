"use client";

import { useState, useEffect } from "react";
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
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";

const requestSchema = z.object({
  projectId: z.string().min(1, "Please select a project"),
  title: z.string().min(5, "Title must be at least 5 characters"),
  description: z.string().min(20, "Please provide more details"),
  type: z.enum(["feature", "bug", "content", "design"]),
  priority: z.enum(["low", "normal", "high", "urgent"]),
});

type RequestFormData = z.infer<typeof requestSchema>;

interface Project {
  id: string;
  projectName: string;
}

export default function NewChangeRequestPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedProjectId = searchParams.get("projectId");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);

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

    fetchProjects();
  }, []);

  useEffect(() => {
    if (preselectedProjectId) {
      setValue("projectId", preselectedProjectId);
    }
  }, [preselectedProjectId, setValue]);

  const onSubmit = async (data: RequestFormData) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/projects/${data.projectId}/change-requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to create request");
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
              <Button type="submit" disabled={loading || projects.length === 0}>
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
