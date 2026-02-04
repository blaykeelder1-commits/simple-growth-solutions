import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function createTestUser() {
  try {
    // Create test organization
    const org = await prisma.organization.upsert({
      where: { id: 'test-org-001' },
      update: {},
      create: {
        id: 'test-org-001',
        name: 'Demo Business',
        industry: 'retail',
        subscriptionTier: 'business_chauffeur',
      }
    });

    console.log('Created organization:', org.name);

    // Hash password
    const hashedPassword = await bcrypt.hash('demo123', 10);

    // Create test user
    const user = await prisma.user.upsert({
      where: { email: 'demo@test.com' },
      update: { password: hashedPassword, organizationId: org.id },
      create: {
        email: 'demo@test.com',
        name: 'Demo User',
        password: hashedPassword,
        organizationId: org.id,
      }
    });

    console.log('Created test user:', user.email);
    console.log('Password: demo123');

    // Create dummy client
    const client = await prisma.client.upsert({
      where: { id: 'test-client-001' },
      update: {},
      create: {
        id: 'test-client-001',
        organizationId: org.id,
        name: 'Acme Corp',
        email: 'billing@acme.com',
        paymentScore: 65,
        paymentBehaviorTier: 'B',
      }
    });

    const client2 = await prisma.client.upsert({
      where: { id: 'test-client-002' },
      update: {},
      create: {
        id: 'test-client-002',
        organizationId: org.id,
        name: 'TechStart Inc',
        email: 'accounts@techstart.io',
        paymentScore: 45,
        paymentBehaviorTier: 'C',
      }
    });

    console.log('Created clients:', client.name, client2.name);

    // Create invoices with various statuses
    const invoices = await Promise.all([
      prisma.invoice.upsert({
        where: { id: 'inv-001' },
        update: {},
        create: {
          id: 'inv-001',
          organizationId: org.id,
          clientId: client.id,
          invoiceNumber: 'INV-001',
          amount: 5000,
          status: 'overdue',
          dueDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          daysOverdue: 30,
        }
      }),
      prisma.invoice.upsert({
        where: { id: 'inv-002' },
        update: {},
        create: {
          id: 'inv-002',
          organizationId: org.id,
          clientId: client.id,
          invoiceNumber: 'INV-002',
          amount: 3500,
          status: 'overdue',
          dueDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
          daysOverdue: 15,
        }
      }),
      prisma.invoice.upsert({
        where: { id: 'inv-003' },
        update: {},
        create: {
          id: 'inv-003',
          organizationId: org.id,
          clientId: client2.id,
          invoiceNumber: 'INV-003',
          amount: 7500,
          status: 'sent',
          dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
          daysOverdue: 0,
        }
      }),
      prisma.invoice.upsert({
        where: { id: 'inv-004' },
        update: {},
        create: {
          id: 'inv-004',
          organizationId: org.id,
          clientId: client2.id,
          invoiceNumber: 'INV-004',
          amount: 12000,
          status: 'overdue',
          dueDate: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
          daysOverdue: 45,
        }
      }),
    ]);

    console.log('Created', invoices.length, 'invoices');
    console.log('\n✅ Demo account ready!');
    console.log('Email: demo@test.com');
    console.log('Password: demo123');

  } catch (e) {
    console.error('Error:', e);
  } finally {
    await prisma.$disconnect();
  }
}

createTestUser();
