import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { withAdmin } from "@/lib/api/with-auth";
import { apiError } from "@/lib/api/errors";
import { withRateLimit } from "@/lib/rate-limit";
import { startNurtureForLead } from "@/lib/nurture/engine";
import { sendNewLeadInternalEmail } from "@/lib/email/lifecycle-emails";
import { z } from "zod";
import { qualifyToken } from "@/lib/qualify/token";

// Full lead schema for questionnaire form
const createLeadSchema = z.object({
  businessName: z.string().min(1, "Business name is required"),
  contactName: z.string().min(1, "Contact name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional().or(z.literal("")),
  hasWebsite: z.enum(["yes", "no"]).transform((val) => val === "yes"),
  websiteUrl: z.string().url().optional().or(z.literal("")),
  industry: z.string().optional(),
  challenges: z.string().optional(),
});

// Where the lead came from — the form plus any campaign tags on the landing URL.
const attributionSchema = z.object({
  source: z.string().max(60).optional(),
  utmSource: z.string().max(120).optional(),
  utmMedium: z.string().max(120).optional(),
  utmCampaign: z.string().max(200).optional(),
  referrer: z.string().max(500).optional(),
});

function attribution(body: unknown, fallbackSource: string) {
  const a = attributionSchema.safeParse(body);
  const d = a.success ? a.data : {};
  return {
    source: d.source || fallbackSource,
    utmSource: d.utmSource || null,
    utmMedium: d.utmMedium || null,
    utmCampaign: d.utmCampaign || null,
    referrer: d.referrer || null,
  };
}

// Simplified schema for URL analyzer quick capture
const quickLeadSchema = z.object({
  email: z.string().email("Invalid email address"),
  // The analyzer form sends contactName; older clients sent name. Accept both —
  // reading only `name` is why every analyzer lead was saved as "Website Visitor".
  name: z.string().optional(),
  contactName: z.string().optional(),
  businessName: z.string().max(200).optional(),
  phone: z.string().max(40).optional(),
  source: z.string().optional(),
  websiteUrl: z.string().optional(),
  analysisData: z
    .object({
      score: z.number().optional(),
      improvements: z.number().optional(),
    })
    .optional(),
});

// POST - Create new lead (public, rate limited)
export async function POST(req: NextRequest) {
  // Rate limit public endpoint
  const rateLimited = await withRateLimit(req, "api");
  if (rateLimited) return rateLimited;

  try {
    const body = await req.json();

    // Check if this is a quick lead capture (from URL analyzer) or full form
    // The full questionnaire always sends hasWebsite; the analyzer forms never do. Keying
    // on businessName instead sent every audit visitor who typed a business name into
    // full-form validation — a 400 the page hid behind "You're in!", losing the lead
    // (2026-05-12 → 2026-09-30).
    const isQuickCapture = body?.hasWebsite === undefined;

    if (isQuickCapture) {
      const validated = quickLeadSchema.parse(body);

      let businessName = "Website Analysis Lead";
      if (validated.websiteUrl) {
        try {
          const url = new URL(
            validated.websiteUrl.startsWith("http")
              ? validated.websiteUrl
              : `https://${validated.websiteUrl}`
          );
          businessName = url.hostname.replace("www.", "");
        } catch {
          // Use default if URL parsing fails
        }
      }

      let challenges = `Source: ${validated.source || "url-analyzer"}`;
      if (validated.analysisData) {
        if (validated.analysisData.score !== undefined) {
          challenges += ` | Website Score: ${validated.analysisData.score}/100`;
        }
        if (validated.analysisData.improvements !== undefined) {
          challenges += ` | ${validated.analysisData.improvements} improvements identified`;
        }
      }

      const lead = await prisma.lead.create({
        data: {
          businessName: validated.businessName?.trim() || businessName,
          contactName: validated.contactName?.trim() || validated.name?.trim() || "Website Visitor",
          email: validated.email,
          phone: validated.phone?.trim() || null,
          hasWebsite: !!validated.websiteUrl,
          websiteUrl: validated.websiteUrl || null,
          industry: null,
          challenges,
          analysisScore: validated.analysisData?.score ?? null,
          analysisData: validated.analysisData
            ? JSON.stringify(validated.analysisData)
            : null,
          ...attribution(body, validated.source || "url-analyzer"),
        },
      });

      // Start nurture sequence (fire-and-forget, don't block response)
      startNurtureForLead(lead.id, prisma).catch((err) =>
        console.error("Failed to start nurture for lead", lead.id, err)
      );

      // Instant internal sales alert (fire-and-forget, don't block response)
      sendNewLeadInternalEmail({
        businessName: lead.businessName,
        contactName: lead.contactName,
        email: lead.email,
        phone: lead.phone,
        hasWebsite: lead.hasWebsite,
        websiteUrl: lead.websiteUrl,
        industry: lead.industry,
        challenges: lead.challenges,
        source: "url-analyzer",
      }).catch((err) =>
        console.error("Failed to send lead alert for", lead.id, err)
      );

      // Only what the visitor's own next step needs — never echo the stored row.
      return NextResponse.json(
        { success: true, leadId: lead.id, qualifyToken: qualifyToken(lead.id) },
        { status: 201 }
      );
    }

    // Handle full lead form submission
    const validated = createLeadSchema.parse(body);

    const lead = await prisma.lead.create({
      data: {
        businessName: validated.businessName,
        contactName: validated.contactName,
        email: validated.email,
        phone: validated.phone || null,
        hasWebsite: validated.hasWebsite,
        websiteUrl: validated.websiteUrl || null,
        industry: validated.industry || null,
        challenges: validated.challenges || null,
        ...attribution(body, "questionnaire"),
      },
    });

    // Start nurture sequence (fire-and-forget, don't block response)
    startNurtureForLead(lead.id, prisma).catch((err) =>
      console.error("Failed to start nurture for lead", lead.id, err)
    );

    // Instant internal sales alert (fire-and-forget, don't block response)
    sendNewLeadInternalEmail({
      businessName: lead.businessName,
      contactName: lead.contactName,
      email: lead.email,
      phone: lead.phone,
      hasWebsite: lead.hasWebsite,
      websiteUrl: lead.websiteUrl,
      industry: lead.industry,
      challenges: lead.challenges,
      source: "questionnaire",
    }).catch((err) =>
      console.error("Failed to send lead alert for", lead.id, err)
    );

    return NextResponse.json(
      { success: true, leadId: lead.id, qualifyToken: qualifyToken(lead.id) },
      { status: 201 }
    );
  } catch (error) {
    return apiError(error, "Failed to create lead");
  }
}

// GET - List leads (admin only, paginated)
export const GET = withAdmin(async (req) => {
  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1") || 1);
    const limit = Math.min(Math.max(1, parseInt(searchParams.get("limit") || "50") || 50), 100);
    const skip = (page - 1) * limit;

    const [leads, total] = await Promise.all([
      prisma.lead.findMany({
        orderBy: { createdAt: "desc" },
        take: limit,
        skip,
      }),
      prisma.lead.count(),
    ]);

    return NextResponse.json({
      success: true,
      leads,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    return apiError(error, "Failed to fetch leads");
  }
});
