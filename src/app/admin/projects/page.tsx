"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Globe,
  Search,
  Briefcase,
  Eye,
  Send,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";

interface Project {
  id: string;
  projectName: string;
  projectType: string;
  status: string;
  priority: number;
  organization: {
    name: string;
  };
  createdAt: string;
  updatedAt: string;
  changeRequests: { id: string; status: string }[];
  designOptions: string | null;
  designOptionsReleasedAt: string | null;
  selectedDesignOption: string | null;
}

// Count the design options staged on a project (JSON-array string). 0 if none/malformed.
function countOptions(designOptions: string | null): number {
  if (!designOptions) return 0;
  try {
    const parsed = JSON.parse(designOptions);
    return Array.isArray(parsed) ? parsed.length : 0;
  } catch {
    return 0;
  }
}

// Where a project sits in the design-options review lifecycle, for the admin board.
//   needs_review     — options built + staged, NOT yet sent → awaiting Blayke's review (Gate 2)
//   awaiting_pick    — sent to the customer, they haven't chosen yet
//   customer_chose   — customer picked one
//   none             — no options in play
type ReviewState = "needs_review" | "awaiting_pick" | "customer_chose" | "none";
function reviewState(p: Project): ReviewState {
  if (countOptions(p.designOptions) === 0) return "none";
  if (!p.designOptionsReleasedAt) return "needs_review";
  if (!p.selectedDesignOption) return "awaiting_pick";
  return "customer_chose";
}

const statusConfig: Record<string, { label: string; color: string }> = {
  submitted: { label: "Submitted", color: "bg-blue-100 text-blue-800" },
  reviewing: { label: "Reviewing", color: "bg-yellow-100 text-yellow-800" },
  approved: { label: "Approved", color: "bg-green-100 text-green-800" },
  in_progress: { label: "In Progress", color: "bg-purple-100 text-purple-800" },
  review_ready: { label: "Review Ready", color: "bg-orange-100 text-orange-800" },
  revision: { label: "Revision", color: "bg-red-100 text-red-800" },
  deployed: { label: "Deployed", color: "bg-green-100 text-green-800" },
  completed: { label: "Completed", color: "bg-gray-100 text-gray-800" },
};

