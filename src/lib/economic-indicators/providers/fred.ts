/**
 * FRED API Provider
 *
 * Fetches economic data from the Federal Reserve Economic Data (FRED) API.
 * FRED provides free access to economic data with limited rate limits.
 *
 * API Documentation: https://fred.stlouisfed.org/docs/api/fred/
 */

import {
  EconomicData,
  FredApiResponse,
  FredSeriesObservation,
  FRED_SERIES,
} from '../types';

const FRED_BASE_URL = 'https://api.stlouisfed.org/fred/series/observations';

/**
 * Fetch a single series from FRED API
 * Note: FRED has a free tier that doesn't require an API key for limited requests
 */
async function fetchFredSeries(
  seriesId: string,
  startDate: Date,
  endDate: Date,
  apiKey?: string
): Promise<FredSeriesObservation | null> {
  try {
    const params = new URLSearchParams({
      series_id: seriesId,
      observation_start: formatDate(startDate),
      observation_end: formatDate(endDate),
      sort_order: 'desc',
      limit: '1',
      file_type: 'json',
    });

    // Add API key if provided (increases rate limits)
    if (apiKey) {
      params.set('api_key', apiKey);
    }

    const response = await fetch(`${FRED_BASE_URL}?${params.toString()}`, {
      headers: {
        Accept: 'application/json',
      },
      // Add timeout
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      return null;
    }

    const data: FredApiResponse = await response.json();

    if (data.observations && data.observations.length > 0) {
      return data.observations[0];
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Fetch latest economic data from FRED
 */
export async function fetchFredData(
  apiKey?: string
): Promise<Partial<EconomicData> | null> {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - 3); // Look back 3 months for latest data

  try {
    // Fetch all series in parallel
    const [
      fedFundsObs,
      unemploymentObs,
      cpiObs,
      gdpObs,
      consumerSentimentObs,
    ] = await Promise.all([
      fetchFredSeries(FRED_SERIES.FED_FUNDS_RATE, startDate, endDate, apiKey),
      fetchFredSeries(FRED_SERIES.UNEMPLOYMENT_RATE, startDate, endDate, apiKey),
      fetchFredSeries(FRED_SERIES.CPI_ALL_ITEMS, startDate, endDate, apiKey),
      fetchFredSeries(FRED_SERIES.GDP_GROWTH, startDate, endDate, apiKey),
      fetchFredSeries(FRED_SERIES.CONSUMER_SENTIMENT, startDate, endDate, apiKey),
    ]);

    // Determine the most recent date from available data
    const dates = [
      fedFundsObs?.date,
      unemploymentObs?.date,
      cpiObs?.date,
    ].filter(Boolean);

    const latestDate = dates.length > 0
      ? new Date(Math.max(...dates.map(d => new Date(d!).getTime())))
      : new Date();

    // Calculate YoY inflation from CPI
    let inflationRate: number | null = null;
    if (cpiObs) {
      // For proper inflation calculation, we'd need YoY data
      // This is a simplified version using the CPI value
      inflationRate = parseFloat(cpiObs.value) > 0
        ? Math.round((parseFloat(cpiObs.value) - 100) / 100 * 10) / 10
        : null;
    }

    return {
      indicatorDate: latestDate,
      fedFundsRate: fedFundsObs ? parseFloat(fedFundsObs.value) : null,
      unemploymentRate: unemploymentObs ? parseFloat(unemploymentObs.value) : null,
      inflationRate,
      gdpGrowthRate: gdpObs ? parseFloat(gdpObs.value) : null,
      consumerConfidence: consumerSentimentObs
        ? parseFloat(consumerSentimentObs.value)
        : null,
      source: 'fred',
    };
  } catch {
    return null;
  }
}

/**
 * Fetch historical data for a specific series
 */
export async function fetchFredHistoricalSeries(
  seriesId: string,
  startDate: Date,
  endDate: Date,
  apiKey?: string
): Promise<FredSeriesObservation[]> {
  try {
    const params = new URLSearchParams({
      series_id: seriesId,
      observation_start: formatDate(startDate),
      observation_end: formatDate(endDate),
      sort_order: 'asc',
      file_type: 'json',
    });

    if (apiKey) {
      params.set('api_key', apiKey);
    }

    const response = await fetch(`${FRED_BASE_URL}?${params.toString()}`, {
      headers: {
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      return [];
    }

    const data: FredApiResponse = await response.json();
    return data.observations || [];
  } catch {
    return [];
  }
}

/**
 * Check if FRED API is accessible
 */
export async function checkFredApiHealth(): Promise<boolean> {
  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 1);

    const result = await fetchFredSeries(
      FRED_SERIES.FED_FUNDS_RATE,
      startDate,
      endDate
    );

    return result !== null;
  } catch {
    return false;
  }
}

/**
 * Format date for FRED API (YYYY-MM-DD)
 */
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}
