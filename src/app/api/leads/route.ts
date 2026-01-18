import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/db/prisma";
import { authOptions } from "@/lib/auth/options";
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

// POST - Create new lead (public)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Check if this is a quick lead capture (from URL analyzer) or full form
    const isQuickCapture = body.source === "url-analyzer" || (!body.businessName && body.email);

    if (isQuickCapture) {
      // Handle quick lead capture from URL analyzer
      const validated = quickLeadSchema.parse(body);

      // Generate a business name from the website URL or use a placeholder
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

      // Build challenges string from analysis data
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
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, errors: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: "Failed to create lead" },
      { status: 500 }
    );
  }
}

// GET - List leads (admin only)
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const leads = await prisma.lead.findMany({
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, leads });
  } catch {
    return NextResponse.json(
      { success: false, error: "Failed to fetch leads" },
      { status: 500 }
    );
  }
}
