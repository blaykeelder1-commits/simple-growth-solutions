// AR Engine Payments API
// GET: Get success fee summary
// POST: Record a payment or sync payments

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { AREngine } from '@/lib/ar-engine';

// Get success fee summary
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const engine = new AREngine(session.user.organizationId);
    const fees = await engine.getSuccessFees();

    return NextResponse.json({
      success: true,
      fees,
    });
  } catch (error) {
    console.error('[AR Engine API] Get fees error:', error);
    return NextResponse.json(
      { error: 'Failed to get fees' },
      { status: 500 }
    );
  }
}

// Record a payment or sync payments
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action, invoiceId, amount, paymentDate } = body;

    const engine = new AREngine(session.user.organizationId);

    if (action === 'sync') {
      // Sync payments from connected integrations
      const synced = await engine.syncPayments();
      return NextResponse.json({
        success: true,
        synced,
        message: `Synced ${synced} payments`,
      });
    }

    if (action === 'record') {
      // Record a manual payment
      if (!invoiceId || !amount) {
        return NextResponse.json(
          { error: 'Invoice ID and amount required' },
          { status: 400 }
        );
      }

      const result = await engine.recordManualPayment(
        invoiceId,
        amount,
        paymentDate ? new Date(paymentDate) : new Date()
      );

      return NextResponse.json({
        success: true,
        ...result,
      });
    }

    return NextResponse.json(
      { error: 'Invalid action. Use "sync" or "record"' },
      { status: 400 }
    );
  } catch (error) {
    console.error('[AR Engine API] Payment error:', error);
    return NextResponse.json(
      { error: 'Failed to process payment' },
      { status: 500 }
    );
  }
}
