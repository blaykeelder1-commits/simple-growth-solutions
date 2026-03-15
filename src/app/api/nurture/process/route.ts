import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { processNurtureQueue } from '@/lib/nurture/engine';
import { apiLogger } from '@/lib/logger';

/**
 * POST /api/nurture/process
 *
 * Cron-triggered endpoint that processes the lead nurture email queue.
 * Sends the next nurture email to all leads that are due.
 *
 * Protected by CRON_SECRET environment variable (for Vercel Cron).
 */
export async function POST(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      apiLogger.error('CRON_SECRET environment variable is not set');
      return NextResponse.json(
        { success: false, message: 'Server configuration error' },
        { status: 500 }
      );
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const result = await processNurtureQueue(prisma);

    apiLogger.info(result, 'Nurture queue processing complete');

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    apiLogger.error({ err: error }, 'Nurture process endpoint error');
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
