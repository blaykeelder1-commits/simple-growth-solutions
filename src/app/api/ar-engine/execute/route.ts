// AR Engine Execution API
// POST: Process scheduled actions (called by cron job or manually)

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { processScheduledActions } from '@/lib/ar-engine/outreach';

// Run scheduled outreach actions
export async function POST(request: NextRequest) {
  try {
    // Check for cron secret or authenticated user
    const cronSecret = request.headers.get('x-cron-secret');
    const expectedSecret = process.env.CRON_SECRET;

    if (cronSecret && cronSecret === expectedSecret) {
      // Called by cron job - process all organizations
      const result = await processScheduledActions();

      return NextResponse.json({
        success: true,
        ...result,
      });
    }

    // Called by authenticated user - process their org only
    const session = await getServerSession(authOptions);
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // For now, processScheduledActions handles all due actions
    // In production, you'd filter by organization
    const result = await processScheduledActions();

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('[AR Engine API] Execute error:', error);
    return NextResponse.json(
      { error: 'Failed to execute scheduled actions' },
      { status: 500 }
    );
  }
}
