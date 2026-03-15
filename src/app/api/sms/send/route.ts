// SMS Send API Route
// POST: Send an SMS message (authenticated, rate-limited)

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { prisma } from '@/lib/db/prisma';
import { sendSMS } from '@/lib/integrations/twilio';

// In-memory rate limiter: orgId -> { count, windowStart }
const rateLimits = new Map<string, { count: number; windowStart: number }>();
const RATE_LIMIT_MAX = 10; // 10 SMS per minute per org
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute

function checkRateLimit(orgId: string): boolean {
  const now = Date.now();
  const entry = rateLimits.get(orgId);

  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    // New window
    rateLimits.set(orgId, { count: 1, windowStart: now });
    return true;
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return false;
  }

  entry.count++;
  return true;
}

export async function POST(request: NextRequest) {
  try {
    // Authenticate
    const session = await getServerSession(authOptions);
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const orgId = session.user.organizationId;

    // Rate limit check
    if (!checkRateLimit(orgId)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Maximum 10 SMS per minute.' },
        { status: 429 }
      );
    }

    // Parse body
    const body = await request.json();
    const { to, message, clientId, invoiceId } = body as {
      to: string;
      message: string;
      clientId?: string;
      invoiceId?: string;
    };

    // Validate required fields
    if (!to || !message) {
      return NextResponse.json(
        { error: 'Missing required fields: to, message' },
        { status: 400 }
      );
    }

    if (typeof to !== 'string' || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Invalid field types: to and message must be strings' },
        { status: 400 }
      );
    }

    if (message.length > 1600) {
      return NextResponse.json(
        { error: 'Message too long. Maximum 1600 characters.' },
        { status: 400 }
      );
    }

    // If clientId provided, verify client belongs to this org
    if (clientId) {
      const client = await prisma.client.findFirst({
        where: { id: clientId, organizationId: orgId },
        select: { id: true },
      });
      if (!client) {
        return NextResponse.json(
          { error: 'Client not found in your organization' },
          { status: 404 }
        );
      }
    }

    // If invoiceId provided, verify invoice belongs to this org
    if (invoiceId) {
      const invoice = await prisma.invoice.findFirst({
        where: { id: invoiceId, organizationId: orgId },
        select: { id: true, clientId: true },
      });
      if (!invoice) {
        return NextResponse.json(
          { error: 'Invoice not found in your organization' },
          { status: 404 }
        );
      }
    }

    // Send SMS
    const result = await sendSMS(to, message);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to send SMS' },
        { status: 502 }
      );
    }

    // Log to communicationLog
    const resolvedClientId = clientId || (invoiceId
      ? (await prisma.invoice.findUnique({
          where: { id: invoiceId },
          select: { clientId: true },
        }))?.clientId
      : null);

    if (resolvedClientId) {
      await prisma.communicationLog.create({
        data: {
          clientId: resolvedClientId,
          type: 'sms',
          direction: 'outbound',
          content: message,
          emailMessageId: result.messageId,
        },
      });
    }

    return NextResponse.json({
      success: true,
      messageId: result.messageId,
    });
  } catch (error) {
    console.error('[SMS API] Send error:', error);
    return NextResponse.json(
      { error: 'Failed to send SMS' },
      { status: 500 }
    );
  }
}
