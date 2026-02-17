import { NextResponse } from "next/server";
import { z } from "zod";
import { apiLogger } from "@/lib/logger";

/**
 * Standard error response handler for API routes.
 * Logs the error and returns a consistent JSON response.
 */
export function apiError(error: unknown, context: string): NextResponse {
  if (error instanceof z.ZodError) {
    return NextResponse.json(
      { success: false, message: "Invalid data", errors: error.issues },
      { status: 400 }
    );
  }

  apiLogger.error({ err: error, context }, `API error: ${context}`);

  return NextResponse.json(
    { success: false, message: context },
    { status: 500 }
  );
}
