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
  Unplug,
  Star,
  Search,
  X,
} from "lucide-react";

interface Integration {
  id: string;
  provider: string;
  status: string;
  lastSyncAt: string | null;
  lastSyncStatus: string | null;
  syncError: string | null;
  externalAccountId?: string;
}

interface ReviewData {
  rating: number;
  count: number;
  reviews: Array<{
    author?: string;
    userName?: string;
    rating: number;
    text: string;
    time?: string;
    timeCreated?: string;
    relativeTime?: string;
  }>;
  lastSynced: string;
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
  gusto: {
    name: "Gusto",
    description: "Sync employee data and payroll information",
    category: "Payroll",
    icon: "G",
    color: "from-green-400 to-teal-500",
  },
  adp: {
    name: "ADP",
    description: "Connect ADP payroll data",
    category: "Payroll",
    icon: "A",
    color: "from-red-500 to-red-700",
  },
  quickbooks_payroll: {
    name: "QuickBooks Payroll",
    description: "Sync QuickBooks payroll data",
    category: "Payroll",
    icon: "QP",
    color: "from-green-500 to-green-700",
  },
};

const statusConfig: Record<string, { label: string; color: string; bgColor: string; icon: React.ElementType }> = {
  connected: { label: "Connected", color: "text-emerald-700", bgColor: "bg-emerald-100 border border-emerald-200", icon: CheckCircle2 },
  disconnected: { label: "Not Connected", color: "text-gray-600", bgColor: "bg-gray-100 border border-gray-200", icon: XCircle },
  error: { label: "Error", color: "text-red-700", bgColor: "bg-red-100 border border-red-200", icon: AlertCircle },
  expired: { label: "Expired", color: "text-amber-700", bgColor: "bg-amber-100 border border-amber-200", icon: AlertCircle },
};

