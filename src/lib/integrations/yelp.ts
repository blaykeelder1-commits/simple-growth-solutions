// Yelp Fusion API Integration
// Uses Yelp Fusion API v3 for business lookups and reviews
//
// Environment variables needed:
// YELP_API_KEY - Yelp Fusion API key

// ============================================================
// Types
// ============================================================

export interface YelpConfig {
  apiKey: string;
}

export interface YelpBusinessSearchResult {
  yelpId: string;
  name: string;
  rating: number;
  reviewCount: number;
  url: string;
  imageUrl: string;
  categories: string[];
}

export interface YelpReview {
  id: string;
  rating: number;
  text: string;
  timeCreated: string;
  user: {
    name: string;
    imageUrl: string;
  };
}

export interface YelpReviewsResult {
  reviews: YelpReview[];
  total: number;
}

export interface YelpSyncResult {
  reviewsSynced: number;
  averageRating: number;
}

// ============================================================
// Config
// ============================================================

export function getYelpConfig(): YelpConfig | null {
  const apiKey = process.env.YELP_API_KEY;
  if (!apiKey) return null;
  return { apiKey };
}

// ============================================================
// Yelp Fusion API
// ============================================================

const YELP_API_BASE = "https://api.yelp.com/v3";

/**
 * Search for a business on Yelp by name and location.
 * Returns the best match or null if not found.
 */
export async function searchBusiness(
  name: string,
  location: string
): Promise<YelpBusinessSearchResult | null> {
  const config = getYelpConfig();
  if (!config) throw new Error("Yelp API is not configured");

  const params = new URLSearchParams({
    term: name,
    location,
    limit: "1",
  });

  const response = await fetch(
    `${YELP_API_BASE}/businesses/search?${params.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        Accept: "application/json",
      },
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Yelp business search failed: ${response.status} - ${error}`);
  }

  const data = await response.json();
  const businesses = data.businesses;

  if (!businesses || businesses.length === 0) return null;

  const biz = businesses[0];
  return {
    yelpId: biz.id,
    name: biz.name,
    rating: biz.rating || 0,
    reviewCount: biz.review_count || 0,
    url: biz.url || "",
    imageUrl: biz.image_url || "",
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    categories: (biz.categories || []).map((c: any) => c.title),
  };
}

/**
 * Get reviews for a Yelp business.
 * The Yelp API returns up to 3 review excerpts on the free tier.
 * With a Yelp Fusion paid plan, you can get more.
 */
export async function getBusinessReviews(
  yelpId: string
): Promise<YelpReviewsResult> {
  const config = getYelpConfig();
  if (!config) throw new Error("Yelp API is not configured");

  const params = new URLSearchParams({
    limit: "20",
    sort_by: "newest",
  });

  const response = await fetch(
    `${YELP_API_BASE}/businesses/${yelpId}/reviews?${params.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        Accept: "application/json",
      },
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Yelp reviews fetch failed: ${response.status} - ${error}`);
  }

  const data = await response.json();

  const reviews: YelpReview[] = (data.reviews || []).map(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (r: any) => ({
      id: r.id,
      rating: r.rating || 0,
      text: r.text || "",
      timeCreated: r.time_created || "",
      user: {
        name: r.user?.name || "Anonymous",
        imageUrl: r.user?.image_url || "",
      },
    })
  );

  return {
    reviews,
    total: data.total || reviews.length,
  };
}

/**
 * Sync Yelp reviews and ratings into BusinessMetric records.
 * Creates daily metric records with source='yelp'.
 */
export async function syncYelpReviewsToDatabase(
  yelpId: string,
  organizationId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  prisma: any
): Promise<YelpSyncResult> {
  const config = getYelpConfig();
  if (!config) throw new Error("Yelp API is not configured");

  // Fetch business details for rating/count
  const bizResponse = await fetch(`${YELP_API_BASE}/businesses/${yelpId}`, {
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      Accept: "application/json",
    },
  });

  if (!bizResponse.ok) {
    const error = await bizResponse.text();
    throw new Error(`Yelp business details failed: ${bizResponse.status} - ${error}`);
  }

  const biz = await bizResponse.json();

  // Fetch reviews
  const reviewsResult = await getBusinessReviews(yelpId);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Upsert a daily BusinessMetric record for Yelp reviews
  await prisma.businessMetric.upsert({
    where: {
      organizationId_metricDate_period_source: {
        organizationId,
        metricDate: today,
        period: "daily",
        source: "yelp",
      },
    },
    update: {
      reviewCount: biz.review_count || 0,
      avgRating: biz.rating || 0,
      customMetrics: JSON.stringify({
        reviews: reviewsResult.reviews.map((r) => ({
          id: r.id,
          rating: r.rating,
          text: r.text,
          timeCreated: r.timeCreated,
          userName: r.user.name,
        })),
        yelpId,
        yelpUrl: biz.url || "",
        imageUrl: biz.image_url || "",
        categories: (biz.categories || []).map(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (c: any) => c.title
        ),
      }),
    },
    create: {
      organizationId,
      metricDate: today,
      period: "daily",
      source: "yelp",
      reviewCount: biz.review_count || 0,
      avgRating: biz.rating || 0,
      customMetrics: JSON.stringify({
        reviews: reviewsResult.reviews.map((r) => ({
          id: r.id,
          rating: r.rating,
          text: r.text,
          timeCreated: r.timeCreated,
          userName: r.user.name,
        })),
        yelpId,
        yelpUrl: biz.url || "",
        imageUrl: biz.image_url || "",
        categories: (biz.categories || []).map(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (c: any) => c.title
        ),
      }),
    },
  });

  return {
    reviewsSynced: reviewsResult.reviews.length,
    averageRating: biz.rating || 0,
  };
}
