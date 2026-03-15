// Uptime Check
// Simple HTTP GET with timeout to check if a site is reachable

export interface UptimeResult {
  up: boolean;
  statusCode: number | null;
  responseTimeMs: number;
  error: string | null;
}

/**
 * Check if a URL is reachable by performing an HTTP GET with a timeout.
 * Returns uptime status, HTTP status code, and response time.
 */
export async function checkUptime(url: string): Promise<UptimeResult> {
  const startTime = Date.now();

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const responseTimeMs = Date.now() - startTime;

    return {
      up: response.status < 500,
      statusCode: response.status,
      responseTimeMs,
      error: response.status >= 500 ? `Server error: ${response.status} ${response.statusText}` : null,
    };
  } catch (error) {
    const responseTimeMs = Date.now() - startTime;

    let errorMessage = "Unknown error";
    if (error instanceof Error) {
      if (error.name === "AbortError") {
        errorMessage = "Request timed out after 15 seconds";
      } else {
        errorMessage = error.message;
      }
    }

    return {
      up: false,
      statusCode: null,
      responseTimeMs,
      error: errorMessage,
    };
  }
}
