import type { MetadataRoute } from "next";

const SITE = "https://simple-growth-solution.com";

// Public pages only. Keep in step with the public routes under src/app.
const PAGES: { path: string; priority: number }[] = [
  { path: "/", priority: 1 },
  { path: "/pricing", priority: 0.9 },
  { path: "/questionnaire", priority: 0.8 },
  { path: "/book", priority: 0.6 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return PAGES.map((p) => ({ url: `${SITE}${p.path}`, lastModified: now, changeFrequency: "weekly", priority: p.priority }));
}
