import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { verifyUnsubscribeToken } from '@/lib/nurture/engine';
import { apiLogger } from '@/lib/logger';

/**
 * GET /api/leads/unsubscribe?id=xxx&token=xxx
 *
 * Unsubscribe a lead from the nurture email sequence.
 * Validates the HMAC token to prevent unauthorized unsubscribes.
 * Returns a simple HTML page confirming the unsubscription.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const token = searchParams.get('token');

  // Validate params
  if (!id || !token) {
    return new NextResponse(unsubscribePage('Invalid unsubscribe link. Please check the link in your email.', false), {
      status: 400,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  // Verify token
  if (!verifyUnsubscribeToken(id, token)) {
    return new NextResponse(unsubscribePage('Invalid or expired unsubscribe link.', false), {
      status: 403,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  try {
    // Check if lead exists
    const lead = await prisma.lead.findUnique({ where: { id } });

    if (!lead) {
      return new NextResponse(unsubscribePage('This lead record was not found.', false), {
        status: 404,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    // Already unsubscribed
    if (lead.nurtureStatus === 'unsubscribed') {
      return new NextResponse(unsubscribePage("You're already unsubscribed. You won't receive any more emails from us.", true), {
        status: 200,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    // Unsubscribe
    await prisma.lead.update({
      where: { id },
      data: {
        nurtureStatus: 'unsubscribed',
        nextNurtureAt: null,
      },
    });

    apiLogger.info({ leadId: id }, 'Lead unsubscribed from nurture sequence');

    return new NextResponse(unsubscribePage("You've been successfully unsubscribed. You won't receive any more emails from us.", true), {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  } catch (error) {
    apiLogger.error({ err: error, leadId: id }, 'Unsubscribe error');
    return new NextResponse(unsubscribePage('Something went wrong. Please try again later.', false), {
      status: 500,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }
}

function unsubscribePage(message: string, success: boolean): string {
  const icon = success ? '&#10003;' : '&#10007;';
  const color = success ? '#10b981' : '#ef4444';

  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Unsubscribe - Simple Growth Solutions</title>
  </head>
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 500px; margin: 80px auto; padding: 20px; text-align: center;">
    <h1 style="color: #2563eb; margin: 0 0 30px 0;">Simple Growth Solutions</h1>
    <div style="background: #f9fafb; border-radius: 12px; padding: 40px 30px; border: 1px solid #e5e7eb;">
      <div style="font-size: 48px; color: ${color}; margin-bottom: 16px;">${icon}</div>
      <p style="font-size: 18px; color: #1f2937; margin: 0;">${message}</p>
    </div>
    <p style="color: #9ca3af; font-size: 13px; margin-top: 30px;">
      If you unsubscribed by mistake, contact us at support@simplegrowthsolutions.com
    </p>
  </body>
</html>`;
}
