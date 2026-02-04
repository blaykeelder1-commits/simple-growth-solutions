// AR Engine Analysis API
// POST: Generate action plan for organization

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { AREngine, quickAnalyze } from '@/lib/ar-engine';
import { apiLogger as logger } from '@/lib/logger';

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const organizationId = session.user.organizationId;

    // Quick analyze and generate plan
    const { summary, plan } = await quickAnalyze(organizationId);

    return NextResponse.json({
      success: true,
      summary,
      plan,
    });
  } catch (error) {
    logger.error({ err: error }, Analysis error:', error);
    return NextResponse.json(
      { error: 'Failed to analyze invoices' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const engine = new AREngine(session.user.organizationId);

    // Get any pending plan
    const pendingPlan = await engine.getPendingPlan();

    if (!pendingPlan) {
      return NextResponse.json({ hasPendingPlan: false });
    }

    return NextResponse.json({
      hasPendingPlan: true,
      plan: pendingPlan,
    });
  } catch (error) {
    logger.error({ err: error }, Get pending plan error:', error);
    return NextResponse.json(
      { error: 'Failed to get pending plan' },
      { status: 500 }
    );
  }
}
