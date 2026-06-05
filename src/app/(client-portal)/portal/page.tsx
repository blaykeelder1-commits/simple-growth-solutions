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
  Rocket,
} from "lucide-react";
import { CybersecurityUpsell } from "@/components/portal/UpsellBanner";
import { UpgradesBanner } from "@/components/portal/UpgradesBanner";

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

// 7-stage build progression — keep aligned with /portal/projects/[id] timeline
const STATUS_ORDER = [
  "submitted",
  "reviewing",
  "approved",
  "in_progress",
  "review_ready",
  "deployed",
  "completed",
];

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

const NEXT_MILESTONE: Record<string, string> = {
  submitted: "Our team will review your requirements within 24 hours.",
  reviewing: "We're refining the spec — kickoff happens next.",
  approved: "Build kicks off any moment — first draft in 2–3 days.",
  in_progress: "Your designer is shaping the first draft right now.",
  review_ready: "Your preview is ready — open the project to review and approve.",
  revision: "We're applying your requested revisions.",
  deployed: "Site is live! Submit change requests anytime.",
  completed: "Project complete. Anything else? Submit a change request.",
};

export default function PortalDashboard() {
  const { data: session } = useSession();
  const [projects, setProjects] = useState<Project[]>([]);
  const [recentRequests, setRecentRequests] = useState<ChangeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
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
      setError("Unable to load your dashboard. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <AlertCircle className="h-12 w-12 text-amber-500 mb-4" />
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Something went wrong</h2>
        <p className="text-gray-500 mb-4">{error}</p>
        <Button onClick={fetchData}>Try Again</Button>
      </div>
    );
  }

  const activeProjects = projects.filter(
    (p) => !["completed", "deployed"].includes(p.status)
  );
  // The featured project — most-recent active or most-recent overall.
  const featured = activeProjects[0] || projects[0] || null;
  const featuredStageIndex = featured
    ? Math.max(0, STATUS_ORDER.indexOf(featured.status))
    : -1;
  const featuredProgress = featured
    ? Math.round(((featuredStageIndex + 1) / STATUS_ORDER.length) * 100)
    : 0;
  const featuredStatus = featured ? statusConfig[featured.status] : null;
  const featuredMilestone = featured ? NEXT_MILESTONE[featured.status] : null;

  // First-run guidance: the customer is live (has a deployed site) but hasn't
  // done anything yet. Show a short "what now" so a paying customer is never
  // left wondering — without creating any support work on our end.
  const liveProject = projects.find((p) => p.deployedUrl) || null;
  const showGettingStarted = !!liveProject && recentRequests.length === 0;

  return (
    <div className="space-y-6">
      {/* Hero — build progress for the featured project. Replaces the flat
          welcome card with something that shows the customer where their
          build actually is. */}
      <div className="rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 p-6 lg:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.15),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(168,85,247,0.25),transparent_60%)]" />

        <div className="relative">
          <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center">
                <Sparkles className="h-7 w-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">
                  Welcome back, {session?.user?.name?.split(" ")[0] || "there"}.
                </h1>
                <p className="text-white/80 text-sm mt-0.5">
                  {featured
                    ? featured.status === "deployed" || featured.status === "completed"
                      ? `Managing your live site — ${featured.projectName}.`
                      : `Tracking your build of ${featured.projectName}.`
                    : "Let's build your website. Start a free build to begin."}
                </p>
              </div>
            </div>
            <Link href={featured ? `/portal/projects/${featured.id}` : "/portal/projects/new"}>
              <Button className="bg-white text-indigo-700 hover:bg-white/90 shadow-lg">
                {featured ? (
                  <>
                    <ArrowRight className="h-4 w-4 mr-2" />
                    Open Project
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Start Free Build
                  </>
                )}
              </Button>
            </Link>
          </div>

          {/* Build-progress bar for the featured project */}
          {featured && featuredStatus && (
            <div className="bg-white/10 backdrop-blur rounded-xl p-4 border border-white/20">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Rocket className="h-4 w-4 text-white/80" />
                  <span className="text-sm font-medium uppercase tracking-wide text-white/70">
                    Build Progress
                  </span>
                </div>
                <span className="text-sm font-bold">
                  {featuredStatus.label} &middot; {featuredProgress}%
                </span>
              </div>
              <div className="h-2 bg-white/15 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-400 to-cyan-300 rounded-full transition-all duration-500"
                  style={{ width: `${featuredProgress}%` }}
                />
              </div>
              <p className="text-xs text-white/80 mt-3 italic">
                {featuredMilestone}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* First-run getting-started — only for a freshly-live customer */}
      {showGettingStarted && liveProject && (
        <Card variant="professional">
          <CardHeader>
            <CardTitle className="text-lg">Getting started</CardTitle>
            <CardDescription>
              You&apos;re all set. Here&apos;s how to get the most out of your plan.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-3">
              <a
                href={liveProject.deployedUrl as string}
                target="_blank"
                rel="noopener noreferrer"
                className="group rounded-xl border border-gray-100 bg-white p-4 hover:border-blue-200 hover:bg-blue-50/40 transition-all"
              >
                <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center mb-3">
                  <Globe className="h-5 w-5 text-emerald-600" />
                </div>
                <p className="font-medium text-gray-900">Visit your live site</p>
                <p className="text-sm text-gray-500 mt-0.5">See it live and share the link.</p>
              </a>

              <Link
                href="/portal/requests/new"
                className="group rounded-xl border border-gray-100 bg-white p-4 hover:border-blue-200 hover:bg-blue-50/40 transition-all"
              >
                <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center mb-3">
                  <FileText className="h-5 w-5 text-blue-600" />
                </div>
                <p className="font-medium text-gray-900">Request your first edit</p>
                <p className="text-sm text-gray-500 mt-0.5">Need a change? We handle it for you.</p>
              </Link>

              <Link
                href="/portal/upgrades"
                className="group rounded-xl border border-gray-100 bg-white p-4 hover:border-blue-200 hover:bg-blue-50/40 transition-all"
              >
                <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center mb-3">
                  <Sparkles className="h-5 w-5 text-purple-600" />
                </div>
                <p className="font-medium text-gray-900">Explore add-ons</p>
                <p className="text-sm text-gray-500 mt-0.5">SEO, marketing, and more when you&apos;re ready.</p>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* In-portal upgrades banner — only renders for orgs ≥30 days into managed sub */}
      <UpgradesBanner />

      {/* Cybersecurity Upsell */}
      <CybersecurityUpsell />

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
              Pending Requests
            </CardTitle>
            <div className="icon-container icon-container-green">
              <FileText className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">
              {recentRequests.filter((r) => r.status === "pending").length}
            </div>
            <p className="text-sm text-gray-500 mt-1">Awaiting our team</p>
          </CardContent>
        </Card>

        <Card variant="professional" hover="lift" className="stat-card stat-card-purple">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium text-gray-500">
              Recently Completed
            </CardTitle>
            <div className="icon-container icon-container-purple">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">
              {recentRequests.filter((r) => r.status === "completed").length}
            </div>
            <p className="text-sm text-gray-500 mt-1">Latest requests</p>
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
