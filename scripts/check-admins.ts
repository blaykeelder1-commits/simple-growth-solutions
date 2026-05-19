import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const admins = await prisma.user.findMany({
    where: { role: "admin" },
    select: { id: true, email: true, name: true, emailVerified: true, createdAt: true },
  });

  console.log(`Found ${admins.length} admin user(s):`);
  for (const a of admins) {
    console.log(`  - ${a.email}  (name: ${a.name ?? "(none)"}, verified: ${!!a.emailVerified})`);
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
