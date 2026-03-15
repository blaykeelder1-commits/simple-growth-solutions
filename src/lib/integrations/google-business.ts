// Google Business Profile / Places API Integration
// Uses Google Places API (New) for business lookups and reviews
// This approach doesn't require Business Profile ownership verification
//
// Environment variables needed:
// GOOGLE_BUSINESS_API_KEY - Google Cloud API key with Places API enabled

// ============================================================
// Types
// ============================================================

export interface GoogleBusinessConfig {
  apiKey: string;
}

export interface GoogleBusinessSearchResult {
  placeId: string;
  name: string;
  address: string;
  rating: number;
  totalRatings: number;
  priceLevel?: string;
}

export interface GoogleReview {
  author: string;
  rating: number;
  text: string;
  time: string;
  relativeTime: string;
}

export interface GooglePlaceDetails {
  name: string;
  rating: number;
  totalRatings: number;
  reviews: GoogleReview[];
  openingHours?: string[];
  website?: string;
  phone?: string;
}

export interface GoogleSyncResult {
  reviewsSynced: number;
  averageRating: number;
}

// ============================================================
// Config
// ============================================================

export function getGoogleBusinessConfig(): GoogleBusinessConfig | null {
  const apiKey = process.env.GOOGLE_BUSINESS_API_KEY;
  if (!apiKey) return null;
  return { apiKey };
}

// ============================================================
// Places API (New)
// ============================================================

const PLACES_API_BASE = "https://places.googleapis.com/v1";

/**
 * Search for a business using the Places Text Search API.
 * Returns the top match or null if not found.
 */
export async function searchBusiness(
  query: string,
  location?: string
): Promise<GoogleBusinessSearchResult | null> {
  const config = getGoogleBusinessConfig();
  if (!config) throw new Error("Google Business API is not configured");

  const textQuery = location ? `${query} ${location}` : query;

  const response = await fetch(`${PLACES_API_BASE}/places:searchText`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": config.apiKey,
      "X-Goog-FieldMask":
        "places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.priceLevel",
    },
    body: JSON.stringify({ textQuery }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Google Places search failed: ${response.status} - ${error}`);
  }

  const data = await response.json();
  const places = data.places;

  if (!places || places.length === 0) return null;

  const place = places[0];
  return {
    placeId: place.id,
    name: place.displayName?.text || "",
    address: place.formattedAddress || "",
    rating: place.rating || 0,
    totalRatings: place.userRatingCount || 0,
    priceLevel: place.priceLevel || undefined,
  };
}

/**
 * Get detailed information about a place including reviews.
 */
export async function getPlaceDetails(
  placeId: string
): Promise<GooglePlaceDetails> {
  const config = getGoogleBusinessConfig();
  if (!config) throw new Error("Google Business API is not configured");

  const response = await fetch(`${PLACES_API_BASE}/places/${placeId}`, {
    method: "GET",
    headers: {
      "X-Goog-Api-Key": config.apiKey,
      "X-Goog-FieldMask":
        "displayName,rating,userRatingCount,reviews,regularOpeningHours,websiteUri,nationalPhoneNumber",
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Google Places details failed: ${response.status} - ${error}`);
  }

  const place = await response.json();

  const reviews: GoogleReview[] = (place.reviews || []).map(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (r: any) => ({
      author: r.authorAttribution?.displayName || "Anonymous",
      rating: r.rating || 0,
      text: r.text?.text || "",
      time: r.publishTime || "",
      relativeTime: r.relativePublishTimeDescription || "",
    })
  );

  return {
    name: place.displayName?.text || "",
    rating: place.rating || 0,
    totalRatings: place.userRatingCount || 0,
    reviews,
    openingHours: place.regularOpeningHours?.weekdayDescriptions || undefined,
    website: place.websiteUri || undefined,
    phone: place.nationalPhoneNumber || undefined,
  };
}

/**
 * Sync Google reviews and ratings into BusinessMetric records.
 * Creates daily metric records with source='google'.
 */
export async function syncGoogleReviewsToDatabase(
  placeId: string,
  organizationId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  prisma: any
): Promise<GoogleSyncResult> {
  const details = await getPlaceDetails(placeId);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Upsert a daily BusinessMetric record for Google reviews
  await prisma.businessMetric.upsert({
    where: {
      organizationId_metricDate_period_source: {
        organizationId,
        metricDate: today,
        period: "daily",
        source: "google",
      },
    },
    update: {
      reviewCount: details.totalRatings,
      avgRating: details.rating,
      customMetrics: JSON.stringify({
        reviews: details.reviews.map((r) => ({
          author: r.author,
          rating: r.rating,
          text: r.text,
          time: r.time,
          relativeTime: r.relativeTime,
        })),
        placeId,
        website: details.website,
        phone: details.phone,
      }),
    },
    create: {
      organizationId,
      metricDate: today,
      period: "daily",
      source: "google",
      reviewCount: details.totalRatings,
      avgRating: details.rating,
      customMetrics: JSON.stringify({
        reviews: details.reviews.map((r) => ({
          author: r.author,
          rating: r.rating,
          text: r.text,
          time: r.time,
          relativeTime: r.relativeTime,
        })),
        placeId,
        website: details.website,
        phone: details.phone,
      }),
    },
  });

  return {
    reviewsSynced: details.reviews.length,
    averageRating: details.rating,
  };
}
