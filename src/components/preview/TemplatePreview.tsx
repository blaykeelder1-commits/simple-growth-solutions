"use client";

import { TEMPLATES, type WebsiteTemplate } from "@/lib/templates";

// A miniature website preview rendered using the template's actual color
// palette. Used in landing-page portfolio sections to give visitors a real
// taste of what their site could look like — no real screenshots required yet.

interface TemplatePreviewProps {
  template: WebsiteTemplate;
  variant?: "card" | "compact" | "wide";
}

export function TemplatePreview({ template, variant = "card" }: TemplatePreviewProps) {
  const c = template.colors;

  return (
    <div
      className="rounded-xl overflow-hidden shadow-md ring-1 ring-black/5"
      style={{ backgroundColor: c.background }}
    >
      {/* Fake browser chrome */}
      <div className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 border-b border-gray-200">
        <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
        <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
        <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
        <span className="ml-2 text-[10px] text-gray-500 truncate">
          yourbusiness.com
        </span>
      </div>

      {/* Mini hero */}
      <div
        className="px-4 py-6"
        style={{ backgroundColor: c.background, color: c.text }}
      >
        <div
          className="text-[11px] font-semibold mb-1.5"
          style={{ color: c.primary }}
        >
          {template.name}
        </div>
        <div
          className="text-sm font-bold leading-tight mb-2"
          style={{ fontFamily: template.fonts.heading, color: c.text }}
        >
          {template.defaultContent.heroHeadline}
        </div>
        <div
          className="text-[10px] leading-tight mb-3 opacity-70"
          style={{ fontFamily: template.fonts.body }}
        >
          {template.defaultContent.heroSubheadline}
        </div>
        <button
          className="text-[10px] font-semibold px-3 py-1.5 rounded-md"
          style={{ backgroundColor: c.primary, color: "#fff" }}
        >
          {template.defaultContent.ctaText}
        </button>
      </div>

      {/* Mini sections strip */}
      {variant !== "compact" && (
        <div className="grid grid-cols-3 gap-1.5 p-3 bg-gray-50">
          <div className="aspect-[4/3] rounded" style={{ backgroundColor: c.accent + "30" }} />
          <div className="aspect-[4/3] rounded" style={{ backgroundColor: c.secondary + "30" }} />
          <div className="aspect-[4/3] rounded" style={{ backgroundColor: c.primary + "30" }} />
        </div>
      )}
    </div>
  );
}

// Convenience: a row of all 5 templates.
export function TemplatePreviewRow({ variant = "card" }: { variant?: TemplatePreviewProps["variant"] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      {TEMPLATES.map((t) => (
        <TemplatePreview key={t.id} template={t} variant={variant} />
      ))}
    </div>
  );
}
