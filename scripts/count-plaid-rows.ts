// Pre-rotation check for ENCRYPTION_KEY:
// Counts production rows that hold encrypted Plaid material.
// If the result is 0, you can rotate ENCRYPTION_KEY freely (Path A).
// If > 0, you need the dual-key migration (Path B) before rotating.
//
// Usage:
//   DATABASE_URL="<prod url>" npx tsx scripts/count-plaid-rows.ts

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const items = await prisma.plaidItem.count();
  const integrations = await prisma.integration.count({
    where: { accessTokenEncrypted: { not: null } },
  });
  console.log(JSON.stringify({ plaid_items: items, encrypted_integrations: integrations }, null, 2));
  if (items === 0 && integrations === 0) {
    console.log("\nPath A: safe to rotate ENCRYPTION_KEY without migration.");
  } else {
    console.log(
      "\nPath B required: existing encrypted rows will become unreadable after rotation."
    );
    console.log(
      "Either add dual-key support to src/lib/encryption.ts before rotating, or drop these rows first."
    );
  }
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
