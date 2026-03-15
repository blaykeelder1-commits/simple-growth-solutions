// QuickBooks Online OAuth 2.0 Integration
// Uses Intuit's OAuth 2.0 for authorization and QuickBooks API v3 for data
//
// Environment variables needed:
// QUICKBOOKS_CLIENT_ID, QUICKBOOKS_CLIENT_SECRET, QUICKBOOKS_REDIRECT_URI, QUICKBOOKS_API_URL

// ============================================================
// Types
// ============================================================

export interface QuickBooksConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  apiUrl: string;
}

export interface QuickBooksTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  realmId: string;
}

export interface QuickBooksRefreshResult {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface CompanyInfo {
  CompanyName: string;
  LegalName?: string;
  CompanyAddr?: {
    Line1?: string;
    City?: string;
    CountrySubDivisionCode?: string;
    PostalCode?: string;
  };
  Email?: { Address?: string };
  PrimaryPhone?: { FreeFormNumber?: string };
  FiscalYearStartMonth?: string;
  Country?: string;
  Id: string;
}

export interface QBInvoice {
  Id: string;
  DocNumber?: string;
  TotalAmt: number;
  Balance: number;
  DueDate?: string;
  TxnDate?: string;
  CustomerRef?: { value: string; name?: string };
  MetaData?: { CreateTime?: string; LastUpdatedTime?: string };
  EmailStatus?: string;
  // Derived status
  status?: string;
}

export interface QBCustomer {
  Id: string;
  DisplayName: string;
  PrimaryEmailAddr?: { Address?: string };
  PrimaryPhone?: { FreeFormNumber?: string };
  BillAddr?: {
    Line1?: string;
    City?: string;
    CountrySubDivisionCode?: string;
    PostalCode?: string;
  };
  Balance?: number;
  Active?: boolean;
  MetaData?: { CreateTime?: string; LastUpdatedTime?: string };
}

export interface QBPayment {
  Id: string;
  TotalAmt: number;
  TxnDate?: string;
  CustomerRef?: { value: string; name?: string };
  PaymentMethodRef?: { value: string; name?: string };
  PaymentRefNum?: string;
  Line?: {
    Amount: number;
    LinkedTxn?: { TxnId: string; TxnType: string }[];
  }[];
  MetaData?: { CreateTime?: string; LastUpdatedTime?: string };
}

export interface SyncResult {
  clientsSynced: number;
  invoicesSynced: number;
  errors: string[];
}

// ============================================================
// OAuth helpers
// ============================================================

const QB_OAUTH_AUTHORIZE_URL = "https://appcenter.intuit.com/connect/oauth2";
const QB_TOKEN_URL = "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer";

/**
 * Returns the Intuit OAuth authorize URL to start the connection flow.
 */
export function getQuickBooksAuthUrl(state: string): string {
  const config = getQuickBooksConfig();
  if (!config) throw new Error("QuickBooks is not configured");

  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: "code",
    scope: "com.intuit.quickbooks.accounting",
    state,
  });

  return `${QB_OAUTH_AUTHORIZE_URL}?${params.toString()}`;
}

/**
 * Exchange an authorization code for access + refresh tokens.
 */
export async function exchangeCodeForTokens(
  code: string,
  realmId: string
): Promise<QuickBooksTokens> {
  const config = getQuickBooksConfig();
  if (!config) throw new Error("QuickBooks is not configured");

  const basicAuth = Buffer.from(
    `${config.clientId}:${config.clientSecret}`
  ).toString("base64");

  const response = await fetch(QB_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${basicAuth}`,
      Accept: "application/json",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: config.redirectUri,
    }).toString(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to exchange code for tokens: ${error}`);
  }

  const data = await response.json();

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
    realmId,
  };
}

/**
 * Refresh an expired access token.
 */
export async function refreshAccessToken(
  refreshToken: string
): Promise<QuickBooksRefreshResult> {
  const config = getQuickBooksConfig();
  if (!config) throw new Error("QuickBooks is not configured");

  const basicAuth = Buffer.from(
    `${config.clientId}:${config.clientSecret}`
  ).toString("base64");

  const response = await fetch(QB_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${basicAuth}`,
      Accept: "application/json",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }).toString(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to refresh access token: ${error}`);
  }

  const data = await response.json();

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
  };
}

// ============================================================
// QuickBooks API Client
// ============================================================

export class QuickBooksClient {
  private accessToken: string;
  private realmId: string;
  private apiUrl: string;

