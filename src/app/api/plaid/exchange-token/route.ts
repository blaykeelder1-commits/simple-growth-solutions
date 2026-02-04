// Plaid Exchange Token API
// Exchanges public token from Plaid Link for access token

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  getPlaidConfig,
  exchangePublicToken,
  getAccountBalances,
  getInstitution,
} from "@/lib/integrations/plaid";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { organization: true },
    });

    if (!user?.organizationId) {
      return NextResponse.json(
        { error: "No organization found" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { publicToken, institutionId } = body;

    if (!publicToken) {
      return NextResponse.json(
        { error: "Public token is required" },
        { status: 400 }
      );
    }

    const config = getPlaidConfig();

    if (!config) {
      return NextResponse.json(
        { error: "Bank integration is not configured" },
        { status: 503 }
      );
    }

    // Exchange public token for access token
    const { accessToken, itemId } = await exchangePublicToken(
      config,
      publicToken
    );

    // Get institution details if provided
    let institutionName: string | null = null;
    let institutionLogo: string | null = null;

    if (institutionId) {
      try {
        const institution = await getInstitution(config, institutionId);
        institutionName = institution.name;
        institutionLogo = institution.logo;
      } catch {
        // Institution details are optional
        console.warn("[Plaid] Could not fetch institution details");
      }
    }

    // Store Plaid item in database
    const plaidItem = await prisma.plaidItem.create({
      data: {
        organizationId: user.organizationId,
        accessToken, // In production, encrypt this!
        itemId,
        institutionId: institutionId || null,
        institutionName,
        institutionLogo,
        status: "active",
        lastSynced: new Date(),
      },
    });

    // Fetch and store initial account data
    const accounts = await getAccountBalances(config, accessToken);

    for (const account of accounts) {
      await prisma.bankAccount.create({
        data: {
          organizationId: user.organizationId,
          plaidItemId: plaidItem.id,
          plaidAccountId: account.accountId,
          name: account.name,
          officialName: account.officialName,
          type: account.type,
          subtype: account.subtype,
          mask: account.mask,
          availableBalance: account.balances.available
            ? Math.round(account.balances.available * 100)
            : null,
          currentBalance: Math.round(account.balances.current * 100),
          limitAmount: account.balances.limit
            ? Math.round(account.balances.limit * 100)
            : null,
          currency: account.balances.isoCurrencyCode || "USD",
          lastSynced: new Date(),
        },
      });
    }

    // Log the connection event
    await prisma.auditLog.create({
      data: {
        organizationId: user.organizationId,
        userId: user.id,
        action: "bank_account_connected",
        entityType: "plaid_item",
        entityId: plaidItem.id,
        newValues: {
          institutionName,
          accountCount: accounts.length,
        },
      },
    });

    return NextResponse.json({
      success: true,
      item: {
        id: plaidItem.id,
        institutionName,
        accountCount: accounts.length,
      },
      accounts: accounts.map((a) => ({
        id: a.accountId,
        name: a.name,
        type: a.type,
        mask: a.mask,
        balance: a.balances.current,
      })),
    });
  } catch (error) {
    console.error("[Plaid API] Error exchanging token:", error);

    return NextResponse.json(
      { error: "Failed to connect bank account" },
      { status: 500 }
    );
  }
}