export default function AdminProjectsPage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    if (authStatus === "unauthenticated") {
      router.push("/login");
    }
  }, [authStatus, router]);

  useEffect(() => {
    async function fetchProjects() {
      try {
        const res = await fetch("/api/admin/projects");
        if (res.ok) {
          const data = await res.json();
          setProjects(data.projects || []);
        }
      } catch {
        // Failed to fetch projects
      } finally {
        setLoading(false);
      }
    }

    if (session?.user?.role === "admin") {
      fetchProjects();
    }
  }, [session]);

  if (authStatus === "loading" || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (session?.user?.role !== "admin") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-gray-600">You need admin access to view this page.</p>
        </div>
      </div>
    );
  }

  const filteredProjects = projects.filter((project) => {
    const matchesSearch =
      project.projectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.organization?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || project.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Sort by priority (high first) then by date (newest first)
  const sortedProjects = [...filteredProjects].sort((a, b) => {
    if (a.priority !== b.priority) return b.priority - a.priority;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const statusCounts = projects.reduce((acc, project) => {
    acc[project.status] = (acc[project.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Projects with design options built + staged but NOT yet sent to the customer —
  // this is the owner's review queue (Gate 2): review Andy/Claude's work, then send.
  const needsReview = projects.filter((p) => reviewState(p) === "needs_review");

  return (
    <div className="space-y-6">
      {/* Hero strip with embedded stage counters */}
      <div className="rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-fuchsia-600 p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.18),transparent_60%)]" />
        <div className="relative">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center">
                <Briefcase className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Project Queue</h1>
                <p className="text-white/80 text-sm">Active website builds across the customer base.</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold">{projects.length}</div>
              <div className="text-xs text-white/70 uppercase tracking-wide">Total projects</div>
            </div>
          </div>

          {/* 8-status stat tiles, embedded inside the gradient hero */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2">
            {Object.entries(statusConfig).map(([key, config]) => {
              const isActive = statusFilter === key;
              return (
                <button
                  key={key}
                  onClick={() => setStatusFilter(key)}
                  className={`text-left rounded-lg px-3 py-2 backdrop-blur transition border ${
                    isActive
                      ? "bg-white text-indigo-700 border-white shadow-md"
                      : "bg-white/10 hover:bg-white/20 border-white/20"
                  }`}
                >
                  <div className={`text-xl font-bold ${isActive ? "text-indigo-700" : "text-white"}`}>
                    {statusCounts[key] || 0}
                  </div>
                  <div className={`text-[11px] uppercase tracking-wide ${isActive ? "text-indigo-700/70" : "text-white/70"}`}>
                    {config.label}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Owner review queue (Gate 2) — design options built + staged, awaiting your
          review before they go to the customer. Only shows when something is waiting. */}
      {needsReview.length > 0 && (
        <Card className="border-orange-300 bg-orange-50">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-orange-600" />
              <h2 className="text-lg font-bold text-orange-900">
                Awaiting your review ({needsReview.length})
              </h2>
            </div>
            <p className="text-sm text-orange-800">
              Website options are built and staged. Review them, make any edits, then approve to send to the customer.
            </p>
          </CardHeader>
          <CardContent className="space-y-2">
            {needsReview.map((p) => (
              <div
                key={p.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-orange-200 bg-white p-3"
              >
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded bg-orange-100 flex items-center justify-center">
                    <Globe className="h-4 w-4 text-orange-600" />
                  </div>
                  <div>
                    <div className="font-semibold">{p.projectName}</div>
                    <div className="text-xs text-gray-500">
                      {p.organization?.name || "—"} &bull; {countOptions(p.designOptions)} option
                      {countOptions(p.designOptions) === 1 ? "" : "s"} ready
                    </div>
                  </div>
                </div>
                <Link href={`/admin/projects/${p.id}`}>
                  <Button className="bg-orange-600 hover:bg-orange-700 text-white" size="sm">
                    <Send className="h-4 w-4 mr-2" />
                    Review &amp; send
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search projects..."
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button
                variant={statusFilter === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("all")}
              >
                All
              </Button>
              {["submitted", "reviewing", "in_progress", "review_ready"].map((status) => (
                <Button
                  key={status}
                  variant={statusFilter === status ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter(status)}
                >
                  {statusConfig[status].label}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Project</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Requests</TableHead>
                <TableHead>Created</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedProjects.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                    No projects found
                  </TableCell>
                </TableRow>
              ) : (
                sortedProjects.map((project) => {
                  const status = statusConfig[project.status] || statusConfig.submitted;
                  const pendingRequests = project.changeRequests?.filter(
                    (r) => r.status === "pending"
                  ).length || 0;

                  return (
                    <TableRow key={project.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded bg-blue-100 flex items-center justify-center">
                            <Globe className="h-4 w-4 text-blue-600" />
                          </div>
                          <span className="font-medium">{project.projectName}</span>
                        </div>
                      </TableCell>
                      <TableCell>{project.organization?.name || "—"}</TableCell>
                      <TableCell className="capitalize">
                        {project.projectType.replace("_", " ")}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1 items-start">
                          <Badge className={status.color}>{status.label}</Badge>
                          {(() => {
                            const rs = reviewState(project);
                            if (rs === "needs_review")
                              return (
                                <Badge className="bg-orange-100 text-orange-800 border border-orange-200">
                                  <Eye className="h-3 w-3 mr-1" />
                                  Needs your review
                                </Badge>
                              );
                            if (rs === "awaiting_pick")
                              return (
                                <Badge className="bg-blue-100 text-blue-800 border border-blue-200">
                                  <Send className="h-3 w-3 mr-1" />
                                  Sent — awaiting pick
                                </Badge>
                              );
                            if (rs === "customer_chose")
                              return (
                                <Badge className="bg-emerald-100 text-emerald-800 border border-emerald-200">
                                  <CheckCircle2 className="h-3 w-3 mr-1" />
                                  Customer chose
                                </Badge>
                              );
                            return null;
                          })()}
                        </div>
                      </TableCell>
                      <TableCell>
                        {project.priority > 0 ? (
                          <Badge variant="destructive">High</Badge>
                        ) : (
                          <span className="text-gray-400">Normal</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {pendingRequests > 0 ? (
                          <Badge variant="secondary">{pendingRequests} pending</Badge>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-gray-500">
                        {new Date(project.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Link href={`/admin/projects/${project.id}`}>
                          <Button variant="outline" size="sm">
                            Manage
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
