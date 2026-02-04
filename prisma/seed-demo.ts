// Demo Data Seeding Script
// Creates realistic sample data for "Riverside Coffee Shop"

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const DEMO_ORG_ID = "demo-riverside-coffee-shop";

// Sample clients with varied payment behaviors
const SAMPLE_CLIENTS = [
  // Great payers (A tier)
  { name: "City Events Co.", industry: "events", tier: "A", avgDays: 12, lateRate: 0.05 },
  { name: "Metropolitan Hotels", industry: "hospitality", tier: "A", avgDays: 15, lateRate: 0.08 },
  { name: "Tech Startup Hub", industry: "technology", tier: "A", avgDays: 10, lateRate: 0.03 },
  { name: "Green Valley Farms", industry: "agriculture", tier: "A", avgDays: 18, lateRate: 0.1 },
  { name: "Downtown Law Firm", industry: "legal", tier: "A", avgDays: 14, lateRate: 0.05 },

  // Good payers (B tier)
  { name: "Local Gym & Fitness", industry: "fitness", tier: "B", avgDays: 25, lateRate: 0.15 },
  { name: "Community College", industry: "education", tier: "B", avgDays: 28, lateRate: 0.12 },
  { name: "Riverside Dental", industry: "healthcare", tier: "B", avgDays: 22, lateRate: 0.18 },
  { name: "Art Gallery District", industry: "retail", tier: "B", avgDays: 30, lateRate: 0.2 },
  { name: "Insurance Partners LLC", industry: "finance", tier: "B", avgDays: 26, lateRate: 0.15 },
  { name: "Main Street Bakery", industry: "food", tier: "B", avgDays: 24, lateRate: 0.16 },
  { name: "Bookworm Cafe", industry: "retail", tier: "B", avgDays: 27, lateRate: 0.14 },
  { name: "Yoga Studio Zen", industry: "fitness", tier: "B", avgDays: 23, lateRate: 0.17 },
  { name: "Pet Paradise", industry: "retail", tier: "B", avgDays: 29, lateRate: 0.19 },
  { name: "Creative Agency X", industry: "marketing", tier: "B", avgDays: 25, lateRate: 0.13 },

  // Average payers (C tier)
  { name: "Construction Co. Inc", industry: "construction", tier: "C", avgDays: 42, lateRate: 0.35 },
  { name: "Catering Services Plus", industry: "food", tier: "C", avgDays: 38, lateRate: 0.28 },
  { name: "Auto Repair Shop", industry: "automotive", tier: "C", avgDays: 45, lateRate: 0.32 },
  { name: "Garden Center & Nursery", industry: "retail", tier: "C", avgDays: 40, lateRate: 0.3 },
  { name: "Photography Studio", industry: "creative", tier: "C", avgDays: 35, lateRate: 0.25 },
  { name: "Music School", industry: "education", tier: "C", avgDays: 38, lateRate: 0.27 },
  { name: "Hair Salon Elite", industry: "beauty", tier: "C", avgDays: 36, lateRate: 0.26 },
  { name: "Tech Repair Services", industry: "technology", tier: "C", avgDays: 44, lateRate: 0.33 },
  { name: "Printing Press Co", industry: "manufacturing", tier: "C", avgDays: 41, lateRate: 0.31 },
  { name: "Security Services Ltd", industry: "services", tier: "C", avgDays: 39, lateRate: 0.29 },

  // Poor payers (D tier) - but still valuable customers
  { name: "Seasonal Rentals LLC", industry: "real estate", tier: "D", avgDays: 58, lateRate: 0.55 },
  { name: "Event Planning Pro", industry: "events", tier: "D", avgDays: 62, lateRate: 0.5 },
  { name: "Freelance Network", industry: "services", tier: "D", avgDays: 55, lateRate: 0.48 },
  { name: "Startup Incubator", industry: "technology", tier: "D", avgDays: 65, lateRate: 0.6 },
  { name: "Small Theater Group", industry: "entertainment", tier: "D", avgDays: 52, lateRate: 0.45 },

  // Additional clients to reach 50
  { name: "Office Supply Depot", industry: "retail", tier: "B", avgDays: 26, lateRate: 0.16 },
  { name: "Accounting Firm Smith", industry: "finance", tier: "A", avgDays: 16, lateRate: 0.07 },
  { name: "Marketing Agency Z", industry: "marketing", tier: "B", avgDays: 28, lateRate: 0.18 },
  { name: "Restaurant Group Inc", industry: "food", tier: "C", avgDays: 37, lateRate: 0.26 },
  { name: "Sports Complex", industry: "fitness", tier: "B", avgDays: 24, lateRate: 0.15 },
  { name: "Medical Clinic West", industry: "healthcare", tier: "A", avgDays: 19, lateRate: 0.09 },
  { name: "Moving Company Plus", industry: "services", tier: "C", avgDays: 43, lateRate: 0.34 },
  { name: "Flower Shop Central", industry: "retail", tier: "B", avgDays: 25, lateRate: 0.17 },
  { name: "Childcare Center", industry: "education", tier: "B", avgDays: 27, lateRate: 0.14 },
  { name: "Cleaning Services Pro", industry: "services", tier: "C", avgDays: 36, lateRate: 0.28 },
  { name: "Coffee Roasters Inc", industry: "food", tier: "A", avgDays: 17, lateRate: 0.06 },
  { name: "Web Design Studio", industry: "technology", tier: "B", avgDays: 29, lateRate: 0.19 },
  { name: "Travel Agency Dreams", industry: "travel", tier: "C", avgDays: 41, lateRate: 0.32 },
  { name: "Hardware Store Main", industry: "retail", tier: "B", avgDays: 23, lateRate: 0.14 },
  { name: "Real Estate Office", industry: "real estate", tier: "C", avgDays: 38, lateRate: 0.27 },
];

