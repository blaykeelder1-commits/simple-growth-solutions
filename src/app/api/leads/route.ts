import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { withAdmin } from "@/lib/api/with-auth";
import { apiError } from "@/lib/api/errors";
import { withRateLimit } from "@/lib/rate-limit";
import { z } from "zod";

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

// Simplified schema for URL analyzer quick capture
const quickLeadSchema = z.object({
  email: z.string().email("Invalid email address"),
  name: z.string().optional(),
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
    const isQuickCapture = body.source === "url-analyzer" || (!body.businessName && body.email);

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
          businessName,
          contactName: validated.name || "Website Visitor",
          email: validated.email,
          phone: null,
          hasWebsite: !!validated.websiteUrl,
          websiteUrl: validated.websiteUrl || null,
          industry: null,
          challenges,
        },
      });

      return NextResponse.json({ success: true, lead }, { status: 201 });
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
      },
    });

    return NextResponse.json({ success: true, lead }, { status: 201 });
  } catch (error) {
    return apiError(error, "Failed to create lead");
  }
}

// GET - List leads (admin only, paginated)
export const GET = withAdmin(async (req) => {
  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(Math.max(1, parseInt(searchParams.get("limit") || "50")), 100);
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
