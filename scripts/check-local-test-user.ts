import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    select: { email: true, role: true, organizationId: true },
    take: 5,
  });
  console.log(`Local DB has ${users.length} user(s):`);
  for (const u of users) console.log(`  - ${u.email}  role=${u.role}  org=${u.organizationId ? "yes" : "no"}`);

  const projects = await prisma.websiteProject.findMany({
    select: { projectName: true, status: true, deployedUrl: true },
    take: 5,
  });
  console.log(`\nLocal DB has ${projects.length} project(s):`);
  for (const p of projects) console.log(`  - ${p.projectName} (${p.status})  deployedUrl=${p.deployedUrl || "(none)"}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
