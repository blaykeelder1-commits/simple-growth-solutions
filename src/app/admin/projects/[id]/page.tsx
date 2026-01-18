"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
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
import {
  Globe,
  ArrowLeft,
  ExternalLink,
  Save,
  Loader2,
  CheckCircle2,
} from "lucide-react";

interface Project {
  id: string;
  projectName: string;
  projectType: string;
  status: string;
  priority: number;
  existingUrl: string | null;
  desiredFeatures: string | null;
  designPreferences: string | null;
  targetAudience: string | null;
  deployedUrl: string | null;
  repositoryUrl: string | null;
  deploymentPlatform: string | null;
  estimatedCompletion: string | null;
  createdAt: string;
  organization: {
    id: string;
    name: string;
  };
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

const statusOptions = [
  { value: "submitted", label: "Submitted" },
  { value: "reviewing", label: "Reviewing" },
  { value: "approved", label: "Approved" },
  { value: "in_progress", label: "In Progress" },
  { value: "review_ready", label: "Ready for Review" },
  { value: "revision", label: "Revision Needed" },
  { value: "deployed", label: "Deployed" },
  { value: "completed", label: "Completed" },
];

export default function AdminProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  useSession(); // Auth check handled by layout

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Form state
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState(0);
  const [deployedUrl, setDeployedUrl] = useState("");
  const [repositoryUrl, setRepositoryUrl] = useState("");
  const [deploymentPlatform, setDeploymentPlatform] = useState("");
  const [newNote, setNewNote] = useState("");
  const [noteInternal, setNoteInternal] = useState(true);

