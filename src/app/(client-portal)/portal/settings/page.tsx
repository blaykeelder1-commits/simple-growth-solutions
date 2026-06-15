"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, User, Building, Bell } from "lucide-react";

interface Settings {
  name: string;
  email: string;
  organizationName: string;
  industry: string;
}

export default function SettingsPage() {
  const [form, setForm] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/portal/settings");
        const data = await res.json();
        if (data.success) setForm(data.settings);
        else setError("Couldn't load your settings.");
      } catch {
        setError("Couldn't load your settings.");
      }
    })();
  }, []);

  const handleSave = async () => {
    if (!form) return;
    setLoading(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch("/api/portal/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          organizationName: form.organizationName,
          industry: form.industry,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || "Save failed");
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save your changes.");
    } finally {
      setLoading(false);
    }
  };

  if (!form) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-500">
        {error ? (
          <p className="text-red-600">{error}</p>
        ) : (
          <Loader2 className="h-6 w-6 animate-spin" />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600">Manage your account and preferences</p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Profile settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-gray-500" />
            <CardTitle>Profile</CardTitle>
          </div>
          <CardDescription>Your personal information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Your name"
            />
          </div>

          <div>
            <Label htmlFor="email">Email Address</Label>
            <Input id="email" type="email" value={form.email} disabled />
            <p className="text-sm text-gray-500 mt-1">
              Contact support to change your email address
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Organization settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Building className="h-5 w-5 text-gray-500" />
            <CardTitle>Organization</CardTitle>
          </div>
          <CardDescription>Your business information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="orgName">Organization Name</Label>
            <Input
              id="orgName"
              value={form.organizationName}
              onChange={(e) =>
                setForm({ ...form, organizationName: e.target.value })
              }
              placeholder="Your business name"
            />
          </div>

          <div>
            <Label htmlFor="industry">Industry</Label>
            <Input
              id="industry"
              value={form.industry}
              onChange={(e) => setForm({ ...form, industry: e.target.value })}
              placeholder="e.g., Restaurant, Retail"
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-3">
        <Button onClick={handleSave} disabled={loading}>
          {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {saved ? "Saved!" : "Save Changes"}
        </Button>
        {saved && <span className="text-sm text-emerald-600">Your changes are saved.</span>}
      </div>

      {/* Notifications — honest: these are how we reach you, not fake toggles. */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-gray-500" />
            <CardTitle>Notifications</CardTitle>
          </div>
          <CardDescription>How we keep you updated</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600">
            We email you at <strong>{form.email}</strong> about your project
            status, change requests, and billing. To adjust what you receive,
            just reply to any of our emails or contact support.
          </p>
        </CardContent>
      </Card>

      {/* Account — deletion is handled by support so data removal is verified. */}
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="text-red-600">Delete Account</CardTitle>
          <CardDescription>
            Permanently delete your account and all associated data
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600">
            Account deletion is permanent and removes your projects, requests,
            and billing history. To delete your account, email{" "}
            <a
              href="mailto:hello@simple-growth-solution.com?subject=Delete%20my%20account"
              className="text-red-600 font-medium hover:underline"
            >
              hello@simple-growth-solution.com
            </a>{" "}
            and we&apos;ll confirm and process it within 2 business days.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
