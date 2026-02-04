// Plaid Integration
// Shared bank account connectivity for CashFlow AI and Business Chauffeur
// Provides real-time bank data, transaction history, and balance information

import { Configuration, PlaidApi, PlaidEnvironments, Products, CountryCode } from "plaid";

// Plaid configuration
export interface PlaidConfig {
  clientId: string;
  secret: string;
  environment: "sandbox" | "development" | "production";
}

// Bank account types
export interface PlaidAccount {
  accountId: string;
  name: string;
  officialName: string | null;
  type: "depository" | "credit" | "loan" | "investment" | "other";
  subtype: string | null;
  mask: string | null;
  balances: {
    available: number | null;
    current: number;
    limit: number | null;
    isoCurrencyCode: string | null;
  };
}

export interface PlaidTransaction {
  transactionId: string;
  accountId: string;
  amount: number; // Positive = debit (money out), Negative = credit (money in)
  date: string;
  name: string;
  merchantName: string | null;
  category: string[];
  categoryId: string | null;
  pending: boolean;
  paymentChannel: "online" | "in store" | "other";
  transactionType: "digital" | "place" | "special" | "unresolved";
}

export interface PlaidInstitution {
  institutionId: string;
  name: string;
  logo: string | null;
  primaryColor: string | null;
  url: string | null;
}

export interface PlaidLinkToken {
  linkToken: string;
  expiration: string;
}

export interface PlaidAccessToken {
  accessToken: string;
  itemId: string;
}

// Bank connection status
export interface BankConnectionStatus {
  connected: boolean;
  lastSync: Date | null;
  institution: PlaidInstitution | null;
  accounts: PlaidAccount[];
  error: string | null;
}

// Monthly cash flow summary
export interface MonthlyCashFlowSummary {
  month: string;
  totalIncome: number;
  totalExpenses: number;
  netCashFlow: number;
  topIncomeCategories: { category: string; amount: number }[];
  topExpenseCategories: { category: string; amount: number }[];
  transactionCount: number;
}

// Get Plaid configuration from environment
export function getPlaidConfig(): PlaidConfig | null {
  const clientId = process.env.PLAID_CLIENT_ID;
  const secret = process.env.PLAID_SECRET;
  const environment = (process.env.PLAID_ENVIRONMENT || "sandbox") as PlaidConfig["environment"];

  if (!clientId || !secret) {
    return null;
  }

  return { clientId, secret, environment };
}

// Create Plaid client
export function createPlaidClient(config: PlaidConfig): PlaidApi {
  const configuration = new Configuration({
    basePath: PlaidEnvironments[config.environment],
    baseOptions: {
      headers: {
        "PLAID-CLIENT-ID": config.clientId,
        "PLAID-SECRET": config.secret,
      },
    },
  });

  return new PlaidApi(configuration);
}

// Create link token for Plaid Link initialization
export async function createLinkToken(
  config: PlaidConfig,
  userId: string,
  _organizationId: string
): Promise<PlaidLinkToken> {
  const client = createPlaidClient(config);

  const response = await client.linkTokenCreate({
    user: { client_user_id: userId },
    client_name: "Simple Growth Solutions",
    products: [Products.Transactions, Products.Auth],
    country_codes: [CountryCode.Us],
    language: "en",
    webhook: `${process.env.NEXTAUTH_URL}/api/webhooks/plaid`,
    redirect_uri: `${process.env.NEXTAUTH_URL}/dashboard/settings/bank-accounts`,
    // Include organization ID for tracking
    account_filters: undefined,
  });

  return {
    linkToken: response.data.link_token,
    expiration: response.data.expiration,
  };
}

// Exchange public token for access token after successful Link
export async function exchangePublicToken(
  config: PlaidConfig,
  publicToken: string
): Promise<PlaidAccessToken> {
  const client = createPlaidClient(config);

  const response = await client.itemPublicTokenExchange({
    public_token: publicToken,
  });

  return {
    accessToken: response.data.access_token,
    itemId: response.data.item_id,
  };
}

// Get account balances
export async function getAccountBalances(
  config: PlaidConfig,
  accessToken: string
): Promise<PlaidAccount[]> {
  const client = createPlaidClient(config);

  const response = await client.accountsBalanceGet({
    access_token: accessToken,
  });

  return response.data.accounts.map((account) => ({
    accountId: account.account_id,
    name: account.name,
    officialName: account.official_name,
    type: account.type as PlaidAccount["type"],
    subtype: account.subtype,
    mask: account.mask,
    balances: {
      available: account.balances.available,
      current: account.balances.current || 0,
      limit: account.balances.limit,
      isoCurrencyCode: account.balances.iso_currency_code,
    },
  }));
}

