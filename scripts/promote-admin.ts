import "dotenv/config";
import { PrismaClient } from "@prisma/client";

/**
 * Promote (or demote) a user's role by email.
 *
 *   npx tsx scripts/promote-admin.ts <email> [role]
 *
 * role defaults to "admin". Runs against whatever DATABASE_URL is in the
 * environment — to target production, prefix with the prod connection string:
 *   DATABASE_URL="postgres://...prod..." npx tsx scripts/promote-admin.ts you@x.com admin
 *
 * Idempotent and reversible (pass "owner" to revert a customer account).
 */
const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2];
  const role = process.argv[3] ?? "admin";
  if (!email) {
    console.error("Usage: tsx scripts/promote-admin.ts <email> [role=admin]");
    process.exit(1);
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, name: true, role: true },
  });
  if (!user) {
    console.error(`No user found with email: ${email}`);
    process.exit(1);
  }

  console.log(`Before: ${user.email} — role=${user.role}`);
  if (user.role === role) {
    console.log(`Already role=${role}; nothing to change.`);
    return;
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { role },
    select: { email: true, role: true },
  });
  console.log(`After:  ${updated.email} — role=${updated.role}  ✅`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