  useEffect(() => {
    async function fetchProject() {
      try {
        const res = await fetch(`/api/projects/${params.id}`);
        if (res.ok) {
          const data = await res.json();
          setProject(data.project);
          setStatus(data.project.status);
          setPriority(data.project.priority);
          setDeployedUrl(data.project.deployedUrl || "");
          setRepositoryUrl(data.project.repositoryUrl || "");
          setDeploymentPlatform(data.project.deploymentPlatform || "");
        } else if (res.status === 404) {
          router.push("/admin/projects");
        }
      } catch {
        // Failed to fetch project
      } finally {
        setLoading(false);
      }
    }

    if (params.id) {
      fetchProject();
    }
  }, [params.id, router]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/projects/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          priority,
          deployedUrl: deployedUrl || null,
          repositoryUrl: repositoryUrl || null,
          deploymentPlatform: deploymentPlatform || null,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setProject(data.project);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch {
      // Failed to save
    } finally {
      setSaving(false);
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;

    try {
      const res = await fetch(`/api/admin/projects/${params.id}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: newNote,
          isInternal: noteInternal,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setProject((prev) =>
          prev
            ? { ...prev, projectNotes: [data.note, ...prev.projectNotes] }
            : null
        );
        setNewNote("");
      }
    } catch {
      // Failed to add note
    }
  };

  const handleUpdateRequest = async (requestId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/admin/change-requests/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        setProject((prev) =>
          prev
            ? {
                ...prev,
                changeRequests: prev.changeRequests.map((r) =>
                  r.id === requestId ? { ...r, status: newStatus } : r
                ),
              }
            : null
        );
      }
    } catch {
      // Failed to update request
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!project) {
    return null;
  }

  const features = project.desiredFeatures ? JSON.parse(project.desiredFeatures) : [];
  const preferences = project.designPreferences
    ? JSON.parse(project.designPreferences)
    : {};

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/admin/projects">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
        </Link>
      </div>

      {/* Project header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-xl bg-blue-100 flex items-center justify-center">
                <Globe className="h-7 w-7 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-2xl">{project.projectName}</CardTitle>
                <CardDescription>
                  {project.organization?.name} &bull;{" "}
                  {project.projectType.replace("_", " ")}
                </CardDescription>
              </div>
            </div>
            <div className="flex gap-2">
              {project.deployedUrl && (
                <a
                  href={project.deployedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="outline">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View Site
                  </Button>
                </a>
              )}
              <Button onClick={handleSave} disabled={saving}>
                {saving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : saved ? (
                  <CheckCircle2 className="h-4 w-4 mr-2 text-green-500" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                {saved ? "Saved!" : "Save Changes"}
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column - Project management */}
        <div className="lg:col-span-2 space-y-6">
          {/* Status & deployment */}
          <Card>
            <CardHeader>
              <CardTitle>Project Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Status</Label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {statusOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Priority</Label>
                  <Select
                    value={priority.toString()}
                    onValueChange={(v) => setPriority(parseInt(v))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">Normal</SelectItem>
                      <SelectItem value="1">High</SelectItem>
                      <SelectItem value="2">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Deployment Platform</Label>
                <Select value={deploymentPlatform} onValueChange={setDeploymentPlatform}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select platform" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="vercel">Vercel</SelectItem>
                    <SelectItem value="netlify">Netlify</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Deployed URL</Label>
                <Input
                  placeholder="https://example.com"
                  value={deployedUrl}
                  onChange={(e) => setDeployedUrl(e.target.value)}
                />
              </div>

              <div>
                <Label>Repository URL</Label>
                <Input
                  placeholder="https://github.com/..."
                  value={repositoryUrl}
                  onChange={(e) => setRepositoryUrl(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Change requests */}
          <Card>
            <CardHeader>
              <CardTitle>Change Requests</CardTitle>
              <CardDescription>
                {project.changeRequests.length} total requests
              </CardDescription>
            </CardHeader>
            <CardContent>
              {project.changeRequests.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No change requests</p>
              ) : (
                <div className="space-y-3">
                  {project.changeRequests.map((request) => (
                    <div
                      key={request.id}
                      className="flex items-start justify-between p-3 border rounded-lg"
                    >
                      <div>
                        <div className="font-medium">{request.title}</div>
                        <p className="text-sm text-gray-500 mt-1">
                          {request.description}
                        </p>
                        <div className="flex gap-2 mt-2">
                          <Badge variant="outline">{request.type}</Badge>
                          <Badge variant="outline">{request.priority}</Badge>
                        </div>
                      </div>
                      <Select
                        value={request.status}
                        onValueChange={(v) => handleUpdateRequest(request.id, v)}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="approved">Approved</SelectItem>
                          <SelectItem value="in_progress">In Progress</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="rejected">Rejected</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader>
              <CardTitle>Project Notes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Textarea
                  placeholder="Add a note..."
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                />
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={noteInternal}
                      onChange={(e) => setNoteInternal(e.target.checked)}
                    />
                    Internal note (hidden from client)
                  </label>
                  <Button size="sm" onClick={handleAddNote}>
                    Add Note
                  </Button>
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t">
                {project.projectNotes.map((note) => (
                  <div
                    key={note.id}
                    className={`p-3 rounded-lg ${
                      note.isInternal ? "bg-yellow-50 border-yellow-200" : "bg-blue-50"
                    } border`}
                  >
                    {note.isInternal && (
                      <Badge variant="outline" className="mb-2">
                        Internal
                      </Badge>
                    )}
                    <p className="text-sm">{note.content}</p>
                    <p className="text-xs text-gray-500 mt-2">
                      {new Date(note.createdAt).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right column - Project details */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Client Requirements</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {project.existingUrl && (
                <div>
                  <Label className="text-gray-500">Existing Website</Label>
                  <a
                    href={project.existingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline block"
                  >
                    {project.existingUrl}
                  </a>
                </div>
              )}

              {project.targetAudience && (
                <div>
                  <Label className="text-gray-500">Target Audience</Label>
                  <p>{project.targetAudience}</p>
                </div>
              )}

              {features.length > 0 && (
                <div>
                  <Label className="text-gray-500">Requested Features</Label>
                  <ul className="mt-1 space-y-1">
                    {features.map((feature: string, i: number) => (
                      <li key={i} className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {preferences.style && (
                <div>
                  <Label className="text-gray-500">Preferred Style</Label>
                  <p className="capitalize">{preferences.style}</p>
                </div>
              )}

              {preferences.colors && (
                <div>
                  <Label className="text-gray-500">Brand Colors</Label>
                  <p>{preferences.colors}</p>
                </div>
              )}

              {preferences.references && (
                <div>
                  <Label className="text-gray-500">Reference Sites</Label>
                  <p className="text-sm whitespace-pre-wrap">
                    {preferences.references}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Project Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Created</span>
                <span>{new Date(project.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Project Type</span>
                <span className="capitalize">{project.projectType.replace("_", " ")}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Organization</span>
                <span>{project.organization?.name}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