// Get transactions for date range
export async function getTransactions(
  config: PlaidConfig,
  accessToken: string,
  startDate: string, // YYYY-MM-DD
  endDate: string // YYYY-MM-DD
): Promise<PlaidTransaction[]> {
  const client = createPlaidClient(config);

  const allTransactions: PlaidTransaction[] = [];
  let hasMore = true;
  let cursor: string | undefined;

  while (hasMore) {
    const response = await client.transactionsSync({
      access_token: accessToken,
      cursor,
      count: 500,
    });

    const transactions = response.data.added.map((tx) => ({
      transactionId: tx.transaction_id,
      accountId: tx.account_id,
      amount: tx.amount,
      date: tx.date,
      name: tx.name,
      merchantName: tx.merchant_name || null,
      category: tx.category || [],
      categoryId: tx.category_id || null,
      pending: tx.pending,
      paymentChannel: tx.payment_channel as PlaidTransaction["paymentChannel"],
      transactionType: tx.transaction_type as PlaidTransaction["transactionType"],
    }));

    // Filter by date range
    const filtered = transactions.filter(
      (tx) => tx.date >= startDate && tx.date <= endDate
    );

    allTransactions.push(...filtered);

    hasMore = response.data.has_more;
    cursor = response.data.next_cursor;
  }

  return allTransactions;
}

// Get institution details
export async function getInstitution(
  config: PlaidConfig,
  institutionId: string
): Promise<PlaidInstitution> {
  const client = createPlaidClient(config);

  const response = await client.institutionsGetById({
    institution_id: institutionId,
    country_codes: [CountryCode.Us],
    options: {
      include_optional_metadata: true,
    },
  });

  const inst = response.data.institution;

  return {
    institutionId: inst.institution_id,
    name: inst.name,
    logo: inst.logo || null,
    primaryColor: inst.primary_color || null,
    url: inst.url || null,
  };
}

// Calculate monthly cash flow summary from transactions
export function calculateMonthlyCashFlow(
  transactions: PlaidTransaction[],
  month: string // YYYY-MM
): MonthlyCashFlowSummary {
  const monthTransactions = transactions.filter((tx) =>
    tx.date.startsWith(month)
  );

  // In Plaid, positive amounts = money out (expenses), negative = money in (income)
  const income = monthTransactions
    .filter((tx) => tx.amount < 0)
    .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);

  const expenses = monthTransactions
    .filter((tx) => tx.amount > 0)
    .reduce((sum, tx) => sum + tx.amount, 0);

  // Aggregate by category
  const incomeByCategory = new Map<string, number>();
  const expensesByCategory = new Map<string, number>();

  monthTransactions.forEach((tx) => {
    const category = tx.category[0] || "Uncategorized";
    if (tx.amount < 0) {
      incomeByCategory.set(
        category,
        (incomeByCategory.get(category) || 0) + Math.abs(tx.amount)
      );
    } else {
      expensesByCategory.set(
        category,
        (expensesByCategory.get(category) || 0) + tx.amount
      );
    }
  });

  // Sort categories by amount
  const topIncomeCategories = Array.from(incomeByCategory.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([category, amount]) => ({ category, amount }));

  const topExpenseCategories = Array.from(expensesByCategory.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([category, amount]) => ({ category, amount }));

  return {
    month,
    totalIncome: income,
    totalExpenses: expenses,
    netCashFlow: income - expenses,
    topIncomeCategories,
    topExpenseCategories,
    transactionCount: monthTransactions.length,
  };
}

// Calculate runway based on burn rate
export function calculateRunway(
  currentBalance: number,
  monthlyExpenses: number[],
  monthsToAverage: number = 3
): { days: number; months: number; riskLevel: string } {
  if (monthlyExpenses.length === 0 || currentBalance <= 0) {
    return { days: 0, months: 0, riskLevel: "critical" };
  }

  const recentExpenses = monthlyExpenses.slice(-monthsToAverage);
  const avgMonthlyBurn =
    recentExpenses.reduce((sum, exp) => sum + exp, 0) / recentExpenses.length;

  if (avgMonthlyBurn <= 0) {
    return { days: Infinity, months: Infinity, riskLevel: "healthy" };
  }

  const months = currentBalance / avgMonthlyBurn;
  const days = Math.round(months * 30);

  let riskLevel: string;
  if (months >= 6) {
    riskLevel = "healthy";
  } else if (months >= 3) {
    riskLevel = "caution";
  } else if (months >= 1) {
    riskLevel = "warning";
  } else {
    riskLevel = "critical";
  }

  return { days, months: Math.round(months * 10) / 10, riskLevel };
}

