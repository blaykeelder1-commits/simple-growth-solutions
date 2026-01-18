"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { NotesEditor } from "@/components/admin/NotesEditor";
import { ArrowLeft, Save, ExternalLink, Loader2 } from "lucide-react";

interface Lead {
  id: string;
  businessName: string;
  contactName: string;
  email: string;
  phone: string | null;
  hasWebsite: boolean;
  websiteUrl: string | null;
  industry: string | null;
  challenges: string | null;
  status: string;
  notes: string | null;
  analysisScore: number | null;
  analysisData: string | null;
  createdAt: string;
  updatedAt: string;
}

const statusOptions = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "scheduled", label: "Scheduled" },
  { value: "converted", label: "Converted" },
];

export default function LeadDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [lead, setLead] = useState<Lead | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [status, setStatus] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    const fetchLead = async () => {
      try {
        const res = await fetch(`/api/leads/${params.id}`);
        const data = await res.json();

        if (data.success) {
          setLead(data.lead);
          setStatus(data.lead.status);
          setNotes(data.lead.notes || "");
        } else {
          setError(data.error || "Failed to fetch lead");
        }
      } catch {
        setError("Failed to fetch lead");
      } finally {
        setIsLoading(false);
      }
    };

    if (params.id) {
      fetchLead();
    }
  }, [params.id]);

  const handleSave = async () => {
    setIsSaving(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch(`/api/leads/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, notes }),
      });

      const data = await res.json();

      if (data.success) {
        setLead(data.lead);
        setSuccess("Changes saved successfully");
        setTimeout(() => setSuccess(""), 3000);
      } else {
        setError(data.error || "Failed to save changes");
      }
    } catch {
      setError("Failed to save changes");
    } finally {
      setIsSaving(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error && !lead) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg">
          {error}
        </div>
      </div>
    );
  }

  if (!lead) return null;

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {lead.businessName}
            </h1>
            <p className="text-gray-500">{lead.contactName}</p>
          </div>
        </div>
        <StatusBadge status={lead.status} className="text-sm px-3 py-1" />
      </div>

      {/* Alerts */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded-lg">
          {success}
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* Contact Info */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Contact Information</h2>

          <div className="space-y-3">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Email</p>
              <a
                href={`mailto:${lead.email}`}
                className="text-blue-600 hover:underline"
              >
                {lead.email}
              </a>
            </div>

            {lead.phone && (
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Phone</p>
                <a
                  href={`tel:${lead.phone}`}
                  className="text-blue-600 hover:underline"
                >
                  {lead.phone}
                </a>
              </div>
            )}

            {lead.websiteUrl && (
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Website</p>
                <a
                  href={lead.websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline inline-flex items-center gap-1"
                >
                  {lead.websiteUrl}
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}

            {lead.industry && (
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Industry</p>
                <p className="text-gray-900">{lead.industry}</p>
              </div>
            )}
          </div>
        </div>

        {/* Business Details */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Business Details</h2>

          <div className="space-y-3">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">
                Has Website
              </p>
              <p className="text-gray-900">{lead.hasWebsite ? "Yes" : "No"}</p>
            </div>

            {lead.challenges && (
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">
                  Challenges
                </p>
                <p className="text-gray-900">{lead.challenges}</p>
              </div>
            )}

            {lead.analysisScore !== null && (
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">
                  Analysis Score
                </p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 rounded-full h-2"
                      style={{ width: `${lead.analysisScore}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-gray-900">
                    {lead.analysisScore}/100
                  </span>
                </div>
              </div>
            )}

            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">
                Submitted
              </p>
              <p className="text-gray-900">{formatDate(lead.createdAt)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Status & Notes */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
        <h2 className="font-semibold text-gray-900">Manage Lead</h2>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div />
        </div>

        <NotesEditor initialNotes={notes} onChange={setNotes} />

        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