  constructor(accessToken: string, realmId: string, apiUrl: string) {
    this.accessToken = accessToken;
    this.realmId = realmId;
    this.apiUrl = apiUrl.replace(/\/$/, ""); // strip trailing slash
  }

  private async request<T>(endpoint: string): Promise<T> {
    const url = `${this.apiUrl}/v3/company/${this.realmId}${endpoint}`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(
        `QuickBooks API error: ${response.status} - ${error}`
      );
    }

    return response.json();
  }

  /**
   * GET /v3/company/{realmId}/companyinfo/{realmId}
   */
  async getCompanyInfo(): Promise<CompanyInfo> {
    const data = await this.request<{ CompanyInfo: CompanyInfo }>(
      `/companyinfo/${this.realmId}`
    );
    return data.CompanyInfo;
  }

  /**
   * Fetch invoices via the Query API.
   */
  async getInvoices(options?: {
    modifiedAfter?: string;
    offset?: number;
    limit?: number;
  }): Promise<QBInvoice[]> {
    const conditions: string[] = [];
    if (options?.modifiedAfter) {
      conditions.push(
        `MetaData.LastUpdatedTime > '${options.modifiedAfter}'`
      );
    }

    const where = conditions.length
      ? ` WHERE ${conditions.join(" AND ")}`
      : "";
    const orderBy = " ORDERBY MetaData.LastUpdatedTime DESC";
    const startPosition =
      options?.offset !== undefined ? ` STARTPOSITION ${options.offset + 1}` : "";
    const maxResults =
      options?.limit !== undefined ? ` MAXRESULTS ${options.limit}` : " MAXRESULTS 1000";

    const query = encodeURIComponent(
      `SELECT * FROM Invoice${where}${orderBy}${startPosition}${maxResults}`
    );

    const data = await this.request<{
      QueryResponse: { Invoice?: QBInvoice[] };
    }>(`/query?query=${query}`);

    return data.QueryResponse.Invoice || [];
  }

  /**
   * Fetch customers via the Query API.
   */
  async getCustomers(options?: {
    modifiedAfter?: string;
  }): Promise<QBCustomer[]> {
    const conditions: string[] = [];
    if (options?.modifiedAfter) {
      conditions.push(
        `MetaData.LastUpdatedTime > '${options.modifiedAfter}'`
      );
    }

    const where = conditions.length
      ? ` WHERE ${conditions.join(" AND ")}`
      : "";
    const query = encodeURIComponent(
      `SELECT * FROM Customer${where} MAXRESULTS 1000`
    );

    const data = await this.request<{
      QueryResponse: { Customer?: QBCustomer[] };
    }>(`/query?query=${query}`);

    return data.QueryResponse.Customer || [];
  }

  /**
   * Fetch payments via the Query API.
   */
  async getPayments(options?: {
    modifiedAfter?: string;
  }): Promise<QBPayment[]> {
    const conditions: string[] = [];
    if (options?.modifiedAfter) {
      conditions.push(
        `MetaData.LastUpdatedTime > '${options.modifiedAfter}'`
      );
    }

    const where = conditions.length
      ? ` WHERE ${conditions.join(" AND ")}`
      : "";
    const query = encodeURIComponent(
      `SELECT * FROM Payment${where} MAXRESULTS 1000`
    );

    const data = await this.request<{
      QueryResponse: { Payment?: QBPayment[] };
    }>(`/query?query=${query}`);

    return data.QueryResponse.Payment || [];
  }
}

// ============================================================
// Sync: QuickBooks → Database
// ============================================================

/**
 * Syncs customers and invoices from QuickBooks into the Client and Invoice tables.
 *
 * Mapping:
 *   Customer.DisplayName → Client.name
 *   Customer.PrimaryEmailAddr → Client.email
 *   Customer.PrimaryPhone → Client.phone
 *   Customer.Balance → Client.totalOutstanding
 *
 *   Invoice.DocNumber → Invoice.invoiceNumber
 *   Invoice.TotalAmt → Invoice.amount
 *   Invoice.Balance → outstanding (amount - amountPaid)
 *   Invoice.DueDate → Invoice.dueDate
 *   Invoice status: Balance=0 → paid, DueDate<today & Balance>0 → overdue, else → pending (mapped to "sent")
 */
