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
import {
  Settings,
  CheckCircle2,
  XCircle,
  RefreshCw,
  AlertCircle,
} from "lucide-react";

interface Integration {
  id: string;
  provider: string;
  status: string;
  lastSyncAt: string | null;
  lastSyncStatus: string | null;
  syncError: string | null;
}

const integrationConfig: Record<string, {
  name: string;
  description: string;
  category: string;
  icon: string;
  color: string;
}> = {
  quickbooks: {
    name: "QuickBooks",
    description: "Sync invoices, payments, and financial data",
    category: "Accounting",
    icon: "Q",
    color: "from-green-400 to-green-600",
  },
  xero: {
    name: "Xero",
    description: "Connect your Xero accounting data",
    category: "Accounting",
    icon: "X",
    color: "from-blue-400 to-cyan-500",
  },
  square: {
    name: "Square",
    description: "Import sales, transactions, and inventory",
    category: "POS",
    icon: "S",
    color: "from-blue-500 to-blue-700",
  },
  clover: {
    name: "Clover",
    description: "Connect Clover POS data",
    category: "POS",
    icon: "C",
    color: "from-green-500 to-emerald-600",
  },
  toast: {
    name: "Toast",
    description: "Restaurant POS integration",
    category: "POS",
    icon: "T",
    color: "from-orange-500 to-red-500",
  },
  google_business: {
    name: "Google Business",
    description: "Monitor reviews and local presence",
    category: "Reviews",
    icon: "G",
    color: "from-red-400 to-yellow-500",
  },
  yelp: {
    name: "Yelp",
    description: "Track Yelp reviews and ratings",
    category: "Reviews",
    icon: "Y",
    color: "from-red-500 to-red-700",
  },
};

const statusConfig: Record<string, { label: string; color: string; bgColor: string; icon: React.ElementType }> = {
  connected: { label: "Connected", color: "text-emerald-700", bgColor: "bg-emerald-100 border border-emerald-200", icon: CheckCircle2 },
  disconnected: { label: "Not Connected", color: "text-gray-600", bgColor: "bg-gray-100 border border-gray-200", icon: XCircle },
  error: { label: "Error", color: "text-red-700", bgColor: "bg-red-100 border border-red-200", icon: AlertCircle },
  expired: { label: "Expired", color: "text-amber-700", bgColor: "bg-amber-100 border border-amber-200", icon: AlertCircle },
};

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncingId, setSyncingId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchIntegrations() {
      try {
        setError(null);
        const res = await fetch("/api/integrations");
        if (res.ok) {
          const data = await res.json();
          setIntegrations(data.integrations || []);
        } else {
          const errorData = await res.json().catch(() => ({}));
          setError(errorData.message || "Failed to load integrations");
        }
      } catch (err) {
        console.error("Failed to fetch integrations:", err);
        setError("Unable to connect to server. Please try again later.");
      } finally {
        setLoading(false);
      }
    }

    fetchIntegrations();
  }, []);

  const handleConnect = async (provider: string) => {
    // In production, this would redirect to OAuth flow
    alert(`OAuth flow for ${provider} would start here`);
  };

  const handleSync = async (integrationId: string) => {
    try {
      setSyncingId(integrationId);
      const res = await fetch(`/api/integrations/${integrationId}/sync`, {
        method: "POST",
      });
      if (res.ok) {
        // Refresh integrations
        const updatedRes = await fetch("/api/integrations");
        if (updatedRes.ok) {
          const data = await updatedRes.json();
          setIntegrations(data.integrations || []);
        }
      } else {
        const errorData = await res.json().catch(() => ({}));
        alert(errorData.message || "Sync failed. Please try again.");
      }
    } catch (err) {
      console.error("Sync failed:", err);
      alert("Sync failed. Please check your connection and try again.");
    } finally {
      setSyncingId(null);
    }
  };

  const getIntegrationStatus = (provider: string): Integration | null => {
    return integrations.find((i) => i.provider === provider) || null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
          <AlertCircle className="h-8 w-8 text-red-600" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Something went wrong</h2>
        <p className="text-gray-500 mb-4">{error}</p>
        <Button onClick={() => window.location.reload()} variant="outline">
          Try Again
        </Button>
      </div>
    );
  }

  const categories = ["Accounting", "POS", "Reviews"];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Integrations</h1>
        <p className="text-gray-500 mt-1">
          Connect your business tools to get AI-powered insights
        </p>
      </div>

      {categories.map((category) => {
        const categoryIntegrations = Object.entries(integrationConfig).filter(
          ([, config]) => config.category === category
        );

        return (
          <Card key={category} variant="professional">
            <CardHeader>
              <CardTitle className="text-lg">{category}</CardTitle>
              <CardDescription>
                {category === "Accounting" && "Sync financial data from your accounting software"}
                {category === "POS" && "Connect your point of sale system for sales data"}
                {category === "Reviews" && "Monitor your online reputation"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                {categoryIntegrations.map(([provider, config]) => {
                  const integration = getIntegrationStatus(provider);
                  const status = integration
                    ? statusConfig[integration.status] || statusConfig.disconnected
                    : statusConfig.disconnected;
                  const StatusIcon = status.icon;
                  const isConnected = integration?.status === "connected";

                  return (
                    <div
                      key={provider}
                      className={`integration-card ${isConnected ? "integration-card-connected" : ""}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4">
                          <div className={`h-14 w-14 rounded-xl bg-gradient-to-br ${config.color} flex items-center justify-center text-2xl font-bold text-white shadow-lg`}>
                            {config.icon}
                          </div>
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900">{config.name}</h4>
                            <p className="text-sm text-gray-500 mt-0.5">{config.description}</p>
                            {integration?.lastSyncAt && (
                              <p className="text-xs text-gray-400 mt-2">
                                Last sync: {new Date(integration.lastSyncAt).toLocaleString()}
                              </p>
                            )}
                            {integration?.syncError && (
                              <p className="text-xs text-red-500 mt-1">
                                {integration.syncError}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                        <Badge className={`${status.bgColor} ${status.color}`}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {status.label}
                        </Badge>
                        {integration?.status === "connected" ? (
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleSync(integration.id)}
                              disabled={syncingId === integration.id}
                              className="bg-white/50 hover:bg-white"
                            >
                              <RefreshCw className={`h-3 w-3 mr-1 ${syncingId === integration.id ? "animate-spin" : ""}`} />
                              {syncingId === integration.id ? "Syncing..." : "Sync"}
                            </Button>
                            <Button variant="outline" size="sm" className="bg-white/50 hover:bg-white">
                              <Settings className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => handleConnect(provider)}
                            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md shadow-blue-500/25"
                          >
                            Connect
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
