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
import { Input } from "@/components/ui/input";
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Clock,
  RefreshCw,
  Search,
  Zap,
  Activity,
} from "lucide-react";

interface SecurityScan {
  id: string;
  targetUrl: string;
  overallScore: number | null;
  status: string;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  completedAt: string | null;
  createdAt: string;
}

interface DashboardStats {
  totalScans: number;
  avgScore: number;
  openVulnerabilities: number;
  lastScanDate: string | null;
}

const getScoreGradient = (score: number | null) => {
  if (score === null) return "from-gray-400 to-gray-600";
  if (score >= 80) return "from-emerald-400 to-green-600";
  if (score >= 60) return "from-yellow-400 to-orange-500";
  if (score >= 40) return "from-orange-500 to-red-500";
  return "from-red-500 to-red-700";
};

const getScoreColor = (score: number | null) => {
  if (score === null) return "text-gray-400";
  if (score >= 80) return "text-emerald-600";
  if (score >= 60) return "text-yellow-600";
  if (score >= 40) return "text-orange-600";
  return "text-red-600";
};

const getScoreIcon = (score: number | null) => {
  if (score === null) return Shield;
  if (score >= 80) return ShieldCheck;
  if (score >= 60) return Shield;
  return ShieldAlert;
};

const getScoreLabel = (score: number | null) => {
  if (score === null) return "Unknown";
  if (score >= 80) return "Secure";
  if (score >= 60) return "Moderate";
  if (score >= 40) return "At Risk";
  return "Critical";
};

