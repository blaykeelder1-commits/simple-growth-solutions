import type { MetadataRoute } from "next";

const SITE = "https://simple-growth-solution.com";

// Public marketing pages are crawlable; the portal, admin and APIs are not.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/portal", "/api", "/onboarding", "/dashboard"] }],
    sitemap: `${SITE}/sitemap.xml`,
    host: SITE,
  };
}
