// Square OAuth 2.0 + API Integration
// Uses Square's OAuth 2.0 for authorization and Square API v2 for data
//
// Environment variables needed:
// SQUARE_APPLICATION_ID, SQUARE_APPLICATION_SECRET, SQUARE_ENVIRONMENT (sandbox/production)

// ============================================================
// Types
// ============================================================

export interface SquareConfig {
  applicationId: string;
  applicationSecret: string;
  environment: "sandbox" | "production";
  redirectUri: string;
}

export interface SquareTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  merchantId: string;
}

export interface SquareRefreshResult {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}

export interface Location {
  id: string;
  name: string;
  address?: {
    address_line_1?: string;
    locality?: string;
    administrative_district_level_1?: string;
    postal_code?: string;
    country?: string;
  };
  timezone?: string;
  status?: string;
  merchant_id?: string;
}

export interface Order {
  id: string;
  location_id: string;
  created_at?: string;
  updated_at?: string;
  state?: string;
  total_money?: { amount: number; currency: string };
  total_tax_money?: { amount: number; currency: string };
  total_discount_money?: { amount: number; currency: string };
  line_items?: OrderLineItem[];
}

export interface OrderLineItem {
  uid?: string;
  name?: string;
  quantity: string;
  base_price_money?: { amount: number; currency: string };
  total_money?: { amount: number; currency: string };
  catalog_object_id?: string;
}

export interface Payment {
  id: string;
  created_at?: string;
  updated_at?: string;
  amount_money?: { amount: number; currency: string };
  tip_money?: { amount: number; currency: string };
  total_money?: { amount: number; currency: string };
  status?: string;
  source_type?: string;
  location_id?: string;
  order_id?: string;
}

export interface CatalogItem {
  id: string;
  type: string;
  item_data?: {
    name?: string;
    description?: string;
    variations?: {
      id: string;
      item_variation_data?: {
        name?: string;
        price_money?: { amount: number; currency: string };
      };
    }[];
  };
}

export interface SyncResult {
  locationsSynced: number;
  ordersSynced: number;
  revenue: number;
}

// ============================================================
// OAuth helpers
// ============================================================

function getOAuthBaseUrl(environment: "sandbox" | "production"): string {
  return environment === "sandbox"
    ? "https://connect.squareupsandbox.com"
    : "https://connect.squareup.com";
}

function getApiBaseUrl(environment: "sandbox" | "production"): string {
  return environment === "sandbox"
    ? "https://connect.squareupsandbox.com/v2"
    : "https://connect.squareup.com/v2";
}

const SQUARE_SCOPES = [
  "MERCHANT_PROFILE_READ",
  "PAYMENTS_READ",
  "ORDERS_READ",
  "ITEMS_READ",
  "INVENTORY_READ",
];

/**
 * Returns the Square OAuth authorize URL to start the connection flow.
 */
export function getSquareAuthUrl(state: string): string {
  const config = getSquareConfig();
  if (!config) throw new Error("Square is not configured");

  const baseUrl = getOAuthBaseUrl(config.environment);

  const params = new URLSearchParams({
    client_id: config.applicationId,
    redirect_uri: config.redirectUri,
    response_type: "code",
    scope: SQUARE_SCOPES.join(" "),
    state,
    session: "false",
  });

  return `${baseUrl}/oauth2/authorize?${params.toString()}`;
}

/**
 * Exchange an authorization code for access + refresh tokens.
 */
export async function exchangeCodeForTokens(
  code: string
): Promise<SquareTokens> {
  const config = getSquareConfig();
  if (!config) throw new Error("Square is not configured");

  const baseUrl = getApiBaseUrl(config.environment);

  const response = await fetch(`${baseUrl}/oauth2/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Square-Version": "2024-01-18",
    },
    body: JSON.stringify({
      client_id: config.applicationId,
      client_secret: config.applicationSecret,
      grant_type: "authorization_code",
      code,
      redirect_uri: config.redirectUri,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to exchange code for tokens: ${error}`);
  }

  const data = await response.json();

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: new Date(data.expires_at),
    merchantId: data.merchant_id,
  };
}

/**
 * Refresh an expired access token.
 */
export async function refreshAccessToken(
  refreshToken: string
): Promise<SquareRefreshResult> {
  const config = getSquareConfig();
  if (!config) throw new Error("Square is not configured");

  const baseUrl = getApiBaseUrl(config.environment);

  const response = await fetch(`${baseUrl}/oauth2/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Square-Version": "2024-01-18",
    },
    body: JSON.stringify({
      client_id: config.applicationId,
      client_secret: config.applicationSecret,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to refresh access token: ${error}`);
  }

  const data = await response.json();

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: new Date(data.expires_at),
  };
}

// ============================================================
// Square API Client
// ============================================================

export class SquareClient {
  private accessToken: string;
  private baseUrl: string;

  constructor(accessToken: string, environment: "sandbox" | "production") {
    this.accessToken = accessToken;
    this.baseUrl = getApiBaseUrl(environment);
  }

