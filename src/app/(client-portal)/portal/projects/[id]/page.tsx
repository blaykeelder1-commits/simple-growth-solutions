"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Globe,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  ExternalLink,
  Plus,
} from "lucide-react";

interface Project {
  id: string;
  projectName: string;
  projectType: string;
  status: string;
  existingUrl: string | null;
  desiredFeatures: string | null;
  designPreferences: string | null;
  targetAudience: string | null;
  deployedUrl: string | null;
  repositoryUrl: string | null;
  estimatedCompletion: string | null;
  createdAt: string;
  updatedAt: string;
  changeRequests: ChangeRequest[];
  projectNotes: ProjectNote[];
}

interface ChangeRequest {
  id: string;
  title: string;
  description: string;
  type: string;
  priority: string;
  status: string;
  createdAt: string;
}

interface ProjectNote {
  id: string;
  content: string;
  isInternal: boolean;
  createdAt: string;
}

const statusConfig: Record<string, { label: string; color: string; bgColor: string; icon: React.ElementType; description: string }> = {
  submitted: { label: "Submitted", color: "text-blue-700", bgColor: "bg-blue-100 border border-blue-200", icon: Clock, description: "Your project request has been submitted and is awaiting review." },
  reviewing: { label: "Under Review", color: "text-amber-700", bgColor: "bg-amber-100 border border-amber-200", icon: Clock, description: "Our team is reviewing your requirements." },
  approved: { label: "Approved", color: "text-emerald-700", bgColor: "bg-emerald-100 border border-emerald-200", icon: CheckCircle2, description: "Your project has been approved and will begin shortly." },
  in_progress: { label: "In Progress", color: "text-purple-700", bgColor: "bg-purple-100 border border-purple-200", icon: Clock, description: "Our team is actively working on your website." },
  review_ready: { label: "Ready for Review", color: "text-orange-700", bgColor: "bg-orange-100 border border-orange-200", icon: AlertCircle, description: "Your website is ready for your review. Please provide feedback." },
  revision: { label: "Revisions Needed", color: "text-red-700", bgColor: "bg-red-100 border border-red-200", icon: AlertCircle, description: "We're implementing your requested revisions." },
  deployed: { label: "Deployed", color: "text-emerald-700", bgColor: "bg-emerald-100 border border-emerald-200", icon: CheckCircle2, description: "Your website is live!" },
  completed: { label: "Completed", color: "text-gray-700", bgColor: "bg-gray-100 border border-gray-200", icon: CheckCircle2, description: "Project completed successfully." },
};

