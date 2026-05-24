import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { withAuth } from "@/lib/api/with-auth";
import { apiError } from "@/lib/api/errors";
import { z } from "zod";

// GET /api/cashflow/invoices - List invoices with cursor-based pagination
export const GET = withAuth(async (request: NextRequest, _ctx, session) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user?.organizationId) {
      return NextResponse.json({
        success: true,
        data: [],
        pagination: { hasMore: false, nextCursor: null },
      });
    }

    const { searchParams } = new URL(request.url);
    const cursor = searchParams.get("cursor");
    const take = Math.min(Math.max(1, parseInt(searchParams.get("take") || "20") || 20), 100);

    const results = await prisma.invoice.findMany({
      take: take + 1,
      cursor: cursor ? { id: cursor } : undefined,
      orderBy: { createdAt: "desc" },
      where: { organizationId: user.organizationId },
      include: {
        client: {
          select: { id: true, name: true },
        },
      },
    });

    const hasMore = results.length > take;
    const data = hasMore ? results.slice(0, -1) : results;

    return NextResponse.json({
      success: true,
      data,
      pagination: {
        hasMore,
        nextCursor: hasMore ? data[data.length - 1].id : null,
      },
    });
  } catch (error) {
    return apiError(error, "Failed to fetch invoices");
  }
});

const createInvoiceSchema = z.object({
  clientId: z.string().optional(),
  clientName: z.string().min(1).optional(),
  clientEmail: z.string().email().optional(),
  invoiceNumber: z.string().min(1, "Invoice number is required"),
  amount: z.number().positive("Amount must be positive"),
  dueDate: z.string().min(1, "Due date is required"),
  status: z.enum(["draft", "sent", "overdue"]).default("sent"),
  notes: z.string().optional(),
  lineItems: z.string().optional(),
});

// POST /api/cashflow/invoices - Create a manual invoice
export const POST = withAuth(async (request: NextRequest, _ctx, session) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user?.organizationId) {
      return NextResponse.json(
        { success: false, message: "No organization found" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const data = createInvoiceSchema.parse(body);

    let clientId = data.clientId || null;

    // If no clientId but clientName provided, create or find the client
    if (!clientId && data.clientName) {
      const existingClient = await prisma.client.findFirst({
        where: {
          organizationId: user.organizationId,
          name: data.clientName,
        },
      });

      if (existingClient) {
        clientId = existingClient.id;
      } else {
        const newClient = await prisma.client.create({
          data: {
            organizationId: user.organizationId,
            name: data.clientName,
            email: data.clientEmail || null,
          },
        });
        clientId = newClient.id;
      }
    }

    const dueDate = new Date(data.dueDate);
    const now = new Date();
    const daysOverdue = dueDate < now
      ? Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    const invoice = await prisma.invoice.create({
      data: {
        organizationId: user.organizationId,
        clientId,
        invoiceNumber: data.invoiceNumber,
        amount: data.amount,
        dueDate,
        status: daysOverdue > 0 ? "overdue" : data.status,
        daysOverdue,
        notes: data.notes || null,
        lineItems: data.lineItems || null,
        source: "manual",
      },
      include: {
        client: { select: { id: true, name: true } },
      },
    });

    // Update client totals if linked
    if (clientId) {
      await prisma.client.update({
        where: { id: clientId },
        data: {
          totalInvoiced: { increment: data.amount },
          totalOutstanding: { increment: data.amount },
        },
      }).catch(() => {});
    }

    return NextResponse.json(
      { success: true, invoice },
      { status: 201 }
    );
  } catch (error) {
    return apiError(error, "Failed to create invoice");
  }
});
