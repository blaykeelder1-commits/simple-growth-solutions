// Gusto Payroll Integration
// OAuth connection to Gusto API - Read-only initially

export interface GustoConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export interface GustoTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}

export interface GustoEmployee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  department?: string;
  jobTitle?: string;
  hireDate: string;
  terminationDate?: string;
  paymentMethod?: string;
  status: "active" | "terminated" | "onboarding";
}

export interface GustoPayroll {
  id: string;
  payPeriodStartDate: string;
  payPeriodEndDate: string;
  checkDate: string;
  processed: boolean;
  totals: {
    grossPay: number;
    netPay: number;
    employerTaxes: number;
    employeeDeductions: number;
    benefitsCosts: number;
  };
  employeeCompensations: GustoEmployeeCompensation[];
}

export interface GustoEmployeeCompensation {
  employeeId: string;
  grossPay: number;
  netPay: number;
  regularHours: number;
  overtimeHours: number;
  taxes: {
    name: string;
    amount: number;
  }[];
  deductions: {
    name: string;
    amount: number;
  }[];
}

export interface GustoCompany {
  id: string;
  name: string;
  ein?: string;
  entityType?: string;
  locations?: {
    id: string;
    street1: string;
    city: string;
    state: string;
    zip: string;
  }[];
}

// Gusto API base URL
const GUSTO_API_BASE = "https://api.gusto.com";
const GUSTO_SANDBOX_API_BASE = "https://api.gusto-demo.com";

// Check if we're in sandbox mode
function getApiBase(): string {
  return process.env.GUSTO_SANDBOX === "true"
    ? GUSTO_SANDBOX_API_BASE
    : GUSTO_API_BASE;
}

// Generate OAuth authorization URL
export function getGustoAuthUrl(config: GustoConfig, state: string): string {
  const baseUrl =
    process.env.GUSTO_SANDBOX === "true"
      ? "https://api.gusto-demo.com/oauth/authorize"
      : "https://api.gusto.com/oauth/authorize";

  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: "code",
    state,
  });

  return `${baseUrl}?${params.toString()}`;
}

// Exchange authorization code for tokens
export async function exchangeCodeForTokens(
  config: GustoConfig,
  code: string
): Promise<GustoTokens> {
  const tokenUrl = `${getApiBase()}/oauth/token`;

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri,
      code,
      grant_type: "authorization_code",
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to exchange code: ${error}`);
  }

  const data = await response.json();

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: new Date(Date.now() + data.expires_in * 1000),
  };
}

// Refresh access token
export async function refreshAccessToken(
  config: GustoConfig,
  refreshToken: string
): Promise<GustoTokens> {
  const tokenUrl = `${getApiBase()}/oauth/token`;

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to refresh token: ${error}`);
  }

  const data = await response.json();

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: new Date(Date.now() + data.expires_in * 1000),
  };
}

