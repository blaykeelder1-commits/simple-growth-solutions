import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { apiLogger } from "@/lib/logger";

/**
 * Standard error response handler for API routes.
 * Logs the error and returns a consistent JSON response.
 * Never leaks internal error details to the client.
 */
export function apiError(error: unknown, context: string): NextResponse {
  if (error instanceof z.ZodError) {
    return NextResponse.json(
      { success: false, message: "Invalid data", errors: error.issues },
      { status: 400 }
    );
  }

  // Handle Prisma "record not found" errors (e.g. update on non-existent row)
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2025"
  ) {
    return NextResponse.json(
      { success: false, message: "Record not found" },
      { status: 404 }
    );
  }

  apiLogger.error({ err: error, context }, `API error: ${context}`);

  // Return a generic message — never forward `context` or error details to the client
  return NextResponse.json(
    { success: false, message: "An unexpected error occurred" },
    { status: 500 }
  );
}
