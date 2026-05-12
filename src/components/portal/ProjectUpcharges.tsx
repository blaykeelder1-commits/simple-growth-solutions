"use client";

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
import { CreditCard, Sparkles } from "lucide-react";

interface Charge {
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

export function ProjectUpcharges({ projectId }: { projectId: string }) {
  const [charges, setCharges] = useState<Charge[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/projects/${projectId}/upcharges`);
        if (res.ok) {
          const data = await res.json();
          if (!cancelled) setCharges(data.charges || []);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  if (loading) return null;
  if (charges.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-purple-600" />
          <CardTitle className="text-lg">Custom Add-Ons</CardTitle>
        </div>
        <CardDescription>
          Quoted custom work for this project. Pay via Square — work begins once
          payment is confirmed.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="divide-y">
          {charges.map((c) => (
            <li key={c.id} className="py-4 flex items-start justify-between gap-4">
              <div className="flex-1">
                <p className="font-semibold text-gray-900">
                  ${(c.amountCents / 100).toFixed(2)}{" "}
                  <span className="font-normal text-gray-500">— {c.description}</span>
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  Quoted {new Date(c.createdAt).toLocaleDateString()}
                  {c.paidAt ? ` · paid ${new Date(c.paidAt).toLocaleDateString()}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge className={statusBadge[c.status] || ""}>{c.status}</Badge>
                {c.status === "pending" && c.squarePaymentLinkUrl && (
                  <a href={c.squarePaymentLinkUrl} target="_blank" rel="noopener noreferrer">
                    <Button size="sm" className="bg-purple-600 hover:bg-purple-700 text-white">
                      <CreditCard className="h-3.5 w-3.5 mr-1.5" /> Pay
                    </Button>
                  </a>
                )}
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
