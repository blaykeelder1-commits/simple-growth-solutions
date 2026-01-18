"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  Globe,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Plus,
  Sparkles,
  FileText,
  TrendingUp,
} from "lucide-react";

interface Project {
  id: string;
  projectName: string;
  projectType: string;
  status: string;
  deployedUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ChangeRequest {
  id: string;
  title: string;
  status: string;
  createdAt: string;
}

const statusConfig: Record<string, { label: string; color: string; bgColor: string; icon: React.ElementType }> = {
  submitted: { label: "Submitted", color: "text-blue-700", bgColor: "bg-blue-100 border border-blue-200", icon: Clock },
  reviewing: { label: "Under Review", color: "text-amber-700", bgColor: "bg-amber-100 border border-amber-200", icon: Clock },
  approved: { label: "Approved", color: "text-emerald-700", bgColor: "bg-emerald-100 border border-emerald-200", icon: CheckCircle2 },
  in_progress: { label: "In Progress", color: "text-purple-700", bgColor: "bg-purple-100 border border-purple-200", icon: Clock },
  review_ready: { label: "Ready for Review", color: "text-orange-700", bgColor: "bg-orange-100 border border-orange-200", icon: AlertCircle },
  revision: { label: "Revisions Needed", color: "text-red-700", bgColor: "bg-red-100 border border-red-200", icon: AlertCircle },
  deployed: { label: "Deployed", color: "text-emerald-700", bgColor: "bg-emerald-100 border border-emerald-200", icon: CheckCircle2 },
  completed: { label: "Completed", color: "text-gray-700", bgColor: "bg-gray-100 border border-gray-200", icon: CheckCircle2 },
};

export default function PortalDashboard() {
  const { data: session } = useSession();
  const [projects, setProjects] = useState<Project[]>([]);
  const [recentRequests, setRecentRequests] = useState<ChangeRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [projectsRes, requestsRes] = await Promise.all([
          fetch("/api/projects"),
          fetch("/api/change-requests?limit=5"),
        ]);

        if (projectsRes.ok) {
          const data = await projectsRes.json();
          setProjects(data.projects || []);
        }

        if (requestsRes.ok) {
          const data = await requestsRes.json();
          setRecentRequests(data.requests || []);
        }
      } catch {
        // Error handled silently - UI shows empty state
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  const activeProjects = projects.filter(
    (p) => !["completed", "deployed"].includes(p.status)
  );

  return (
    <div className="space-y-8">
      {/* Welcome banner */}
      <Card variant="gradient" className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 overflow-hidden relative">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=%2260%22 height=%2260%22 viewBox=%220 0 60 60%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cg fill=%22none%22 fill-rule=%22evenodd%22%3E%3Cg fill=%22%23ffffff%22 fill-opacity=%220.1%22%3E%3Cpath d=%22M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-30" />
        <CardContent className="py-8 relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="h-16 w-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <Sparkles className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">
                  Welcome back, {session?.user?.name || "there"}!
                </h1>
                <p className="text-white/80 mt-1">
                  Here&apos;s what&apos;s happening with your projects.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick stats */}
      <div className="grid gap-5 md:grid-cols-3">
        <Card variant="professional" hover="lift" className="stat-card stat-card-blue">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium text-gray-500">
              Active Projects
            </CardTitle>
            <div className="icon-container icon-container-blue">
              <Globe className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{activeProjects.length}</div>
            <p className="text-sm text-gray-500 mt-1">In progress</p>
          </CardContent>
        </Card>

        <Card variant="professional" hover="lift" className="stat-card stat-card-green">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium text-gray-500">
              Total Projects
            </CardTitle>
            <div className="icon-container icon-container-green">
              <TrendingUp className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{projects.length}</div>
            <p className="text-sm text-gray-500 mt-1">All time</p>
          </CardContent>
        </Card>

        <Card variant="professional" hover="lift" className="stat-card stat-card-purple">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium text-gray-500">
              Pending Requests
            </CardTitle>
            <div className="icon-container icon-container-purple">
              <FileText className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">
              {recentRequests.filter((r) => r.status === "pending").length}
            </div>
            <p className="text-sm text-gray-500 mt-1">Awaiting response</p>
          </CardContent>
        </Card>
      </div>

      {/* Projects section */}
      <Card variant="professional">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg">Your Projects</CardTitle>
            <CardDescription>
              Track the status of your website projects
            </CardDescription>
          </div>
          <Link href="/portal/projects/new">
            <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-500/25">
              <Plus className="h-4 w-4 mr-2" />
              New Project
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {projects.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center mx-auto mb-5">
                <Globe className="h-10 w-10 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                No projects yet
              </h3>
              <p className="text-gray-500 mb-6 max-w-sm mx-auto">
                Get started by requesting your free website build!
              </p>
              <Link href="/portal/projects/new">
                <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-500/25">
                  Request Free Website
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {projects.slice(0, 5).map((project) => {
                const status = statusConfig[project.status] || statusConfig.submitted;
                const StatusIcon = status.icon;

                return (
                  <Link
                    key={project.id}
                    href={`/portal/projects/${project.id}`}
                    className="block"
                  >
                    <div className="list-item-interactive flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center">
                          <Globe className="h-6 w-6 text-blue-600" />
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900">
                            {project.projectName}
                          </h4>
                          <p className="text-sm text-gray-500">
                            {project.projectType === "new_build"
                              ? "New Build"
                              : project.projectType === "redesign"
                              ? "Redesign"
                              : "Migration"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge className={`${status.bgColor} ${status.color}`}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {status.label}
                        </Badge>
                        <ArrowRight className="h-4 w-4 text-gray-400" />
                      </div>
                    </div>
                  </Link>
                );
              })}

              {projects.length > 5 && (
                <Link href="/portal/projects">
                  <Button variant="outline" className="w-full bg-white/50 hover:bg-white">
                    View All Projects ({projects.length})
                  </Button>
                </Link>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent change requests */}
      {recentRequests.length > 0 && (
        <Card variant="professional">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">Recent Change Requests</CardTitle>
              <CardDescription>Your latest submitted requests</CardDescription>
            </div>
            <Link href="/portal/requests">
              <Button variant="outline" size="sm" className="bg-white/50 hover:bg-white">
                View All
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentRequests.map((request) => (
                <div
                  key={request.id}
                  className="flex items-center justify-between p-4 rounded-xl border border-gray-100 bg-white hover:bg-gray-50/80 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-gray-100 flex items-center justify-center">
                      <FileText className="h-5 w-5 text-gray-600" />
                    </div>
                    <span className="font-medium text-gray-900">{request.title}</span>
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
    </div>
  );
}