// Identify recurring transactions (subscriptions, regular payments)
export function identifyRecurringTransactions(
  transactions: PlaidTransaction[],
  minOccurrences: number = 2
): {
  name: string;
  amount: number;
  frequency: "weekly" | "monthly" | "quarterly";
  occurrences: number;
  lastDate: string;
}[] {
  // Group by merchant name and approximate amount (within 10%)
  const transactionGroups = new Map<string, PlaidTransaction[]>();

  transactions.forEach((tx) => {
    const key = `${tx.merchantName || tx.name}_${Math.round(tx.amount / 5) * 5}`;
    if (!transactionGroups.has(key)) {
      transactionGroups.set(key, []);
    }
    transactionGroups.get(key)!.push(tx);
  });

  const recurring: ReturnType<typeof identifyRecurringTransactions> = [];

  transactionGroups.forEach((txs, _key) => {
    if (txs.length < minOccurrences) return;

    // Sort by date
    const sorted = txs.sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // Calculate average interval between transactions
    let totalDays = 0;
    for (let i = 1; i < sorted.length; i++) {
      const prev = new Date(sorted[i - 1].date);
      const curr = new Date(sorted[i].date);
      totalDays += (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);
    }
    const avgDays = totalDays / (sorted.length - 1);

    // Determine frequency
    let frequency: "weekly" | "monthly" | "quarterly";
    if (avgDays <= 10) {
      frequency = "weekly";
    } else if (avgDays <= 45) {
      frequency = "monthly";
    } else {
      frequency = "quarterly";
    }

    // Calculate average amount
    const avgAmount = txs.reduce((sum, tx) => sum + tx.amount, 0) / txs.length;

    recurring.push({
      name: txs[0].merchantName || txs[0].name,
      amount: Math.round(avgAmount * 100) / 100,
      frequency,
      occurrences: txs.length,
      lastDate: sorted[sorted.length - 1].date,
    });
  });

  // Sort by amount (largest first)
  return recurring.sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount));
}

// Sync bank data to database
export interface BankSyncResult {
  accountsSynced: number;
  transactionsSynced: number;
  errors: string[];
}