// Providers that use the business search flow instead of OAuth
const REVIEW_PROVIDERS = ["google_business", "yelp"];

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [disconnectingProvider, setDisconnectingProvider] = useState<string | null>(null);

  // Business search modal state
  const [searchModalProvider, setSearchModalProvider] = useState<string | null>(null);
  const [searchBusinessName, setSearchBusinessName] = useState("");
  const [searchLocation, setSearchLocation] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchResult, setSearchResult] = useState<{
    name: string;
    rating: number;
    address?: string;
    reviewCount?: number;
    totalRatings?: number;
    url?: string;
    categories?: string[];
  } | null>(null);

  // Review data state
  const [reviewData, setReviewData] = useState<{
    google: ReviewData | null;
    yelp: ReviewData | null;
  }>({ google: null, yelp: null });

  const fetchIntegrations = async () => {
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
    }
  };

  const fetchReviewData = async () => {
    try {
      const res = await fetch("/api/reviews");
      if (res.ok) {
        const data = await res.json();
        setReviewData({
          google: data.google || null,
          yelp: data.yelp || null,
        });
      }
    } catch (err) {
      console.error("Failed to fetch review data:", err);
    }
  };

  useEffect(() => {
    async function init() {
      await fetchIntegrations();
      await fetchReviewData();
      setLoading(false);
    }
    init();
  }, []);

  const handleConnect = async (provider: string) => {
    // Review providers use the business search modal
    if (REVIEW_PROVIDERS.includes(provider)) {
      setSearchModalProvider(provider);
      setSearchBusinessName("");
      setSearchLocation("");
      setSearchError(null);
      setSearchResult(null);
      return;
    }

    // Providers with real OAuth flows redirect directly
    const oauthProviders: Record<string, string> = {
      gusto: "/api/integrations/gusto/connect",
      quickbooks: "/api/integrations/quickbooks/connect",
      square: "/api/integrations/square/connect",
    };

    if (oauthProviders[provider]) {
      window.location.href = oauthProviders[provider];
      return;
    }

    // Placeholder for other providers
    alert(`OAuth flow for ${provider} would start here`);
  };

  const handleBusinessSearch = async () => {
    if (!searchModalProvider || !searchBusinessName) return;

    setSearchLoading(true);
    setSearchError(null);
    setSearchResult(null);

    const endpoint =
      searchModalProvider === "google_business"
        ? "/api/integrations/google-business/connect"
        : "/api/integrations/yelp/connect";

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessName: searchBusinessName,
          location: searchLocation,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setSearchResult(data.business);
        // Refresh integrations list
        await fetchIntegrations();
        await fetchReviewData();
      } else {
        setSearchError(
          data.message || "Failed to find business. Try a different search."
        );
      }
    } catch (err) {
      console.error("Business search failed:", err);
      setSearchError("Connection error. Please try again.");
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSync = async (integrationId: string, provider?: string) => {
    // Review providers use the review sync endpoint
    if (provider && REVIEW_PROVIDERS.includes(provider)) {
      const integration = integrations.find(
        (i) => i.provider === provider && i.status === "connected"
      );
      if (!integration?.externalAccountId) {
        alert("No business linked. Please reconnect.");
        return;
      }

      try {
        setSyncingId(integrationId);
        const syncProvider =
          provider === "google_business" ? "google" : "yelp";
        const res = await fetch("/api/reviews/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            provider: syncProvider,
            businessId: integration.externalAccountId,
          }),
        });

        if (res.ok) {
          await fetchIntegrations();
          await fetchReviewData();
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
      return;
    }

    // Standard sync for other providers
    const providerSyncEndpoints: Record<string, string> = {
      gusto: "/api/integrations/gusto/sync",
      quickbooks: "/api/integrations/quickbooks/sync",
      square: "/api/integrations/square/sync",
    };

    const syncUrl =
      provider && providerSyncEndpoints[provider]
        ? providerSyncEndpoints[provider]
        : `/api/integrations/${integrationId}/sync`;

    try {
      setSyncingId(integrationId);
      const res = await fetch(syncUrl, {
        method: "POST",
      });
      if (res.ok) {
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

  const handleDisconnect = async (provider: string) => {
    const providerDisconnectEndpoints: Record<string, string> = {
      gusto: "/api/integrations/gusto/disconnect",
      quickbooks: "/api/integrations/quickbooks/disconnect",
      square: "/api/integrations/square/disconnect",
      google_business: "/api/integrations/google-business/disconnect",
      yelp: "/api/integrations/yelp/disconnect",
    };

    const disconnectUrl = providerDisconnectEndpoints[provider];
    if (!disconnectUrl) {
      alert(`Disconnect not yet implemented for ${provider}`);
      return;
    }

    if (!confirm(`Are you sure you want to disconnect ${integrationConfig[provider]?.name || provider}?`)) {
      return;
    }

    try {
      setDisconnectingProvider(provider);
      const res = await fetch(disconnectUrl, { method: "DELETE" });
      if (res.ok) {
        await fetchIntegrations();
        await fetchReviewData();
      } else {
        const errorData = await res.json().catch(() => ({}));
        alert(errorData.message || "Disconnect failed. Please try again.");
      }
    } catch (err) {
      console.error("Disconnect failed:", err);
      alert("Disconnect failed. Please check your connection and try again.");
    } finally {
      setDisconnectingProvider(null);
    }
  };

  const getIntegrationStatus = (provider: string): Integration | null => {
    return integrations.find((i) => i.provider === provider) || null;
  };

  const getReviewDataForProvider = (provider: string): ReviewData | null => {
    if (provider === "google_business") return reviewData.google;
    if (provider === "yelp") return reviewData.yelp;
    return null;
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

  const categories = ["Accounting", "POS", "Reviews", "Payroll"];

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
                {category === "Payroll" && "Connect payroll providers for staffing insights and hiring recommendations"}
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
                  const providerReviewData = getReviewDataForProvider(provider);

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

                            {/* Review rating and count for connected review providers */}
                            {isConnected && REVIEW_PROVIDERS.includes(provider) && providerReviewData && (
                              <div className="mt-2 flex items-center gap-3">
                                <div className="flex items-center gap-1">
                                  <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                                  <span className="text-sm font-semibold text-gray-900">
                                    {providerReviewData.rating.toFixed(1)}
                                  </span>
                                </div>
                                <span className="text-xs text-gray-500">
                                  {providerReviewData.count.toLocaleString()} reviews
                                </span>
                              </div>
                            )}

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
                              onClick={() => handleSync(integration.id, provider)}
                              disabled={syncingId === integration.id}
                              className="bg-white/50 hover:bg-white"
                            >
                              <RefreshCw className={`h-3 w-3 mr-1 ${syncingId === integration.id ? "animate-spin" : ""}`} />
                              {syncingId === integration.id ? "Syncing..." : "Sync"}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDisconnect(provider)}
                              disabled={disconnectingProvider === provider}
                              className="bg-white/50 hover:bg-white text-red-600 hover:text-red-700 hover:border-red-300"
                            >
                              <Unplug className="h-3 w-3 mr-1" />
                              {disconnectingProvider === provider ? "..." : "Disconnect"}
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

      {/* Business Search Modal for Google Business / Yelp */}
      {searchModalProvider && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">
                Connect {integrationConfig[searchModalProvider]?.name}
              </h3>
              <button
                onClick={() => setSearchModalProvider(null)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {!searchResult ? (
              <>
                <p className="text-sm text-gray-500 mb-4">
                  Search for your business to link it with your account. We will
                  monitor reviews and ratings automatically.
                </p>

                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Business Name
                    </label>
                    <input
                      type="text"
                      value={searchBusinessName}
                      onChange={(e) => setSearchBusinessName(e.target.value)}
                      placeholder="e.g., Joe's Coffee Shop"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleBusinessSearch();
                      }}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Location
                    </label>
                    <input
                      type="text"
                      value={searchLocation}
                      onChange={(e) => setSearchLocation(e.target.value)}
                      placeholder="e.g., San Francisco, CA"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleBusinessSearch();
                      }}
                    />
                  </div>
                </div>

                {searchError && (
                  <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-700">{searchError}</p>
                  </div>
                )}

                <div className="flex justify-end gap-3 mt-6">
                  <Button
                    variant="outline"
                    onClick={() => setSearchModalProvider(null)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleBusinessSearch}
                    disabled={searchLoading || !searchBusinessName}
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                  >
                    {searchLoading ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Searching...
                      </>
                    ) : (
                      <>
                        <Search className="h-4 w-4 mr-2" />
                        Find Business
                      </>
                    )}
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <span className="text-sm font-medium text-green-800">
                      Business Connected!
                    </span>
                  </div>
                  <h4 className="font-semibold text-gray-900">
                    {searchResult.name}
                  </h4>
                  {searchResult.address && (
                    <p className="text-sm text-gray-600 mt-1">
                      {searchResult.address}
                    </p>
                  )}
                  <div className="flex items-center gap-3 mt-2">
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                      <span className="text-sm font-semibold text-gray-900">
                        {searchResult.rating?.toFixed(1) || "N/A"}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500">
                      {(
                        searchResult.totalRatings ||
                        searchResult.reviewCount ||
                        0
                      ).toLocaleString()}{" "}
                      reviews
                    </span>
                  </div>
                  {searchResult.categories &&
                    searchResult.categories.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {searchResult.categories.map((cat) => (
                          <span
                            key={cat}
                            className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full"
                          >
                            {cat}
                          </span>
                        ))}
                      </div>
                    )}
                </div>

                <div className="flex justify-end">
                  <Button onClick={() => setSearchModalProvider(null)}>
                    Done
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
