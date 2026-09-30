import { createHmac, timingSafeEqual } from "crypto";

// The qualify step is public (the visitor has no account), so it must only update the
// lead the visitor just created. The create response hands back an HMAC of the lead id;
// the qualify call must present it. Stateless, and useless for any other lead.
function sign(leadId: string): string {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error("NEXTAUTH_SECRET is not set");
  return createHmac("sha256", secret).update(`lead-qualify:${leadId}`).digest("base64url");
}

export function qualifyToken(leadId: string): string {
  return sign(leadId);
}

export function verifyQualifyToken(leadId: string, token: string): boolean {
  const expected = Buffer.from(sign(leadId));
  const got = Buffer.from(token);
  return expected.length === got.length && timingSafeEqual(expected, got);
}