export default function SecurityDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentScans, setRecentScans] = useState<SecurityScan[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanUrl, setScanUrl] = useState("");
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const [statsRes, scansRes] = await Promise.all([
          fetch("/api/security/stats"),
          fetch("/api/security/scans?limit=5"),
        ]);

        if (statsRes.ok) {
          const data = await statsRes.json();
          setStats(data.stats);
        }

        if (scansRes.ok) {
          const data = await scansRes.json();
          setRecentScans(data.scans || []);
        }
      } catch {
        // Failed to fetch security data
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const handleScan = async () => {
    if (!scanUrl) return;

    setScanning(true);
    try {
      const res = await fetch("/api/security/scans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: scanUrl }),
      });

      if (res.ok) {
        const data = await res.json();
        setRecentScans((prev) => [data.scan, ...prev.slice(0, 4)]);
        setScanUrl("");
      }
    } catch {
      // Scan failed
    } finally {
      setScanning(false);
    }
  };

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
          <h1 className="text-3xl font-bold text-gray-900">Cybersecurity Shield</h1>
          <p className="text-gray-500 mt-1">Monitor and protect your web properties</p>
        </div>
        <Link href="/dashboard/security/scans">
          <Button variant="outline" className="bg-white/50 hover:bg-white">View All Scans</Button>
        </Link>
      </div>

      {/* Security score hero */}
      {stats && (
        <Card variant="gradient" className={`bg-gradient-to-br ${getScoreGradient(stats.avgScore)} overflow-hidden relative`}>
          <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=%2260%22 height=%2260%22 viewBox=%220 0 60 60%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cg fill=%22none%22 fill-rule=%22evenodd%22%3E%3Cg fill=%22%23ffffff%22 fill-opacity=%220.1%22%3E%3Cpath d=%22M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-30" />
          <CardContent className="py-8 relative">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div className="relative">
                  <div className="w-28 h-28 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm border-4 border-white/30">
                    <div className="text-center">
                      <span className="text-5xl font-bold text-white">
                        {stats.avgScore ?? "—"}
                      </span>
                    </div>
                  </div>
                  <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-2 shadow-lg">
                    <ShieldCheck className="h-5 w-5 text-emerald-500" />
                  </div>
                </div>
                <div>
                  <p className="text-white/80 text-sm font-medium uppercase tracking-wider">
                    Average Security Score
                  </p>
                  <p className="text-3xl font-bold text-white mt-1">
                    {getScoreLabel(stats.avgScore ?? null)}
                  </p>
                  <p className="text-white/70 text-sm mt-2">
                    Based on {stats.totalScans} security scans
                  </p>
                </div>
              </div>
              {stats.openVulnerabilities > 0 && (
                <div className="text-right bg-white/10 backdrop-blur-sm rounded-2xl p-5 border border-white/20">
                  <p className="text-white/80 text-sm">Open Vulnerabilities</p>
                  <p className="text-4xl font-bold text-white mt-1">
                    {stats.openVulnerabilities}
                  </p>
                  <div className="flex items-center justify-end gap-1 mt-2 text-white/80">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="text-sm">Needs attention</span>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick scan */}
      <Card variant="professional">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-amber-500" />
            Quick Security Scan
          </CardTitle>
          <CardDescription>
            Enter a URL to scan for security vulnerabilities
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <div className="relative flex-1 search-premium rounded-xl">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="https://example.com"
                className="pl-11 h-12 border-0 bg-transparent focus-visible:ring-0 text-base"
                value={scanUrl}
                onChange={(e) => setScanUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleScan()}
              />
            </div>
            <Button
              onClick={handleScan}
              disabled={scanning || !scanUrl}
              className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-lg shadow-emerald-500/25 h-12 px-6"
            >
              {scanning ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Shield className="h-4 w-4 mr-2" />
              )}
              Scan Now
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stats grid */}
      <div className="grid gap-5 md:grid-cols-4">
        <Card variant="professional" hover="lift" className="stat-card stat-card-green">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Average Score
            </CardTitle>
            <div className="icon-container icon-container-green">
              <ShieldCheck className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${getScoreColor(stats?.avgScore ?? null)}`}>
              {stats?.avgScore ?? "—"}
            </div>
            <p className="text-sm text-gray-500 mt-1">
              {getScoreLabel(stats?.avgScore ?? null)}
            </p>
          </CardContent>
        </Card>

        <Card variant="professional" hover="lift" className="stat-card stat-card-blue">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Total Scans
            </CardTitle>
            <div className="icon-container icon-container-blue">
              <Activity className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{stats?.totalScans ?? 0}</div>
            <p className="text-sm text-gray-500 mt-1">All time</p>
          </CardContent>
        </Card>

        <Card variant="professional" hover="lift" className="stat-card stat-card-orange">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Open Issues
            </CardTitle>
            <div className="icon-container icon-container-orange">
              <AlertTriangle className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">
              {stats?.openVulnerabilities ?? 0}
            </div>
            <p className="text-sm text-gray-500 mt-1">Needs attention</p>
          </CardContent>
        </Card>

        <Card variant="professional" hover="lift" className="stat-card stat-card-purple">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Last Scan
            </CardTitle>
            <div className="icon-container icon-container-purple">
              <Clock className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {stats?.lastScanDate
                ? new Date(stats.lastScanDate).toLocaleDateString()
                : "—"}
            </div>
            <p className="text-sm text-gray-500 mt-1">
              {stats?.lastScanDate ? "Completed" : "No scans yet"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent scans */}
      <Card variant="professional">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg">Recent Scans</CardTitle>
            <CardDescription>Latest security assessments</CardDescription>
          </div>
          <Link href="/dashboard/security/scans">
            <Button variant="outline" size="sm" className="bg-white/50 hover:bg-white">
              View All
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {recentScans.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center mx-auto mb-5">
                <Shield className="h-10 w-10 text-emerald-600" />
              </div>
              <p className="text-gray-600 font-medium">No scans yet</p>
              <p className="text-sm text-gray-500 mt-1">Run your first security scan above</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentScans.map((scan) => {
                const ScoreIcon = getScoreIcon(scan.overallScore);
                const totalIssues =
                  scan.criticalCount + scan.highCount + scan.mediumCount + scan.lowCount;

                return (
                  <Link
                    key={scan.id}
                    href={`/dashboard/security/scans/${scan.id}`}
                    className="block"
                  >
                    <div className="list-item-interactive flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div
                          className={`h-12 w-12 rounded-xl flex items-center justify-center bg-gradient-to-br ${
                            scan.overallScore && scan.overallScore >= 80
                              ? "from-emerald-100 to-green-100"
                              : scan.overallScore && scan.overallScore >= 60
                              ? "from-yellow-100 to-orange-100"
                              : "from-red-100 to-orange-100"
                          }`}
                        >
                          <ScoreIcon
                            className={`h-6 w-6 ${getScoreColor(scan.overallScore)}`}
                          />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{scan.targetUrl}</p>
                          <p className="text-sm text-gray-500">
                            {scan.completedAt
                              ? new Date(scan.completedAt).toLocaleString()
                              : "Scanning..."}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        {scan.status === "completed" ? (
                          <>
                            <div
                              className={`text-3xl font-bold ${getScoreColor(
                                scan.overallScore
                              )}`}
                            >
                              {scan.overallScore}
                            </div>
                            {totalIssues > 0 && (
                              <div className="flex gap-1">
                                {scan.criticalCount > 0 && (
                                  <Badge className="bg-red-100 text-red-800 border border-red-200">
                                    {scan.criticalCount} Critical
                                  </Badge>
                                )}
                                {scan.highCount > 0 && (
                                  <Badge className="bg-orange-100 text-orange-800 border border-orange-200">
                                    {scan.highCount} High
                                  </Badge>
                                )}
                              </div>
                            )}
                          </>
                        ) : (
                          <Badge className="bg-blue-100 text-blue-800 border border-blue-200">
                            <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                            {scan.status}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
