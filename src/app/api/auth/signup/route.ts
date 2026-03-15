import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { withRateLimit } from "@/lib/rate-limit";
import { sendWelcomeEmail } from "@/lib/email";
import { runInBackground } from "@/lib/queue";
import { apiError } from "@/lib/api/errors";

const signupSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const rateLimitResponse = await withRateLimit(request, "signup");
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const body = await request.json();

    // Validate input
    const validatedData = signupSchema.parse(body);

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(validatedData.password, 12);

    // Create user
    const user = await prisma.user.create({
      data: {
        email: validatedData.email,
        name: validatedData.name,
        password: hashedPassword,
        role: "user",
        authProvider: "email",
      },
    });

    // Log user creation
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "user_registered",
        entityType: "user",
        entityId: user.id,
        newValues: {
          email: user.email,
          name: user.name,
        },
      },
    });

    // Send welcome email in background (non-blocking)
    runInBackground(
      () => sendWelcomeEmail(user.email, user.name || "there"),
      "welcome-email"
    );

    return NextResponse.json(
      {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    return apiError(error, "Failed to create account");
  }
}