  private async request<T>(
    endpoint: string,
    options?: { method?: string; body?: unknown }
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const method = options?.method || "GET";

    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.accessToken}`,
      Accept: "application/json",
      "Content-Type": "application/json",
      "Square-Version": "2024-01-18",
    };

    const fetchOptions: RequestInit = { method, headers };
    if (options?.body) {
      fetchOptions.body = JSON.stringify(options.body);
    }

    const response = await fetch(url, fetchOptions);

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Square API error: ${response.status} - ${error}`);
    }

    return response.json();
  }

  /**
   * GET /v2/locations
   */
  async getLocations(): Promise<Location[]> {
    const data = await this.request<{ locations?: Location[] }>("/locations");
    return data.locations || [];
  }

  /**
   * POST /v2/orders/search with date_time_filter
   */
  async getOrders(
    locationId: string,
    options?: { startDate?: string; endDate?: string; cursor?: string }
  ): Promise<{ orders: Order[]; cursor?: string }> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const body: any = {
      location_ids: [locationId],
      limit: 500,
    };

    if (options?.startDate || options?.endDate) {
      body.query = {
        filter: {
          date_time_filter: {
            created_at: {
              ...(options.startDate && { start_at: options.startDate }),
              ...(options.endDate && { end_at: options.endDate }),
            },
          },
        },
        sort: {
          sort_field: "CREATED_AT",
          sort_order: "DESC",
        },
      };
    }

    if (options?.cursor) {
      body.cursor = options.cursor;
    }

    const data = await this.request<{
      orders?: Order[];
      cursor?: string;
    }>("/orders/search", { method: "POST", body });

    return {
      orders: data.orders || [],
      cursor: data.cursor,
    };
  }

  /**
   * GET /v2/payments with query params
   */
  async getPayments(options?: {
    beginTime?: string;
    endTime?: string;
    cursor?: string;
  }): Promise<{ payments: Payment[]; cursor?: string }> {
    const params = new URLSearchParams();

    if (options?.beginTime) params.set("begin_time", options.beginTime);
    if (options?.endTime) params.set("end_time", options.endTime);
    if (options?.cursor) params.set("cursor", options.cursor);

    const queryString = params.toString();
    const endpoint = `/payments${queryString ? `?${queryString}` : ""}`;

    const data = await this.request<{
      payments?: Payment[];
      cursor?: string;
    }>(endpoint);

    return {
      payments: data.payments || [],
      cursor: data.cursor,
    };
  }

  /**
   * GET /v2/catalog/list?types=ITEM
   */
  async getCatalog(): Promise<CatalogItem[]> {
    const allItems: CatalogItem[] = [];
    let cursor: string | undefined;

    do {
      const params = new URLSearchParams({ types: "ITEM" });
      if (cursor) params.set("cursor", cursor);

      const data = await this.request<{
        objects?: CatalogItem[];
        cursor?: string;
      }>(`/catalog/list?${params.toString()}`);

      if (data.objects) {
        allItems.push(...data.objects);
      }
      cursor = data.cursor;
    } while (cursor);

    return allItems;
  }
}

// ============================================================
// Sync: Square → Database
// ============================================================

/**
 * Syncs Square POS data into the BusinessMetric table.
 *
 * 1. Get locations
 * 2. For each location, get today's orders and payments
 * 3. Aggregate: total revenue, transaction count, average ticket
 * 4. Upsert to BusinessMetric table with source='square'
 */
export async function syncSquareToDatabase(
  client: SquareClient,
  organizationId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  prisma: any
): Promise<SyncResult> {
  const result: SyncResult = {
    locationsSynced: 0,
    ordersSynced: 0,
    revenue: 0,
  };

  // Get all locations
  const locations = await client.getLocations();

  // Use today's date range (UTC)
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);

  const startDate = today.toISOString();
  const endDate = tomorrow.toISOString();

  for (const location of locations) {
    if (location.status !== "ACTIVE") continue;

    let totalRevenue = 0;
    let transactionCount = 0;

    // Paginate through all orders for today
    let cursor: string | undefined;
    do {
      const orderResult = await client.getOrders(location.id, {
        startDate,
        endDate,
        cursor,
      });

      for (const order of orderResult.orders) {
        if (order.state === "COMPLETED" && order.total_money) {
          // Square amounts are in smallest currency unit (cents)
          totalRevenue += order.total_money.amount / 100;
          transactionCount++;
          result.ordersSynced++;
        }
      }

      cursor = orderResult.cursor;
    } while (cursor);

    const avgTicket =
      transactionCount > 0 ? totalRevenue / transactionCount : 0;

    // Upsert to BusinessMetric table
    await prisma.businessMetric.upsert({
      where: {
        organizationId_metricDate_period_source: {
          organizationId,
          metricDate: today,
          period: "daily",
          source: "square",
        },
      },
      update: {
        revenue: totalRevenue,
        transactions: transactionCount,
        avgTicket: avgTicket,
        customMetrics: JSON.stringify({
          locationId: location.id,
          locationName: location.name,
          syncedAt: new Date().toISOString(),
        }),
      },
      create: {
        organizationId,
        metricDate: today,
        period: "daily",
        source: "square",
        revenue: totalRevenue,
        transactions: transactionCount,
        avgTicket: avgTicket,
        customMetrics: JSON.stringify({
          locationId: location.id,
          locationName: location.name,
          syncedAt: new Date().toISOString(),
        }),
      },
    });

    result.locationsSynced++;
    result.revenue += totalRevenue;
  }

  return result;
}

// ============================================================
// Config helper
// ============================================================

export function getSquareConfig(): SquareConfig | null {
  const applicationId = process.env.SQUARE_APPLICATION_ID;
  const applicationSecret = process.env.SQUARE_APPLICATION_SECRET;
  const environment = (process.env.SQUARE_ENVIRONMENT || "sandbox") as
    | "sandbox"
    | "production";
  const redirectUri =
    process.env.SQUARE_REDIRECT_URI ||
    `${process.env.NEXTAUTH_URL}/api/integrations/square/callback`;

  if (!applicationId || !applicationSecret) {
    return null;
  }

  return { applicationId, applicationSecret, environment, redirectUri };
}