export async function syncBankDataToDatabase(
  config: PlaidConfig,
  accessToken: string,
  organizationId: string,
  prisma: {
    bankAccount: { upsert: (args: unknown) => Promise<unknown> };
    bankTransaction: { upsert: (args: unknown) => Promise<unknown> };
  }
): Promise<BankSyncResult> {
  const result: BankSyncResult = {
    accountsSynced: 0,
    transactionsSynced: 0,
    errors: [],
  };

  try {
    // Sync accounts
    const accounts = await getAccountBalances(config, accessToken);

    for (const account of accounts) {
      try {
        await prisma.bankAccount.upsert({
          where: {
            organizationId_plaidAccountId: {
              organizationId,
              plaidAccountId: account.accountId,
            },
          },
          update: {
            name: account.name,
            officialName: account.officialName,
            type: account.type,
            subtype: account.subtype,
            mask: account.mask,
            availableBalance: account.balances.available,
            currentBalance: account.balances.current,
            limitAmount: account.balances.limit,
            currency: account.balances.isoCurrencyCode || "USD",
            lastSynced: new Date(),
          },
          create: {
            organizationId,
            plaidAccountId: account.accountId,
            name: account.name,
            officialName: account.officialName,
            type: account.type,
            subtype: account.subtype,
            mask: account.mask,
            availableBalance: account.balances.available,
            currentBalance: account.balances.current,
            limitAmount: account.balances.limit,
            currency: account.balances.isoCurrencyCode || "USD",
          },
        });
        result.accountsSynced++;
      } catch (error) {
        result.errors.push(
          `Failed to sync account ${account.accountId}: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    }

    // Sync transactions (last 30 days by default)
    const endDate = new Date().toISOString().split("T")[0];
    const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];

    const transactions = await getTransactions(
      config,
      accessToken,
      startDate,
      endDate
    );

    for (const tx of transactions) {
      try {
        await prisma.bankTransaction.upsert({
          where: {
            organizationId_plaidTransactionId: {
              organizationId,
              plaidTransactionId: tx.transactionId,
            },
          },
          update: {
            amount: Math.round(tx.amount * 100), // Store in cents
            date: new Date(tx.date),
            name: tx.name,
            merchantName: tx.merchantName,
            category: tx.category,
            pending: tx.pending,
            paymentChannel: tx.paymentChannel,
          },
          create: {
            organizationId,
            plaidTransactionId: tx.transactionId,
            plaidAccountId: tx.accountId,
            amount: Math.round(tx.amount * 100), // Store in cents
            date: new Date(tx.date),
            name: tx.name,
            merchantName: tx.merchantName,
            category: tx.category,
            pending: tx.pending,
            paymentChannel: tx.paymentChannel,
          },
        });
        result.transactionsSynced++;
      } catch (error) {
        // Skip duplicate transaction errors
        if (
          !(
            error instanceof Error &&
            error.message.includes("Unique constraint")
          )
        ) {
          result.errors.push(
            `Failed to sync transaction ${tx.transactionId}: ${error instanceof Error ? error.message : "Unknown error"}`
          );
        }
      }
    }
  } catch (error) {
    result.errors.push(
      `Failed to sync bank data: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }

  return result;
}

// Generate cash flow insights from bank data
export function generateBankInsights(
  accounts: PlaidAccount[],
  transactions: PlaidTransaction[],
  monthsOfData: number = 3
): {
  totalBalance: number;
  availableBalance: number;
  averageMonthlyIncome: number;
  averageMonthlyExpenses: number;
  netCashFlowTrend: "positive" | "neutral" | "negative";
  runway: { days: number; riskLevel: string };
  recurringExpenses: number;
  insights: string[];
} {
  // Calculate total balances
  const totalBalance = accounts.reduce(
    (sum, acc) => sum + acc.balances.current,
    0
  );
  const availableBalance = accounts.reduce(
    (sum, acc) => sum + (acc.balances.available || acc.balances.current),
    0
  );

  // Calculate monthly summaries
  const monthlySummaries: MonthlyCashFlowSummary[] = [];
  const now = new Date();

  for (let i = 0; i < monthsOfData; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    monthlySummaries.push(calculateMonthlyCashFlow(transactions, monthStr));
  }

  // Calculate averages
  const avgIncome =
    monthlySummaries.reduce((sum, m) => sum + m.totalIncome, 0) /
    monthlySummaries.length;
  const avgExpenses =
    monthlySummaries.reduce((sum, m) => sum + m.totalExpenses, 0) /
    monthlySummaries.length;

  // Determine trend
  let trend: "positive" | "neutral" | "negative" = "neutral";
  if (monthlySummaries.length >= 2) {
    const recent = monthlySummaries[0].netCashFlow;
    const previous = monthlySummaries[1].netCashFlow;
    if (recent > previous * 1.1) trend = "positive";
    else if (recent < previous * 0.9) trend = "negative";
  }

  // Calculate runway
  const monthlyExpenses = monthlySummaries.map((m) => m.totalExpenses);
  const runway = calculateRunway(totalBalance, monthlyExpenses);

  // Calculate recurring expenses
  const recurring = identifyRecurringTransactions(transactions);
  const monthlyRecurring = recurring
    .filter((r) => r.frequency === "monthly" && r.amount > 0)
    .reduce((sum, r) => sum + r.amount, 0);

  // Generate insights
  const insights: string[] = [];

  if (runway.riskLevel === "critical") {
    insights.push(
      "Your current cash reserves could cover less than 1 month of expenses at the current burn rate."
    );
  } else if (runway.riskLevel === "warning") {
    insights.push(
      `Your cash runway appears to be approximately ${runway.months} months. You could consider building additional reserves.`
    );
  }

  if (avgExpenses > avgIncome) {
    insights.push(
      `Your average monthly expenses ($${avgExpenses.toLocaleString()}) appear to exceed income ($${avgIncome.toLocaleString()}). You might want to review spending.`
    );
  }

  if (monthlyRecurring > avgIncome * 0.3) {
    insights.push(
      `Recurring expenses represent approximately ${Math.round((monthlyRecurring / avgIncome) * 100)}% of your income. You could review subscriptions for optimization opportunities.`
    );
  }

  if (trend === "positive") {
    insights.push(
      "Your cash flow trend appears positive. You could consider building reserves or investing in growth."
    );
  }

  return {
    totalBalance,
    availableBalance,
    averageMonthlyIncome: avgIncome,
    averageMonthlyExpenses: avgExpenses,
    netCashFlowTrend: trend,
    runway: { days: runway.days, riskLevel: runway.riskLevel },
    recurringExpenses: monthlyRecurring,
    insights,
  };
}
