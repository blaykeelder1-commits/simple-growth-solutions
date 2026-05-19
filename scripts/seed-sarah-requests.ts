// Simulates Sarah submitting 2 change requests through the customer portal —
// inserts the same DB rows the /api/projects/[id]/change-requests POST would
// produce. Localhost-only safety guard. Idempotent (skips if titles already
// exist for her project).
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { computeSlaDueAt } from "../src/lib/billing/sla";

const prisma = new PrismaClient();

const REQUESTS = [
  {
    title: "Update hero image to new fall menu photo",
    description:
      "Hi team — can you swap the homepage hero image to the new fall menu photo I uploaded to the shared Drive? Same crop, just the new photo. Want this live before Friday's promo email goes out.",
    type: "content" as const,
    priority: "high" as const,
  },
  {
    title: "Fix typo on About page (\"recieve\" → \"receive\")",
    description:
      "There's a typo in the second paragraph of the About page — 'recieve' should be 'receive'. Small thing but it's been bugging me. Thanks!",
    type: "bug" as const,
    priority: "normal" as const,
  },
];

async function main() {
  if (!process.env.DATABASE_URL?.includes("localhost")) {
    console.error("Refusing to run: localhost DB only.");
    process.exit(1);
  }

  const sarah = await prisma.user.findUnique({
    where: { email: "demo.sarah@simplegrowth.local" },
  });
  if (!sarah?.organizationId) {
    console.error("demo.sarah missing or has no org. Run prep-local-review.ts first.");
    process.exit(1);
  }

  const project = await prisma.websiteProject.findFirst({
    where: { organizationId: sarah.organizationId },
  });
  if (!project) {
    console.error("No project for Sarah's org.");
    process.exit(1);
  }

  console.log(`Submitting 2 change requests as Sarah for "${project.projectName}"...`);
  console.log("");

  for (const req of REQUESTS) {
    const existing = await prisma.changeRequest.findFirst({
      where: { projectId: project.id, title: req.title },
    });
    if (existing) {
      console.log(`  - SKIP (already exists): ${req.title}`);
      continue;
    }

    // Pro plan = 24h SLA. computeSlaDueAt picks the right window.
    const slaDueAt = computeSlaDueAt({ isRush: false, plan: "website_pro" });

    const cr = await prisma.changeRequest.create({
      data: {
        projectId: project.id,
        requesterId: sarah.id,
        title: req.title,
        description: req.description,
        type: req.type,
        priority: req.priority,
        isRush: false,
        slaDueAt,
        status: "pending",
      },
    });
    console.log(`  ✓ Submitted: ${req.title}`);
    console.log(`    id=${cr.id}  priority=${req.priority}  due=${slaDueAt?.toISOString().slice(0, 16) ?? "—"}`);
  }

  // Summary
  const allForProject = await prisma.changeRequest.findMany({
    where: { projectId: project.id },
    orderBy: { createdAt: "desc" },
  });
  console.log("");
  console.log("=== Admin queue snapshot ===");
  console.log(`Total CRs for "${project.projectName}": ${allForProject.length}`);
  for (const cr of allForProject.slice(0, 5)) {
    console.log(`  [${cr.status.padEnd(8)}] [${cr.priority.padEnd(6)}] ${cr.title}`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
