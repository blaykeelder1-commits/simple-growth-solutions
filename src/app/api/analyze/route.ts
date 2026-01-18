import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { analyzeWebsite } from "@/lib/analyzer";
import { z } from "zod";

const analyzeSchema = z.object({
  url: z.string().url("Invalid URL"),
});

// GET /api/analyze?url=...
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const url = searchParams.get("url");

    if (!url) {
      return NextResponse.json(
        { success: false, error: "URL parameter is required" },
        { status: 400 }
      );
    }

    // Validate URL
    analyzeSchema.parse({ url });

    const analysis = await analyzeWebsite(url);

    // Transform to match the expected frontend format
    return NextResponse.json({
      overallScore: analysis.score,
      performance: analysis.checks.speed.score,
      mobile: analysis.checks.mobile.score,
      seo: analysis.checks.seo.score,
      security: analysis.checks.ssl.score,
      speed: analysis.checks.speed.score,
      accessibility: analysis.checks.accessibility.score,
      design: analysis.checks.design.score,
      recommendations: analysis.recommendations,
      checks: analysis.checks,
      aiAnalysis: analysis.aiAnalysis,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: "Invalid URL format" },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: "Failed to analyze website" },
      { status: 500 }
    );
  }
}

// POST /api/analyze
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { url } = analyzeSchema.parse(body);

    const analysis = await analyzeWebsite(url);

    return NextResponse.json({
      success: true,
      analysis,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, errors: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: "Failed to analyze website" },
      { status: 500 }
    );
  }
}
