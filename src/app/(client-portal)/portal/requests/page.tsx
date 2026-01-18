"use client";

import { useEffect, useState } from "react";
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
import { Plus, FileText, AlertCircle } from "lucide-react";

interface ChangeRequest {
  id: string;
  title: string;
  description: string;
  type: string;
  priority: string;
  status: string;
  resolution: string | null;
  createdAt: string;
  project: {
    id: string;
    projectName: string;
  };
}

const statusColors: Record<string, { color: string; bgColor: string }> = {
  pending: { color: "text-amber-700", bgColor: "bg-amber-100 border border-amber-200" },
  approved: { color: "text-blue-700", bgColor: "bg-blue-100 border border-blue-200" },
  in_progress: { color: "text-purple-700", bgColor: "bg-purple-100 border border-purple-200" },
  completed: { color: "text-emerald-700", bgColor: "bg-emerald-100 border border-emerald-200" },
  rejected: { color: "text-red-700", bgColor: "bg-red-100 border border-red-200" },
};

const priorityConfig: Record<string, { color: string; bgColor: string; icon?: boolean }> = {
  low: { color: "text-gray-600", bgColor: "bg-gray-100 border border-gray-200" },
  normal: { color: "text-blue-700", bgColor: "bg-blue-100 border border-blue-200" },
  high: { color: "text-orange-700", bgColor: "bg-orange-100 border border-orange-200", icon: true },
  urgent: { color: "text-red-700", bgColor: "bg-red-100 border border-red-200", icon: true },
};

export default function ChangeRequestsPage() {
  const [requests, setRequests] = useState<ChangeRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRequests() {
      try {
        const res = await fetch("/api/change-requests");
        if (res.ok) {
          const data = await res.json();
          setRequests(data.requests || []);
        }
      } catch {
        // Error handled silently - UI shows empty state
      } finally {
        setLoading(false);
      }
    }

    fetchRequests();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Change Requests</h1>
          <p className="text-gray-500 mt-1">
            Request modifications to your website projects
          </p>
        </div>
        <Link href="/portal/requests/new">
          <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-500/25">
            <Plus className="h-4 w-4 mr-2" />
            New Request
          </Button>
        </Link>
      </div>

      {requests.length === 0 ? (
        <Card variant="professional">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center mb-5">
              <FileText className="h-10 w-10 text-purple-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No change requests yet
            </h3>
            <p className="text-gray-500 text-center mb-6 max-w-md">
              Need to update your website? Submit a change request and our team
              will handle it for you.
            </p>
            <Link href="/portal/requests/new">
              <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-500/25">
                Submit a Request
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {requests.map((request) => {
            const status = statusColors[request.status] || statusColors.pending;
            const priority = priorityConfig[request.priority] || priorityConfig.normal;

            return (
              <Card key={request.id} variant="professional" hover="lift">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                        <FileText className="h-6 w-6 text-gray-600" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{request.title}</CardTitle>
                        <CardDescription className="mt-0.5">
                          {request.project.projectName} &bull;{" "}
                          {new Date(request.createdAt).toLocaleDateString()}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Badge className={`${priority.bgColor} ${priority.color} capitalize`}>
                        {priority.icon && <AlertCircle className="h-3 w-3 mr-1" />}
                        {request.priority}
                      </Badge>
                      <Badge className={`${status.bgColor} ${status.color} capitalize`}>
                        {request.status.replace("_", " ")}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 text-sm mb-4">{request.description}</p>

                  {request.resolution && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mt-3">
                      <p className="text-sm font-semibold text-emerald-800 mb-1">Resolution:</p>
                      <p className="text-sm text-emerald-700">{request.resolution}</p>
                    </div>
                  )}

                  <div className="flex justify-end mt-4">
                    <Link href={`/portal/projects/${request.project.id}`}>
                      <Button variant="outline" size="sm" className="bg-white/50 hover:bg-white">
                        View Project
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
