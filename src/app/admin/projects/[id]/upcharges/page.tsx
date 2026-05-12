"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Loader2, ExternalLink } from "lucide-react";
import { UPCHARGE_CATALOG } from "@/lib/upcharges/catalog";

interface UpchargeRow {
  id: string;
  description: string;
  amountCents: number;
  status: string;
  squarePaymentLinkUrl: string | null;
  paidAt: string | null;
  createdAt: string;
}

const statusBadge: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800 border border-amber-200",
  paid: "bg-emerald-100 text-emerald-800 border border-emerald-200",
  failed: "bg-red-100 text-red-700 border border-red-200",
  canceled: "bg-gray-100 text-gray-700 border border-gray-200",
};

export default function ProjectUpchargesPage() {
  const params = useParams<{ id: string }>();
  const projectId = params.id;

  const [charges, setCharges] = useState<UpchargeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [templateId, setTemplateId] = useState<string>("custom_other");
  const [description, setDescription] = useState("");
  const [amountDollars, setAmountDollars] = useState("");
  const [error, setError] = useState<string | null>(null);

  const selectedTemplate = useMemo(
    () => UPCHARGE_CATALOG.find((t) => t.id === templateId) ?? null,
    [templateId]
  );

  // Prefill description + amount when a template is picked.
  useEffect(() => {
    if (!selectedTemplate || selectedTemplate.id === "custom_other") return;
    setDescription(selectedTemplate.description);
    setAmountDollars((selectedTemplate.amountCents / 100).toString());
  }, [selectedTemplate]);

  const fetchCharges = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/projects/${projectId}/upcharges`);
      if (res.ok) {
        const data = await res.json();
        setCharges(data.charges || []);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCharges();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setCreating(true);
    try {
      const amountCents = Math.round(parseFloat(amountDollars) * 100);
      if (!amountCents || amountCents <= 0) {
        throw new Error("Amount must be greater than zero");
      }
      const res = await fetch(`/api/admin/projects/${projectId}/upcharges`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId: templateId === "custom_other" ? undefined : templateId,
          description,
          amountCents,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to create");
      // Reset form + refresh.
      setDescription("");
      setAmountDollars("");
      setTemplateId("custom_other");
      await fetchCharges();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <Link href={`/admin/projects/${projectId}`}>
        <Button variant="ghost" size="sm">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Project
        </Button>
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>Quote a Custom Upcharge</CardTitle>
          <CardDescription>
            Generates a Square Payment Link the customer can pay from their portal.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onCreate} className="space-y-4">
            <div>
              <Label htmlFor="template">Template (optional)</Label>
              <select
                id="template"
                value={templateId}
                onChange={(e) => setTemplateId(e.target.value)}
                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md"
              >
                {UPCHARGE_CATALOG.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                    {t.amountCents > 0 ? ` ($${(t.amountCents / 100).toFixed(0)})` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="What the customer is paying for"
                required
              />
            </div>

            <div>
              <Label htmlFor="amount">Amount (USD) *</Label>
              <Input
                id="amount"
                type="number"
                min="1"
                step="0.01"
                value={amountDollars}
                onChange={(e) => setAmountDollars(e.target.value)}
                placeholder="e.g., 750"
                required
              />
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                {error}
              </div>
            )}

            <Button type="submit" disabled={creating}>
              {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Generate Payment Link
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Existing Upcharges</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-gray-500 text-sm">Loading…</div>
          ) : charges.length === 0 ? (
            <div className="text-gray-500 text-sm">No upcharges yet.</div>
          ) : (
            <ul className="divide-y">
              {charges.map((c) => (
                <li key={c.id} className="py-3 flex items-center justify-between gap-4">
                  <div>
                    <p className="font-medium text-gray-900">
                      ${(c.amountCents / 100).toFixed(2)}
                    </p>
                    <p className="text-sm text-gray-600 line-clamp-2">{c.description}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {new Date(c.createdAt).toLocaleString()}
                      {c.paidAt ? ` · paid ${new Date(c.paidAt).toLocaleDateString()}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge className={statusBadge[c.status] || ""}>{c.status}</Badge>
                    {c.squarePaymentLinkUrl && (
                      <a
                        href={c.squarePaymentLinkUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Button variant="outline" size="sm">
                          <ExternalLink className="h-3.5 w-3.5 mr-1" /> Open
                        </Button>
                      </a>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
