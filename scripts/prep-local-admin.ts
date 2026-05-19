// One-shot: set a known password on the local admin user so the routing review
// can test both customer + admin sign-ins from the same login page. Localhost only.
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  if (!process.env.DATABASE_URL?.includes("localhost")) {
    console.error("Refusing to run: this is for local DB only.");
    process.exit(1);
  }
  const PASSWORD = "review2026";
  const hashed = await bcrypt.hash(PASSWORD, 12);
  const admin = await prisma.user.update({
    where: { email: "blayke@simplegrowth.local" },
    data: { password: hashed, emailVerified: new Date(), role: "admin" },
  });
  console.log("Admin local login ready:");
  console.log(`  Email:    ${admin.email}`);
  console.log(`  Password: ${PASSWORD}`);
  console.log(`  Role:     ${admin.role}`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