// Seasonal patterns (monthly multipliers)
const SEASONAL_PATTERNS = {
  restaurant: [0.85, 0.9, 1.0, 1.05, 1.1, 1.15, 1.2, 1.15, 1.1, 1.0, 0.95, 1.3], // Peak in summer and December
};

async function seedDemoData() {
  console.log("Starting demo data seeding...");

  // Check if demo org already exists
  const existingOrg = await prisma.organization.findUnique({
    where: { id: DEMO_ORG_ID },
  });

  if (existingOrg) {
    console.log("Demo organization already exists. Deleting and recreating...");
    // Delete existing data (cascade will handle related records)
    await prisma.organization.delete({ where: { id: DEMO_ORG_ID } });
  }

  // Create demo organization
  console.log("Creating demo organization...");
  const org = await prisma.organization.create({
    data: {
      id: DEMO_ORG_ID,
      name: "Riverside Coffee Shop",
      industry: "restaurant",
      annualRevenueTier: "500k-1m",
      timezone: "America/New_York",
      currency: "USD",
      subscriptionTier: "pro",
      subscriptionStatus: "demo",
    },
  });

  // Create clients
  console.log("Creating clients...");
  const clients = await Promise.all(
    SAMPLE_CLIENTS.map(async (clientData, index) => {
      const paymentScore =
        clientData.tier === "A" ? 85 + Math.floor(Math.random() * 15) :
        clientData.tier === "B" ? 65 + Math.floor(Math.random() * 20) :
        clientData.tier === "C" ? 45 + Math.floor(Math.random() * 20) :
        25 + Math.floor(Math.random() * 20);

      return prisma.client.create({
        data: {
          organizationId: org.id,
          name: clientData.name,
          email: `contact@${clientData.name.toLowerCase().replace(/[^a-z0-9]/g, "")}.com`,
          industry: clientData.industry,
          paymentScore,
          paymentBehaviorTier: clientData.tier,
          avgDaysToPayment: new Prisma.Decimal(clientData.avgDays),
          totalOutstanding: new Prisma.Decimal(0),
          totalPaid: new Prisma.Decimal(0),
          totalInvoiced: new Prisma.Decimal(0),
          preferredPaymentMethod: ["ach", "check", "credit_card", "wire"][index % 4],
          bestContactDay: ["monday", "tuesday", "wednesday", "thursday", "friday"][index % 5],
          bestContactHour: 9 + (index % 6),
        },
      });
    })
  );

  console.log(`Created ${clients.length} clients`);

  // Generate 6 months of invoice history
  console.log("Generating invoice history...");
  const now = new Date();
  const invoices: Array<{
    clientId: string;
    invoiceNumber: string;
    amount: Prisma.Decimal;
    dueDate: Date;
    issueDate: Date;
    status: string;
    paidDate: Date | null;
    amountPaid: Prisma.Decimal;
  }> = [];

  for (let monthsAgo = 0; monthsAgo < 6; monthsAgo++) {
    const monthDate = new Date(now);
    monthDate.setMonth(monthDate.getMonth() - monthsAgo);
    const monthIndex = monthDate.getMonth();
    const seasonalMultiplier = SEASONAL_PATTERNS.restaurant[monthIndex];

    for (const client of clients) {
      // Generate 1-4 invoices per client per month based on seasonal patterns
      const invoiceCount = Math.floor(1 + Math.random() * 3 * seasonalMultiplier);

      for (let i = 0; i < invoiceCount; i++) {
        const clientData = SAMPLE_CLIENTS.find((c) => c.name === client.name)!;

        // Random day within the month
        const issueDay = 1 + Math.floor(Math.random() * 28);
        const issueDate = new Date(monthDate.getFullYear(), monthDate.getMonth(), issueDay);

        // Due date 30 days after issue
        const dueDate = new Date(issueDate);
        dueDate.setDate(dueDate.getDate() + 30);

        // Invoice amount based on client tier
        const baseAmount = clientData.tier === "A" ? 1500 :
                          clientData.tier === "B" ? 800 :
                          clientData.tier === "C" ? 500 : 300;
        const amount = Math.round(baseAmount * (0.5 + Math.random()) * 100); // in cents

        // Determine payment status
        const daysSinceDue = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
        let status: string;
        let paidDate: Date | null = null;
        let amountPaid = 0;

        if (daysSinceDue < 0) {
          // Not yet due
          status = "sent";
        } else if (Math.random() > clientData.lateRate) {
          // Paid on time or slightly late
          status = "paid";
          paidDate = new Date(dueDate);
          paidDate.setDate(paidDate.getDate() + Math.floor(Math.random() * clientData.avgDays));
          amountPaid = amount;
        } else if (daysSinceDue > 60 && Math.random() < 0.3) {
          // Very overdue, partial payment
          status = "partial";
          amountPaid = Math.round(amount * (0.3 + Math.random() * 0.4));
        } else if (daysSinceDue > 30) {
          // Overdue
          status = "overdue";
        } else {
          // Recently overdue, likely to pay soon
          if (Math.random() < 0.5) {
            status = "paid";
            paidDate = new Date(dueDate);
            paidDate.setDate(paidDate.getDate() + daysSinceDue - Math.floor(Math.random() * 10));
            amountPaid = amount;
          } else {
            status = "overdue";
          }
        }

        invoices.push({
          clientId: client.id,
          invoiceNumber: `INV-${monthDate.getFullYear()}${(monthDate.getMonth() + 1).toString().padStart(2, "0")}-${(invoices.length + 1).toString().padStart(4, "0")}`,
          amount: new Prisma.Decimal(amount),
          dueDate,
          issueDate,
          status,
          paidDate,
          amountPaid: new Prisma.Decimal(amountPaid),
        });
      }
    }
  }

  // Insert invoices in batches
  console.log(`Creating ${invoices.length} invoices...`);
  for (const invoice of invoices) {
    const daysOverdue = invoice.status === "overdue" || invoice.status === "partial"
      ? Math.max(0, Math.floor((now.getTime() - invoice.dueDate.getTime()) / (1000 * 60 * 60 * 24)))
      : 0;

    await prisma.invoice.create({
      data: {
        organizationId: org.id,
        clientId: invoice.clientId,
        invoiceNumber: invoice.invoiceNumber,
        amount: invoice.amount,
        amountPaid: invoice.amountPaid,
        dueDate: invoice.dueDate,
        issueDate: invoice.issueDate,
        paidDate: invoice.paidDate,
        status: invoice.status,
        daysOverdue,
        source: "demo",
        recoveryLikelihood: invoice.status === "overdue"
          ? new Prisma.Decimal(0.3 + Math.random() * 0.5)
          : invoice.status === "partial"
          ? new Prisma.Decimal(0.5 + Math.random() * 0.3)
          : null,
        riskLevel: invoice.status === "overdue"
          ? daysOverdue > 60 ? "critical" : daysOverdue > 30 ? "high" : "medium"
          : null,
      },
    });
  }

  // Update client totals
  console.log("Updating client totals...");
  for (const client of clients) {
    const clientInvoices = await prisma.invoice.findMany({
      where: { clientId: client.id },
    });

    const totalInvoiced = clientInvoices.reduce((sum, inv) => sum + Number(inv.amount), 0);
    const totalPaid = clientInvoices.reduce((sum, inv) => sum + Number(inv.amountPaid), 0);
    const totalOutstanding = totalInvoiced - totalPaid;

    await prisma.client.update({
      where: { id: client.id },
      data: {
        totalInvoiced: new Prisma.Decimal(totalInvoiced),
        totalPaid: new Prisma.Decimal(totalPaid),
        totalOutstanding: new Prisma.Decimal(totalOutstanding),
      },
    });
  }

  // Create sample AI recommendations
  console.log("Creating AI recommendations...");
  const overdueInvoices = await prisma.invoice.findMany({
    where: {
      organizationId: org.id,
      status: { in: ["overdue", "partial"] },
    },
    include: { client: true },
    take: 5,
  });

  for (const invoice of overdueInvoices) {
    await prisma.aIRecommendation.create({
      data: {
        organizationId: org.id,
        invoiceId: invoice.id,
        clientId: invoice.clientId,
        type: "collection_strategy",
        title: `Consider following up on Invoice ${invoice.invoiceNumber}`,
        description: `This invoice for ${invoice.client?.name || "Unknown Client"} is ${invoice.daysOverdue} days overdue. Based on their payment history, you could consider a phone call follow-up.`,
        priority: invoice.daysOverdue > 60 ? "critical" : invoice.daysOverdue > 30 ? "high" : "medium",
        confidence: new Prisma.Decimal(0.75 + Math.random() * 0.2),
        reasoning: JSON.stringify({
          factors: [
            "Invoice age",
            "Client payment history",
            "Industry patterns",
            "Communication timing",
          ],
        }),
        status: "pending",
      },
    });
  }

  // Create recovery events (showing past successes)
  console.log("Creating recovery events...");
  const paidInvoices = await prisma.invoice.findMany({
    where: {
      organizationId: org.id,
      status: "paid",
      paidDate: { not: null },
    },
    take: 20,
  });

  for (const invoice of paidInvoices.slice(0, 10)) {
    const wasOverdue = invoice.paidDate && invoice.dueDate &&
      invoice.paidDate > invoice.dueDate;

    if (wasOverdue) {
      await prisma.recoveryEvent.create({
        data: {
          organizationId: org.id,
          invoiceId: invoice.id,
          clientId: invoice.clientId,
          eventType: "overdue_recovery",
          invoiceAmount: invoice.amount,
          recoveredAmount: invoice.amountPaid,
          amount: Number(invoice.amountPaid),
          daysOverdue: Math.floor((invoice.paidDate!.getTime() - invoice.dueDate.getTime()) / (1000 * 60 * 60 * 24)),
          attributedTo: Math.random() > 0.5 ? "ai_recommendation" : "follow_up",
          status: "confirmed",
          confirmedAt: invoice.paidDate,
          eventDate: invoice.paidDate!,
        },
      });
    }
  }

  // Create cash flow snapshot
  console.log("Creating cash flow snapshot...");
  const allInvoices = await prisma.invoice.findMany({
    where: { organizationId: org.id },
  });

  const totalReceivables = allInvoices
    .filter((inv) => inv.status !== "paid")
    .reduce((sum, inv) => sum + (Number(inv.amount) - Number(inv.amountPaid)), 0);

  const overdueReceivables = allInvoices
    .filter((inv) => inv.status === "overdue" || inv.status === "partial")
    .reduce((sum, inv) => sum + (Number(inv.amount) - Number(inv.amountPaid)), 0);

  await prisma.cashFlowSnapshot.create({
    data: {
      organizationId: org.id,
      snapshotDate: now,
      totalReceivables: new Prisma.Decimal(totalReceivables),
      overdueReceivables: new Prisma.Decimal(overdueReceivables),
      cashFlowHealthScore: 78,
      runwayDays: 45,
      projectedInflow30d: new Prisma.Decimal(Math.round(totalReceivables * 0.6)),
      projectedInflow60d: new Prisma.Decimal(Math.round(totalReceivables * 0.8)),
      projectedInflow90d: new Prisma.Decimal(Math.round(totalReceivables * 0.95)),
    },
  });

  console.log("\n✅ Demo data seeding completed successfully!");
  console.log(`   Organization: ${org.name}`);
  console.log(`   Clients: ${clients.length}`);
  console.log(`   Invoices: ${invoices.length}`);
  console.log(`   Recommendations: ${overdueInvoices.length}`);
  console.log(`\n   Demo URL: /demo`);
}

// Run seeding
seedDemoData()
  .catch((error) => {
    console.error("Error seeding demo data:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
