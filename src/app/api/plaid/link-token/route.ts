// Plaid Link Token API
// Creates a link token for initializing Plaid Link

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPlaidConfig, createLinkToken } from "@/lib/integrations/plaid";

export async function POST() {
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

    const config = getPlaidConfig();

    if (!config) {
      return NextResponse.json(
        {
          error: "Bank integration is not configured",
          message: "Please configure Plaid credentials to enable bank account connectivity.",
        },
        { status: 503 }
      );
    }

    const linkToken = await createLinkToken(
      config,
      user.id,
      user.organizationId
    );

    return NextResponse.json({
      linkToken: linkToken.linkToken,
      expiration: linkToken.expiration,
    });
  } catch (error) {
    console.error("[Plaid API] Error creating link token:", error);

    return NextResponse.json(
      { error: "Failed to create bank connection link" },
      { status: 500 }
    );
  }
}
