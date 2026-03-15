import { createHmac } from 'crypto';
import { sendEmail } from '@/lib/email';
import {
  getNurtureWelcomeEmail,
  getNurtureCaseStudyEmail,
  getNurtureFreeOfferEmail,
  getNurtureLastChanceEmail,
} from '@/lib/email/nurture-templates';
import { apiLogger } from '@/lib/logger';

/**
 * Generate an HMAC token for unsubscribe link verification.
 * Uses NEXTAUTH_SECRET as the signing key.
 */
export function generateUnsubscribeToken(leadId: string): string {
  const secret = process.env.NEXTAUTH_SECRET || 'dev-secret';
  return createHmac('sha256', secret).update(leadId).digest('hex');
}

/**
 * Verify an unsubscribe token against a lead ID.
 */
export function verifyUnsubscribeToken(leadId: string, token: string): boolean {
  const expected = generateUnsubscribeToken(leadId);
  return expected === token;
}

// Schedule: step -> delay in milliseconds until next email
const NURTURE_DELAYS: Record<number, number> = {
  0: 0,                         // Step 0->1: send immediately (welcome)
  1: 2 * 24 * 60 * 60 * 1000,  // Step 1->2: 2 days (case study)
  2: 3 * 24 * 60 * 60 * 1000,  // Step 2->3: 3 days (free offer)
  3: 5 * 24 * 60 * 60 * 1000,  // Step 3->4: 5 days (last chance)
};

/**
 * Start the nurture sequence for a newly created lead.
 * Sets the lead to 'nurturing' status with nextNurtureAt = now.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function startNurtureForLead(leadId: string, prisma: any): Promise<void> {
  await prisma.lead.update({
    where: { id: leadId },
    data: {
      nurtureStatus: 'nurturing',
      nurtureStep: 0,
      nextNurtureAt: new Date(),
    },
  });

  apiLogger.info({ leadId }, 'Nurture sequence started for lead');
}

/**
 * Process the nurture queue: send emails to all leads that are due.
 * Returns counts of sent emails and errors.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function processNurtureQueue(prisma: any): Promise<{ sent: number; errors: number }> {
  const now = new Date();
  let sent = 0;
  let errors = 0;

  // Find leads that are due for their next nurture email
  const leads = await prisma.lead.findMany({
    where: {
      nurtureStatus: 'nurturing',
      nextNurtureAt: { lte: now },
    },
  });

  apiLogger.info({ count: leads.length }, 'Processing nurture queue');

  for (const lead of leads) {
    try {
      const token = generateUnsubscribeToken(lead.id);
      let emailContent: { subject: string; html: string } | null = null;
      let nextStep = lead.nurtureStep + 1;

      switch (lead.nurtureStep) {
        case 0:
          // Send welcome email
          emailContent = getNurtureWelcomeEmail({
            name: lead.contactName,
            businessName: lead.businessName,
            hasWebsite: lead.hasWebsite,
            websiteUrl: lead.websiteUrl || undefined,
            leadId: lead.id,
            token,
          });
          break;

        case 1:
          // Send case study email
          emailContent = getNurtureCaseStudyEmail({
            name: lead.contactName,
            industry: lead.industry || undefined,
            leadId: lead.id,
            token,
          });
          break;

        case 2:
          // Send free offer email
          emailContent = getNurtureFreeOfferEmail({
            name: lead.contactName,
            businessName: lead.businessName,
            leadId: lead.id,
            token,
          });
          break;

        case 3:
          // Send last chance email
          emailContent = getNurtureLastChanceEmail({
            name: lead.contactName,
            leadId: lead.id,
            token,
          });
          break;

        default:
          // Sequence complete
          apiLogger.warn({ leadId: lead.id, step: lead.nurtureStep }, 'Lead at unexpected nurture step');
          nextStep = lead.nurtureStep;
          break;
      }

      if (emailContent) {
        await sendEmail({
          to: lead.email,
          subject: emailContent.subject,
          html: emailContent.html,
        });

        const isLastStep = lead.nurtureStep >= 3;
        const nextNurtureAt = isLastStep
          ? null
          : new Date(now.getTime() + (NURTURE_DELAYS[nextStep] || NURTURE_DELAYS[1]));

        await prisma.lead.update({
          where: { id: lead.id },
          data: {
            nurtureStep: nextStep,
            lastNurtureAt: now,
            nextNurtureAt,
            nurtureStatus: isLastStep ? 'completed' : 'nurturing',
          },
        });

        apiLogger.info(
          { leadId: lead.id, step: nextStep, email: lead.email },
          'Nurture email sent'
        );
        sent++;
      }
    } catch (error) {
      apiLogger.error(
        { err: error, leadId: lead.id, step: lead.nurtureStep },
        'Failed to send nurture email'
      );
      errors++;
    }
  }

  return { sent, errors };
}
