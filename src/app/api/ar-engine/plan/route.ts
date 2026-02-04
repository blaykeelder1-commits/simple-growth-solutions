// AR Engine Plan Management API
// POST: Save plan for review
// PUT: Approve plan and start automation

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { AREngine } from '@/lib/ar-engine';
import { ActionPlan } from '@/lib/ar-engine/types';

// Save a plan for review
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const plan = body.plan as ActionPlan;

    if (!plan || !plan.id) {
      return NextResponse.json({ error: 'Invalid plan data' }, { status: 400 });
    }

    const engine = new AREngine(session.user.organizationId);
    await engine.savePlan(plan);

    return NextResponse.json({
      success: true,
      message: 'Plan saved for review',
      planId: plan.id,
    });
  } catch (error) {
    console.error('[AR Engine API] Save plan error:', error);
    return NextResponse.json(
      { error: 'Failed to save plan' },
      { status: 500 }
    );
  }
}

// Approve plan and start automation
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { planId, selectedInvoiceIds } = body;

    if (!planId) {
      return NextResponse.json({ error: 'Plan ID required' }, { status: 400 });
    }

    const engine = new AREngine(session.user.organizationId);
    await engine.approvePlan(planId, selectedInvoiceIds);

    return NextResponse.json({
      success: true,
      message: 'Plan approved! Automation started.',
      planId,
    });
  } catch (error) {
    console.error('[AR Engine API] Approve plan error:', error);
    return NextResponse.json(
      { error: 'Failed to approve plan' },
      { status: 500 }
    );
  }
}

// Get current plan status
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const engine = new AREngine(session.user.organizationId);
    const pendingPlan = await engine.getPendingPlan();

    return NextResponse.json({
      hasPendingPlan: !!pendingPlan,
      plan: pendingPlan,
    });
  } catch (error) {
    console.error('[AR Engine API] Get plan error:', error);
    return NextResponse.json(
      { error: 'Failed to get plan' },
      { status: 500 }
    );
  }
}
