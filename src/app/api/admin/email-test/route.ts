import { NextResponse } from "next/server";
import { withAdmin } from "@/lib/api/with-auth";
import { apiError } from "@/lib/api/errors";
import { emailLayout, sendEmail, SGS_INBOX } from "@/lib/email";

// POST /api/admin/email-test — sends one real email through the production sender to our
// OWN inbox (fixed recipient, never a customer), so a sender change can be proven by
// reading the delivered headers (DKIM/SPF/DMARC) instead of assumed.
export const POST = withAdmin(async () => {
  try {
    const sentAt = new Date().toISOString();
    const res = await sendEmail({
      to: SGS_INBOX,
      subject: `SGS sender test ${sentAt}`,
      html: emailLayout(`<p>Sender test from the production app at ${sentAt}. Safe to ignore.</p>`),
      text: `Sender test from the production app at ${sentAt}. Safe to ignore.`,
    });
    return NextResponse.json({ success: true, to: SGS_INBOX, id: res.id, sentAt });
  } catch (error) {
    return apiError(error, "Test email failed");
  }
});
