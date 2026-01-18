import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import bcrypt from "bcryptjs";
import { withRateLimit } from "@/lib/rate-limit";
import { z } from "zod";

const resetPasswordSchema = z.object({
  token: z.string().min(1, "Reset token is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const rateLimitResponse = await withRateLimit(request, "passwordReset");
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const body = await request.json();
    const { token, password } = resetPasswordSchema.parse(body);

    // Find the reset token
    const resetToken = await prisma.verificationToken.findFirst({
      where: {
        token,
        identifier: { startsWith: "password_reset:" },
        expires: { gt: new Date() },
      },
    });

    if (!resetToken) {
      return NextResponse.json(
        { error: "Invalid or expired reset token" },
        { status: 400 }
      );
    }

    // Extract email from identifier
    const email = resetToken.identifier.replace("password_reset:", "");

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Update user's password
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        // Also verify email if not already verified
        emailVerified: user.emailVerified || new Date(),
      },
    });

    // Delete the used token
    await prisma.verificationToken.delete({
      where: {
        identifier_token: {
          identifier: resetToken.identifier,
          token: resetToken.token,
        },
      },
    });

    // Delete all sessions for this user (force re-login)
    await prisma.session.deleteMany({
      where: { userId: user.id },
    });

    // Log the password reset
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "password_reset_completed",
        entityType: "user",
        entityId: user.id,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Password reset successfully. Please log in with your new password.",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }

    console.error("Reset password error:", error);
    return NextResponse.json(
      { error: "Failed to reset password" },
      { status: 500 }
    );
  }
}

// GET endpoint to verify token is valid (for UI validation)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json(
        { valid: false, error: "Token is required" },
        { status: 400 }
      );
    }

    const resetToken = await prisma.verificationToken.findFirst({
      where: {
        token,
        identifier: { startsWith: "password_reset:" },
        expires: { gt: new Date() },
      },
    });

    return NextResponse.json({
      valid: !!resetToken,
    });
  } catch (error) {
    console.error("Verify reset token error:", error);
    return NextResponse.json(
      { valid: false, error: "Failed to verify token" },
      { status: 500 }
    );
  }
}
