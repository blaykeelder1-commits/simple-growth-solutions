import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { apiLogger } from '@/lib/logger';
import {
  sendTrialExpiringEmail,
  sendTrialUrgentEmail,
  sendTrialFinalEmail,
  sendTrialExpiredEmail,
} from '@/lib/email/trial-emails';

const APP_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000';

/**
 * POST /api/billing/trial-check
 * Cron endpoint to check trial subscriptions and send reminder emails.
 * Protected by CRON_SECRET header.
 */
export async function POST(req: NextRequest) {
  // Verify cron secret
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { success: false, message: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    // Query all subscriptions with status='trialing'
    const trialingSubscriptions = await prisma.subscription.findMany({
      where: { status: 'trialing' },
      include: {
        organization: {
          include: {
            users: {
              select: { email: true, name: true },
              take: 1, // Get primary user (owner)
            },
          },
        },
      },
    });

    let emailsSent = 0;
    let expiredCount = 0;
    const now = new Date();

    for (const sub of trialingSubscriptions) {
      if (!sub.trialEndDate) continue;

      const user = sub.organization.users[0];
      if (!user?.email) continue;

      const trialEnd = new Date(sub.trialEndDate);
      const msUntilEnd = trialEnd.getTime() - now.getTime();
      const daysUntilEnd = Math.ceil(msUntilEnd / (1000 * 60 * 60 * 24));

      const upgradeUrl = `${APP_URL}/pricing?plan=${encodeURIComponent(sub.plan)}`;
      const emailData = {
        name: user.name || 'there',
        planName: sub.plan,
        upgradeUrl,
      };

      try {
        if (daysUntilEnd <= 0) {
          // Trial has expired -- update status and send expired email
          await prisma.subscription.update({
            where: { id: sub.id },
            data: { status: 'expired' },
          });
          await sendTrialExpiredEmail(user.email, emailData);
          emailsSent++;
          expiredCount++;
          apiLogger.info(
            { subscriptionId: sub.id, plan: sub.plan, email: user.email },
            'Trial expired, status updated and email sent'
          );
        } else if (daysUntilEnd === 1) {
          await sendTrialFinalEmail(user.email, emailData);
          emailsSent++;
          apiLogger.info(
            { subscriptionId: sub.id, plan: sub.plan, daysUntilEnd },
            'Trial final day email sent'
          );
        } else if (daysUntilEnd <= 3) {
          await sendTrialUrgentEmail(user.email, emailData);
          emailsSent++;
          apiLogger.info(
            { subscriptionId: sub.id, plan: sub.plan, daysUntilEnd },
            'Trial urgent email sent'
          );
        } else if (daysUntilEnd <= 7) {
          await sendTrialExpiringEmail(user.email, {
            ...emailData,
            daysLeft: daysUntilEnd,
          });
          emailsSent++;
          apiLogger.info(
            { subscriptionId: sub.id, plan: sub.plan, daysUntilEnd },
            'Trial expiring email sent'
          );
        }
        // daysUntilEnd > 7: no email needed yet
      } catch (emailErr) {
        apiLogger.error(
          { err: emailErr, subscriptionId: sub.id },
          'Failed to process trial subscription'
        );
      }
    }

    const result = {
      checked: trialingSubscriptions.length,
      emails: emailsSent,
      expired: expiredCount,
    };

    apiLogger.info(result, 'Trial check cron completed');

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    apiLogger.error({ err: error }, 'Trial check cron failed');
    return NextResponse.json(
      { success: false, message: 'Trial check failed' },
      { status: 500 }
    );
  }
}