// Gusto API client class
export class GustoClient {
  private accessToken: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${getApiBase()}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Gusto API error: ${response.status} - ${error}`);
    }

    return response.json();
  }

  // Get current user info
  async getCurrentUser(): Promise<{ email: string; id: string }> {
    return this.request("/v1/me");
  }

  // Get company info
  async getCompany(companyId: string): Promise<GustoCompany> {
    return this.request(`/v1/companies/${companyId}`);
  }

  // Get all employees
  async getEmployees(companyId: string): Promise<GustoEmployee[]> {
    const response = await this.request<GustoEmployee[]>(
      `/v1/companies/${companyId}/employees`
    );
    return response;
  }

  // Get single employee
  async getEmployee(employeeId: string): Promise<GustoEmployee> {
    return this.request(`/v1/employees/${employeeId}`);
  }

  // Get payrolls for a company
  async getPayrolls(
    companyId: string,
    options?: {
      startDate?: string;
      endDate?: string;
      processed?: boolean;
    }
  ): Promise<GustoPayroll[]> {
    const params = new URLSearchParams();
    if (options?.startDate) params.set("start_date", options.startDate);
    if (options?.endDate) params.set("end_date", options.endDate);
    if (options?.processed !== undefined)
      params.set("processed", String(options.processed));

    const query = params.toString() ? `?${params.toString()}` : "";
    return this.request(`/v1/companies/${companyId}/payrolls${query}`);
  }

  // Get single payroll
  async getPayroll(
    companyId: string,
    payrollId: string
  ): Promise<GustoPayroll> {
    return this.request(`/v1/companies/${companyId}/payrolls/${payrollId}`);
  }

  // Get pay periods
  async getPayPeriods(
    companyId: string,
    startDate: string,
    endDate: string
  ): Promise<
    {
      startDate: string;
      endDate: string;
      payScheduleId: string;
    }[]
  > {
    const params = new URLSearchParams({
      start_date: startDate,
      end_date: endDate,
    });
    return this.request(
      `/v1/companies/${companyId}/pay_periods?${params.toString()}`
    );
  }
}

// Sync employees from Gusto to local database
export interface EmployeeSyncResult {
  synced: number;
  created: number;
  updated: number;
  errors: string[];
}

export async function syncEmployeesFromGusto(
  client: GustoClient,
  companyId: string,
  organizationId: string,
  prisma: { employee: { upsert: (args: unknown) => Promise<unknown> } }
): Promise<EmployeeSyncResult> {
  const result: EmployeeSyncResult = {
    synced: 0,
    created: 0,
    updated: 0,
    errors: [],
  };

  try {
    const employees = await client.getEmployees(companyId);

    for (const employee of employees) {
      try {
        const existing = await prisma.employee.upsert({
          where: {
            organizationId_gustoId: {
              organizationId,
              gustoId: employee.id,
            },
          },
          update: {
            name: `${employee.firstName} ${employee.lastName}`,
            email: employee.email,
            role: employee.jobTitle || "Team Member",
            department: employee.department,
            status:
              employee.status === "active"
                ? "active"
                : employee.status === "terminated"
                ? "terminated"
                : "active",
            terminationDate: employee.terminationDate
              ? new Date(employee.terminationDate)
              : null,
          },
          create: {
            organizationId,
            gustoId: employee.id,
            name: `${employee.firstName} ${employee.lastName}`,
            email: employee.email,
            role: employee.jobTitle || "Team Member",
            department: employee.department,
            hireDate: new Date(employee.hireDate),
            status:
              employee.status === "active"
                ? "active"
                : employee.status === "terminated"
                ? "terminated"
                : "active",
          },
        });

        result.synced++;
        const record = existing as { createdAt: Date; updatedAt: Date };
        if (record.createdAt.getTime() === record.updatedAt.getTime()) {
          result.created++;
        } else {
          result.updated++;
        }
      } catch (error) {
        result.errors.push(
          `Failed to sync employee ${employee.id}: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    }
  } catch (error) {
    result.errors.push(
      `Failed to fetch employees: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }

  return result;
}

// Sync payrolls from Gusto to local database
export interface PayrollSyncResult {
  synced: number;
  created: number;
  errors: string[];
}

export async function syncPayrollsFromGusto(
  client: GustoClient,
  companyId: string,
  organizationId: string,
  prisma: { payrollSnapshot: { upsert: (args: unknown) => Promise<unknown> } },
  options?: { startDate?: string; endDate?: string }
): Promise<PayrollSyncResult> {
  const result: PayrollSyncResult = {
    synced: 0,
    created: 0,
    errors: [],
  };

  try {
    const payrolls = await client.getPayrolls(companyId, {
      ...options,
      processed: true,
    });

    for (const payroll of payrolls) {
      try {
        // Convert cents to decimal for storage
        const totalGrossPay = payroll.totals.grossPay;
        const totalNetPay = payroll.totals.netPay;
        const employerTaxes = payroll.totals.employerTaxes;
        const benefitsCost = payroll.totals.benefitsCosts;

        // Calculate overtime cost (sum of overtime hours * implied rate)
        const overtimeCost = payroll.employeeCompensations.reduce(
          (sum, comp) => sum + comp.overtimeHours * (comp.grossPay / 80), // Rough estimate
          0
        );

        await prisma.payrollSnapshot.upsert({
          where: {
            organizationId_periodStart_periodEnd: {
              organizationId,
              periodStart: new Date(payroll.payPeriodStartDate),
              periodEnd: new Date(payroll.payPeriodEndDate),
            },
          },
          update: {
            payDate: new Date(payroll.checkDate),
            totalGrossPay,
            totalNetPay,
            totalTaxWithholdings:
              payroll.employeeCompensations.reduce(
                (sum, comp) =>
                  sum + comp.taxes.reduce((t, tax) => t + tax.amount, 0),
                0
              ),
            totalBenefitsCost: benefitsCost,
            totalOvertimeCost: overtimeCost,
            employerTaxes,
            employeeCount: payroll.employeeCompensations.length,
            gustoPayrollId: payroll.id,
            source: "gusto",
          },
          create: {
            organizationId,
            periodStart: new Date(payroll.payPeriodStartDate),
            periodEnd: new Date(payroll.payPeriodEndDate),
            payDate: new Date(payroll.checkDate),
            totalGrossPay,
            totalNetPay,
            totalTaxWithholdings:
              payroll.employeeCompensations.reduce(
                (sum, comp) =>
                  sum + comp.taxes.reduce((t, tax) => t + tax.amount, 0),
                0
              ),
            totalBenefitsCost: benefitsCost,
            totalOvertimeCost: overtimeCost,
            employerTaxes,
            employeeCount: payroll.employeeCompensations.length,
            gustoPayrollId: payroll.id,
            source: "gusto",
          },
        });

        result.synced++;
        result.created++;
      } catch (error) {
        result.errors.push(
          `Failed to sync payroll ${payroll.id}: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    }
  } catch (error) {
    result.errors.push(
      `Failed to fetch payrolls: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }

  return result;
}

// Get Gusto config from environment
export function getGustoConfig(): GustoConfig | null {
  const clientId = process.env.GUSTO_CLIENT_ID;
  const clientSecret = process.env.GUSTO_CLIENT_SECRET;
  const redirectUri =
    process.env.GUSTO_REDIRECT_URI ||
    `${process.env.NEXTAUTH_URL}/api/integrations/gusto/callback`;

  if (!clientId || !clientSecret) {
    return null;
  }

  return {
    clientId,
    clientSecret,
    redirectUri,
  };
}