const statusOrder = [
  "submitted",
  "reviewing",
  "approved",
  "in_progress",
  "review_ready",
  "deployed",
  "completed",
];

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProject() {
      try {
        const res = await fetch(`/api/projects/${params.id}`);
        if (res.ok) {
          const data = await res.json();
          setProject(data.project);
        } else if (res.status === 404) {
          router.push("/portal/projects");
        }
      } catch {
        // Error handled silently - UI shows empty state
      } finally {
        setLoading(false);
      }
    }

    if (params.id) {
      fetchProject();
    }
  }, [params.id, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!project) {
    return null;
  }

  const currentStatus = statusConfig[project.status] || statusConfig.submitted;
  const StatusIcon = currentStatus.icon;
  const currentStatusIndex = statusOrder.indexOf(project.status);
  const features = project.desiredFeatures ? JSON.parse(project.desiredFeatures) : [];
  const clientNotes = project.projectNotes?.filter((n) => !n.isInternal) || [];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/portal/projects">
          <Button variant="ghost" size="sm" className="hover:bg-white/60">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
        </Link>
      </div>

      {/* Project header card */}
      <Card variant="gradient" className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 overflow-hidden relative">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=%2260%22 height=%2260%22 viewBox=%220 0 60 60%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cg fill=%22none%22 fill-rule=%22evenodd%22%3E%3Cg fill=%22%23ffffff%22 fill-opacity=%220.1%22%3E%3Cpath d=%22M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-30" />
        <CardHeader className="relative">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <Globe className="h-8 w-8 text-white" />
              </div>
              <div>
                <CardTitle className="text-2xl text-white">{project.projectName}</CardTitle>
                <CardDescription className="text-white/80">
                  {project.projectType === "new_build"
                    ? "New Website Build"
                    : project.projectType === "redesign"
                    ? "Website Redesign"
                    : "Website Migration"}
                </CardDescription>
              </div>
            </div>
            <Badge className="bg-white/20 text-white border-white/30 text-sm px-3 py-1">
              <StatusIcon className="h-4 w-4 mr-1" />
              {currentStatus.label}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="relative">
          <p className="text-white/80 mb-4">{currentStatus.description}</p>

          <div className="flex gap-3">
            {project.deployedUrl && (
              <a
                href={project.deployedUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button className="bg-white text-indigo-600 hover:bg-white/90 shadow-lg">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View Live Site
                </Button>
              </a>
            )}
            <Link href={`/portal/requests/new?projectId=${project.id}`}>
              <Button variant="outline" className="border-white/30 text-white hover:bg-white/10">
                <Plus className="h-4 w-4 mr-2" />
                Request Changes
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Status timeline */}
      <Card variant="professional">
        <CardHeader>
          <CardTitle className="text-lg">Project Timeline</CardTitle>
          <CardDescription>Track the progress of your project</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />
            <div className="space-y-6">
              {statusOrder.map((status, index) => {
                const config = statusConfig[status];
                const isCompleted = index < currentStatusIndex;
                const isCurrent = index === currentStatusIndex;

                return (
                  <div key={status} className="relative flex items-center gap-4 pl-10">
                    <div
                      className={`absolute left-2 h-5 w-5 rounded-full flex items-center justify-center shadow-md ${
                        isCompleted
                          ? "bg-emerald-500 text-white"
                          : isCurrent
                          ? "bg-blue-500 text-white ring-4 ring-blue-100"
                          : "bg-gray-200"
                      }`}
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="h-3 w-3" />
                      ) : (
                        <div className="h-2 w-2 rounded-full bg-current opacity-50" />
                      )}
                    </div>
                    <div
                      className={`flex-1 ${
                        isCurrent ? "font-semibold text-gray-900" : isCompleted ? "text-gray-700" : "text-gray-400"
                      }`}
                    >
                      {config.label}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Project details */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card variant="professional">
          <CardHeader>
            <CardTitle className="text-lg">Project Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {project.existingUrl && (
              <div>
                <div className="text-sm font-medium text-gray-500">Existing Website</div>
                <a
                  href={project.existingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  {project.existingUrl}
                </a>
              </div>
            )}

            {project.targetAudience && (
              <div>
                <div className="text-sm font-medium text-gray-500">Target Audience</div>
                <div className="text-gray-900">{project.targetAudience}</div>
              </div>
            )}

            {project.estimatedCompletion && (
              <div>
                <div className="text-sm font-medium text-gray-500">
                  Estimated Completion
                </div>
                <div className="text-gray-900">
                  {new Date(project.estimatedCompletion).toLocaleDateString()}
                </div>
              </div>
            )}

            <div>
              <div className="text-sm font-medium text-gray-500">Created</div>
              <div className="text-gray-900">{new Date(project.createdAt).toLocaleDateString()}</div>
            </div>
          </CardContent>
        </Card>

        <Card variant="professional">
          <CardHeader>
            <CardTitle className="text-lg">Requested Features</CardTitle>
          </CardHeader>
          <CardContent>
            {features.length > 0 ? (
              <ul className="space-y-2">
                {features.map((feature: string, index: number) => (
                  <li key={index} className="flex items-center gap-2">
                    <div className="h-5 w-5 rounded-full bg-emerald-100 flex items-center justify-center">
                      <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                    </div>
                    <span className="text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500">No specific features requested</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Change requests */}
      {project.changeRequests && project.changeRequests.length > 0 && (
        <Card variant="professional">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">Change Requests</CardTitle>
              <CardDescription>Modifications requested for this project</CardDescription>
            </div>
            <Link href={`/portal/requests/new?projectId=${project.id}`}>
              <Button variant="outline" size="sm" className="bg-white/50 hover:bg-white">
                <Plus className="h-4 w-4 mr-1" />
                New Request
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {project.changeRequests.map((request) => (
                <div
                  key={request.id}
                  className="flex items-center justify-between p-4 rounded-xl border border-gray-100 bg-white hover:bg-gray-50/80 transition-all"
                >
                  <div>
                    <div className="font-medium text-gray-900">{request.title}</div>
                    <div className="text-sm text-gray-500">
                      {new Date(request.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <Badge
                    className={request.status === "completed"
                      ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                      : "bg-gray-100 text-gray-600 border border-gray-200"
                    }
                  >
                    {request.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Client-visible notes */}
      {clientNotes.length > 0 && (
        <Card variant="professional">
          <CardHeader>
            <CardTitle className="text-lg">Updates from Our Team</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {clientNotes.map((note) => (
                <div key={note.id} className="border-l-4 border-blue-500 pl-4 py-2 bg-blue-50/50 rounded-r-xl">
                  <p className="text-gray-700">{note.content}</p>
                  <div className="text-sm text-gray-500 mt-1">
                    {new Date(note.createdAt).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
