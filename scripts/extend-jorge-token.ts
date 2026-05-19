import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const email = "wasterescuekc@gmail.com";
  const newExpiry = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);

  const result = await prisma.verificationToken.updateMany({
    where: { identifier: `password_reset:${email}` },
    data: { expires: newExpiry },
  });

  console.log(`Updated ${result.count} token(s); new expiry: ${newExpiry.toISOString()}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
