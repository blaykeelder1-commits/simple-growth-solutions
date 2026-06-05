"use client";

import { useEffect, useState, useCallback } from "react";

interface PromoCodeRow {
  id: string;
  code: string;
  description: string | null;
  restrictToPlan: string | null;
  maxRedemptions: number | null;
  redeemedCount: number;
  active: boolean;
  expiresAt: string | null;
  createdAt: string;
}

const PLAN_LABELS: Record<string, string> = {
  website_managed: "Managed",
  website_pro: "Managed Pro",
  website_premium: "Managed Premium",
};

function dollars(cents: number) {
  return `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`;
}

export default function PromoCodesPage() {
  const [codes, setCodes] = useState<PromoCodeRow[]>([]);
  const [foundingPrices, setFoundingPrices] = useState<Record<string, number>>({});
  const [standardPrices, setStandardPrices] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create form
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [restrictToPlan, setRestrictToPlan] = useState("");
  const [maxRedemptions, setMaxRedemptions] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/promo-codes");
      const data = await res.json();
      if (data.success) {
        setCodes(data.codes);
        setFoundingPrices(data.foundingPrices || {});
        setStandardPrices(data.standardPrices || {});
        setError(null);
      } else {
        setError(data.message || "Failed to load codes");
      }
    } catch {
      setError("Failed to load codes");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const body: Record<string, unknown> = { code };
      if (description.trim()) body.description = description.trim();
      if (restrictToPlan) body.restrictToPlan = restrictToPlan;
      if (maxRedemptions) body.maxRedemptions = parseInt(maxRedemptions, 10);
      if (expiresAt) body.expiresAt = new Date(expiresAt).toISOString();

      const res = await fetch("/api/admin/promo-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success) {
        setCode("");
        setDescription("");
        setRestrictToPlan("");
        setMaxRedemptions("");
        setExpiresAt("");
        await load();
      } else {
        setError(data.message || "Failed to create code");
      }
    } catch {
      setError("Failed to create code");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleActive = async (row: PromoCodeRow) => {
    try {
      const res = await fetch(`/api/admin/promo-codes/${row.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !row.active }),
      });
      const data = await res.json();
      if (data.success) await load();
    } catch {
      // ignore
    }
  };

  return (
    <div className="max-w-5xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Founding Codes</h1>
        <p className="text-gray-500 mt-1 text-sm">
          Issue promo codes that unlock founding pricing on the website plans.
          Customers enter the code on the pricing page and pay the founding rate
          through the normal Square checkout.
        </p>
      </div>

      {/* Founding price reference */}
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <p className="text-sm font-semibold text-gray-700 mb-2">Current founding rates</p>
        <div className="grid grid-cols-3 gap-4 text-sm">
          {Object.keys(PLAN_LABELS).map((plan) => (
            <div key={plan}>
              <p className="text-gray-500">{PLAN_LABELS[plan]}</p>
              <p className="font-semibold text-purple-600">
                {foundingPrices[plan] != null ? dollars(foundingPrices[plan]) : "—"}
                <span className="ml-2 text-gray-400 line-through font-normal">
                  {standardPrices[plan] != null ? dollars(standardPrices[plan]) : ""}
                </span>
              </p>
            </div>
          ))}
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 px-4 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Create form */}
      <form onSubmit={handleCreate} className="rounded-lg border border-gray-200 bg-white p-4 space-y-4">
        <p className="text-sm font-semibold text-gray-700">Create a code</p>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Code *</label>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
              minLength={3}
              placeholder="FOUNDING50"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm uppercase"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Description</label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="First 10 founding customers"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Restrict to plan</label>
            <select
              value={restrictToPlan}
              onChange={(e) => setRestrictToPlan(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">Any website plan</option>
              {Object.keys(PLAN_LABELS).map((plan) => (
                <option key={plan} value={plan}>
                  {PLAN_LABELS[plan]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Max redemptions</label>
            <input
              type="number"
              min={1}
              value={maxRedemptions}
              onChange={(e) => setMaxRedemptions(e.target.value)}
              placeholder="Unlimited"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Expires at</label>
            <input
              type="datetime-local"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={submitting || code.trim().length < 3}
          className="rounded-md bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50"
        >
          {submitting ? "Creating…" : "Create code"}
        </button>
      </form>

      {/* Codes table */}
      <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3">Code</th>
              <th className="px-4 py-3">Plan</th>
              <th className="px-4 py-3">Redeemed</th>
              <th className="px-4 py-3">Expires</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-gray-400">
                  Loading…
                </td>
              </tr>
            ) : codes.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-gray-400">
                  No codes yet.
                </td>
              </tr>
            ) : (
              codes.map((row) => (
                <tr key={row.id}>
                  <td className="px-4 py-3">
                    <span className="font-mono font-semibold">{row.code}</span>
                    {row.description && (
                      <span className="block text-xs text-gray-400">{row.description}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {row.restrictToPlan ? PLAN_LABELS[row.restrictToPlan] ?? row.restrictToPlan : "Any"}
                  </td>
                  <td className="px-4 py-3">
                    {row.redeemedCount}
                    {row.maxRedemptions != null ? ` / ${row.maxRedemptions}` : ""}
                  </td>
                  <td className="px-4 py-3">
                    {row.expiresAt ? new Date(row.expiresAt).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        row.active
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {row.active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => toggleActive(row)}
                      className="text-xs text-gray-500 hover:text-gray-900 underline"
                    >
                      {row.active ? "Deactivate" : "Activate"}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
