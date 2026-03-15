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
  Lock,
  Mail,
  Wifi,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { SubscriptionGate } from "@/components/subscription-gate";

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

interface TrendPoint {
  date: string;
  score: number;
}

interface TrendsData {
  trends: TrendPoint[];
  improving: boolean;
}

// Extended scan result from the API (includes new fields stored as JSON)
interface ScanResultExtended {
  sslExpiration?: {
    expiresAt: string | null;
    daysUntilExpiry: number;
    issuer: string | null;
  };
  emailSecurity?: {
    spf: { found: boolean };
    dmarc: { found: boolean };
    dkim: { found: boolean };
    score: number;
    issues: string[];
  };
  uptime?: {
    up: boolean;
    responseTimeMs: number;
  };
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

function ScoreTrendChart({ trends, improving }: TrendsData) {
  if (trends.length === 0) return null;

  const maxScore = 100;
  const chartHeight = 120;

  return (
    <Card variant="professional">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Activity className="h-5 w-5 text-blue-500" />
              Score Trend
            </CardTitle>
            <CardDescription>Last {trends.length} scans</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {improving ? (
              <Badge className="bg-emerald-100 text-emerald-800 border border-emerald-200">
                <TrendingUp className="h-3 w-3 mr-1" />
                Improving
              </Badge>
            ) : (
              <Badge className="bg-orange-100 text-orange-800 border border-orange-200">
                <TrendingDown className="h-3 w-3 mr-1" />
                Declining
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-end gap-1" style={{ height: chartHeight }}>
          {trends.map((point, index) => {
            const barHeight = Math.max(4, (point.score / maxScore) * chartHeight);
            const barColor =
              point.score >= 80
                ? "bg-emerald-500"
                : point.score >= 60
                ? "bg-yellow-500"
                : point.score >= 40
                ? "bg-orange-500"
                : "bg-red-500";

            return (
              <div
                key={index}
                className="flex-1 flex flex-col items-center justify-end gap-1 group relative"
              >
                {/* Tooltip */}
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">
                  {point.score}/100
                  <br />
                  {new Date(point.date).toLocaleDateString()}
                </div>
                {/* Bar */}
                <div
                  className={`w-full ${barColor} rounded-t transition-all duration-300 hover:opacity-80 min-w-[8px]`}
                  style={{ height: barHeight }}
                />
              </div>
            );
          })}
        </div>
        {/* X-axis labels */}
        <div className="flex items-center gap-1 mt-2">
          {trends.map((point, index) => (
            <div key={index} className="flex-1 text-center">
              {index === 0 || index === trends.length - 1 ? (
                <span className="text-[10px] text-gray-400">
                  {new Date(point.date).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              ) : null}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function SSLExpiryCard({
  sslExpiration,
}: {
  sslExpiration: ScanResultExtended["sslExpiration"];
}) {
  if (!sslExpiration || sslExpiration.expiresAt === null) return null;

  const days = sslExpiration.daysUntilExpiry;
  const isUrgent = days <= 7;
  const isWarning = days <= 30;

  const bgColor = isUrgent
    ? "from-red-50 to-red-100 border-red-200"
    : isWarning
    ? "from-amber-50 to-yellow-100 border-amber-200"
    : "from-emerald-50 to-green-100 border-emerald-200";

  const textColor = isUrgent
    ? "text-red-700"
    : isWarning
    ? "text-amber-700"
    : "text-emerald-700";

  const iconColor = isUrgent
    ? "text-red-500"
    : isWarning
    ? "text-amber-500"
    : "text-emerald-500";

  return (
    <Card variant="professional" hover="lift">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-gray-500">
          SSL Certificate
        </CardTitle>
        <div className={`p-2 rounded-lg bg-gradient-to-br ${bgColor}`}>
          <Lock className={`h-5 w-5 ${iconColor}`} />
        </div>
      </CardHeader>
      <CardContent>
        <div className={`text-3xl font-bold ${textColor}`}>
          {days > 0 ? `${days}d` : "Expired"}
        </div>
        <p className="text-sm text-gray-500 mt-1">
          {days > 0 ? "until expiry" : "Certificate has expired"}
        </p>
        {sslExpiration.issuer && (
          <p className="text-xs text-gray-400 mt-2 truncate">
            Issued by: {sslExpiration.issuer}
          </p>
        )}
        {sslExpiration.expiresAt && (
          <p className="text-xs text-gray-400 mt-1">
            Expires: {new Date(sslExpiration.expiresAt).toLocaleDateString()}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function EmailSecurityCard({
  emailSecurity,
}: {
  emailSecurity: ScanResultExtended["emailSecurity"];
}) {
  if (!emailSecurity) return null;

  const checks = [
    { label: "SPF", found: emailSecurity.spf.found },
    { label: "DMARC", found: emailSecurity.dmarc.found },
    { label: "DKIM", found: emailSecurity.dkim.found },
  ];

  const passedCount = checks.filter((c) => c.found).length;

  return (
    <Card variant="professional" hover="lift">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-gray-500">
          Email Security
        </CardTitle>
        <div className="p-2 rounded-lg bg-gradient-to-br from-blue-50 to-indigo-100 border border-blue-200">
          <Mail className={`h-5 w-5 ${passedCount === 3 ? "text-emerald-500" : passedCount >= 1 ? "text-amber-500" : "text-red-500"}`} />
        </div>
      </CardHeader>
      <CardContent>
        <div className={`text-3xl font-bold ${passedCount === 3 ? "text-emerald-600" : passedCount >= 1 ? "text-amber-600" : "text-red-600"}`}>
          {passedCount}/3
        </div>
        <p className="text-sm text-gray-500 mt-1">checks passed</p>
        <div className="mt-3 space-y-1.5">
          {checks.map((check) => (
            <div key={check.label} className="flex items-center gap-2">
              {check.found ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              ) : (
                <XCircle className="h-4 w-4 text-red-400" />
              )}
              <span
                className={`text-sm ${
                  check.found ? "text-gray-700" : "text-gray-400"
                }`}
              >
                {check.label}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function UptimeCard({
  uptime,
}: {
  uptime: ScanResultExtended["uptime"];
}) {
  if (!uptime) return null;

  return (
    <Card variant="professional" hover="lift">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-gray-500">
          Uptime Status
        </CardTitle>
        <div
          className={`p-2 rounded-lg bg-gradient-to-br ${
            uptime.up
              ? "from-emerald-50 to-green-100 border border-emerald-200"
              : "from-red-50 to-red-100 border border-red-200"
          }`}
        >
          <Wifi
            className={`h-5 w-5 ${
              uptime.up ? "text-emerald-500" : "text-red-500"
            }`}
          />
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2">
          <div
            className={`h-3 w-3 rounded-full ${
              uptime.up ? "bg-emerald-500 animate-pulse" : "bg-red-500"
            }`}
          />
          <span
            className={`text-2xl font-bold ${
              uptime.up ? "text-emerald-600" : "text-red-600"
            }`}
          >
            {uptime.up ? "Online" : "Down"}
          </span>
        </div>
        <p className="text-sm text-gray-500 mt-2">
          Response time: {uptime.responseTimeMs}ms
        </p>
        {uptime.responseTimeMs > 0 && (
          <div className="mt-2">
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  uptime.responseTimeMs < 500
                    ? "bg-emerald-500"
                    : uptime.responseTimeMs < 1500
                    ? "bg-yellow-500"
                    : "bg-red-500"
                }`}
                style={{
                  width: `${Math.min(100, (uptime.responseTimeMs / 3000) * 100)}%`,
                }}
              />
            </div>
            <p className="text-xs text-gray-400 mt-1">
              {uptime.responseTimeMs < 500
                ? "Fast"
                : uptime.responseTimeMs < 1500
                ? "Moderate"
                : "Slow"}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function SecurityDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentScans, setRecentScans] = useState<SecurityScan[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanUrl, setScanUrl] = useState("");
  const [scanning, setScanning] = useState(false);
  const [trends, setTrends] = useState<TrendsData | null>(null);
  const [latestScanExtended, setLatestScanExtended] =
    useState<ScanResultExtended | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const [statsRes, scansRes, trendsRes] = await Promise.all([
          fetch("/api/security/stats"),
          fetch("/api/security/scans?limit=5"),
          fetch("/api/security/trends"),
        ]);

        if (statsRes.ok) {
          const data = await statsRes.json();
          setStats(data.stats);
        }

        if (scansRes.ok) {
          const data = await scansRes.json();
          setRecentScans(data.scans || []);

          // Try to extract extended data from the most recent scan's JSON details
          if (data.scans && data.scans.length > 0) {
            const latestScan = data.scans[0];
            try {
              const extended: ScanResultExtended = {};
              if (latestScan.sslDetails) {
                const sslData = JSON.parse(latestScan.sslDetails);
                // The sslDetails stores the SSL check result, but we also
                // store extended data if available
                if (sslData.sslExpiration) {
                  extended.sslExpiration = sslData.sslExpiration;
                }
              }
              if (latestScan.headerDetails) {
                const headerData = JSON.parse(latestScan.headerDetails);
                if (headerData.emailSecurity) {
                  extended.emailSecurity = headerData.emailSecurity;
                }
                if (headerData.uptime) {
                  extended.uptime = headerData.uptime;
                }
              }
              if (Object.keys(extended).length > 0) {
                setLatestScanExtended(extended);
              }
            } catch {
              // Failed to parse extended data - not critical
            }
          }
        }

        if (trendsRes.ok) {
          const data = await trendsRes.json();
          if (data.trends && data.trends.length > 0) {
            setTrends({ trends: data.trends, improving: data.improving });
          }
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

        // Refresh trends
        try {
          const trendsRes = await fetch("/api/security/trends");
          if (trendsRes.ok) {
            const trendsData = await trendsRes.json();
            if (trendsData.trends && trendsData.trends.length > 0) {
              setTrends({
                trends: trendsData.trends,
                improving: trendsData.improving,
              });
            }
          }
        } catch {
          // Non-critical
        }
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

      <SubscriptionGate requiredPlan="cybersecurity">
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
                        {stats.avgScore ?? "\u2014"}
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

      {/* Score trend chart */}
      {trends && trends.trends.length >= 2 && (
        <ScoreTrendChart trends={trends.trends} improving={trends.improving} />
      )}

      {/* New monitoring cards: SSL, Email Security, Uptime */}
      {latestScanExtended && (
        <div className="grid gap-5 md:grid-cols-3">
          <SSLExpiryCard sslExpiration={latestScanExtended.sslExpiration} />
          <EmailSecurityCard emailSecurity={latestScanExtended.emailSecurity} />
          <UptimeCard uptime={latestScanExtended.uptime} />
        </div>
      )}

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
              {stats?.avgScore ?? "\u2014"}
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
                : "\u2014"}
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
      </SubscriptionGate>
    </div>
  );
}