export async function syncQuickBooksToDatabase(
  client: QuickBooksClient,
  organizationId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  prisma: any
): Promise<SyncResult> {
  const result: SyncResult = {
    clientsSynced: 0,
    invoicesSynced: 0,
    errors: [],
  };

  // ----------------------------------------------------------
  // 1. Sync Customers → Client table
  // ----------------------------------------------------------
  const customerIdMap = new Map<string, string>(); // QB Id → local Client.id

  try {
    const customers = await client.getCustomers();

    for (const cust of customers) {
      try {
        const upserted = await prisma.client.upsert({
          where: {
            organizationId_externalId: {
              organizationId,
              externalId: cust.Id,
            },
          },
          update: {
            name: cust.DisplayName,
            email: cust.PrimaryEmailAddr?.Address || null,
            phone: cust.PrimaryPhone?.FreeFormNumber || null,
            quickbooksId: cust.Id,
            totalOutstanding: cust.Balance ?? 0,
          },
          create: {
            organizationId,
            externalId: cust.Id,
            quickbooksId: cust.Id,
            name: cust.DisplayName,
            email: cust.PrimaryEmailAddr?.Address || null,
            phone: cust.PrimaryPhone?.FreeFormNumber || null,
            totalOutstanding: cust.Balance ?? 0,
          },
        });

        customerIdMap.set(cust.Id, upserted.id);
        result.clientsSynced++;
      } catch (error) {
        result.errors.push(
          `Failed to sync customer ${cust.Id} (${cust.DisplayName}): ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    }
  } catch (error) {
    result.errors.push(
      `Failed to fetch customers: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }

  // ----------------------------------------------------------
  // 2. Sync Invoices → Invoice table
  // ----------------------------------------------------------
  try {
    const invoices = await client.getInvoices();
    const now = new Date();

    for (const inv of invoices) {
      try {
        // Determine status
        let status: string;
        const balance = inv.Balance ?? 0;
        const totalAmt = inv.TotalAmt ?? 0;
        const dueDate = inv.DueDate ? new Date(inv.DueDate) : null;

        if (balance === 0 && totalAmt > 0) {
          status = "paid";
        } else if (dueDate && dueDate < now && balance > 0) {
          status = "overdue";
        } else {
          status = "sent"; // pending equivalent
        }

        // Calculate days overdue
        let daysOverdue = 0;
        if (dueDate && dueDate < now && balance > 0) {
          daysOverdue = Math.floor(
            (now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)
          );
        }

        // Find the local client ID
        const clientId = inv.CustomerRef?.value
          ? customerIdMap.get(inv.CustomerRef.value) || null
          : null;

        const amountPaid = totalAmt - balance;

        await prisma.invoice.upsert({
          where: {
            organizationId_externalId: {
              organizationId,
              externalId: inv.Id,
            },
          },
          update: {
            invoiceNumber: inv.DocNumber || `QB-${inv.Id}`,
            amount: totalAmt,
            amountPaid: amountPaid > 0 ? amountPaid : 0,
            dueDate: dueDate || new Date(),
            issueDate: inv.TxnDate ? new Date(inv.TxnDate) : new Date(),
            paidDate: status === "paid" ? new Date() : null,
            status,
            daysOverdue,
            clientId,
            quickbooksId: inv.Id,
            source: "sync",
          },
          create: {
            organizationId,
            externalId: inv.Id,
            quickbooksId: inv.Id,
            invoiceNumber: inv.DocNumber || `QB-${inv.Id}`,
            amount: totalAmt,
            amountPaid: amountPaid > 0 ? amountPaid : 0,
            dueDate: dueDate || new Date(),
            issueDate: inv.TxnDate ? new Date(inv.TxnDate) : new Date(),
            paidDate: status === "paid" ? new Date() : null,
            status,
            daysOverdue,
            clientId,
            source: "sync",
          },
        });

        result.invoicesSynced++;
      } catch (error) {
        result.errors.push(
          `Failed to sync invoice ${inv.Id}: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    }
  } catch (error) {
    result.errors.push(
      `Failed to fetch invoices: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }

  return result;
}

// ============================================================
// Config helper
// ============================================================

export function getQuickBooksConfig(): QuickBooksConfig | null {
  const clientId = process.env.QUICKBOOKS_CLIENT_ID;
  const clientSecret = process.env.QUICKBOOKS_CLIENT_SECRET;
  const redirectUri =
    process.env.QUICKBOOKS_REDIRECT_URI ||
    `${process.env.NEXTAUTH_URL}/api/integrations/quickbooks/callback`;
  const apiUrl =
    process.env.QUICKBOOKS_API_URL || "https://quickbooks.api.intuit.com";

  if (!clientId || !clientSecret) {
    return null;
  }

  return { clientId, clientSecret, redirectUri, apiUrl };
}
