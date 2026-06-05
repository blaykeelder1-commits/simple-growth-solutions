import { NextRequest, NextResponse } from "next/server";
import { TEMPLATES, getTemplate } from "@/lib/templates";
import { apiError } from "@/lib/api/errors";

// GET /api/templates — List all templates or get one by ID
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const industry = searchParams.get("industry");

    if (id) {
      const template = getTemplate(id);
      if (!template) {
        return NextResponse.json({ error: "Template not found" }, { status: 404 });
      }
      return NextResponse.json({ success: true, template });
    }

    let templates = TEMPLATES;
    if (industry) {
      templates = templates.filter((t) => t.industry === industry);
    }

    return NextResponse.json({
      success: true,
      templates: templates.map((t) => ({
        id: t.id,
        name: t.name,
        industry: t.industry,
        description: t.description,
        previewImage: t.previewImage,
        colors: t.colors,
        sectionCount: t.sections.length,
      })),
    });
  } catch (error) {
    return apiError(error, "Failed to load templates");
  }
}
