// Payroll API
// POST: Create payroll snapshot with entries
// GET: Fetch payroll data for organization

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { prisma } from '@/lib/db/prisma';
import { payrollLogger as logger } from '@/lib/logger';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const organizationId = session.user.organizationId;
    const body = await request.json();

    const { periodStart, periodEnd, payDate, entries } = body;

    if (!periodStart || !periodEnd || !payDate || !entries || !Array.isArray(entries)) {
      return NextResponse.json(
        { error: 'Missing required fields: periodStart, periodEnd, payDate, entries' },
        { status: 400 }
      );
    }

    // Calculate totals
    const totalGrossPay = entries.reduce((sum: number, e: { grossPay: number }) => sum + e.grossPay, 0);

    // Estimate taxes and net pay (simplified for demo)
    const estimatedTaxRate = 0.25; // 25% total tax estimate
    const totalTaxWithholdings = Math.round(totalGrossPay * estimatedTaxRate);
    const totalNetPay = totalGrossPay - totalTaxWithholdings;

    // Create or update employees from entries
    const employeeIds: string[] = [];
    for (const entry of entries) {
      const { employeeName, grossPay, department, role } = entry;

      // Find or create employee
      let employee = await prisma.employee.findFirst({
        where: {
          organizationId,
          name: employeeName,
        },
      });

      if (!employee) {
        employee = await prisma.employee.create({
          data: {
            organizationId,
            name: employeeName,
            role: role || 'Staff',
            department: department || 'General',
            hireDate: new Date(),
          },
        });
      }

      employeeIds.push(employee.id);

      // Update employee's calculated hourly rate based on this pay
      const periodDays = Math.ceil(
        (new Date(periodEnd).getTime() - new Date(periodStart).getTime()) / (1000 * 60 * 60 * 24)
      );
      const hoursWorked = (periodDays / 7) * 40; // Assume 40 hours per week
      const impliedHourlyRate = grossPay / 100 / hoursWorked;

      await prisma.employee.update({
        where: { id: employee.id },
        data: {
          hourlyRate: impliedHourlyRate,
        },
      });
    }

    // Build department breakdown
    const departmentMap: Record<string, { cost: number; employees: number }> = {};
    for (const entry of entries) {
      const dept = entry.department || 'General';
      if (!departmentMap[dept]) {
        departmentMap[dept] = { cost: 0, employees: 0 };
      }
      departmentMap[dept].cost += entry.grossPay;
      departmentMap[dept].employees += 1;
    }

    const departmentBreakdown = Object.entries(departmentMap).map(([name, data]) => ({
      name,
      cost: data.cost,
      employees: data.employees,
    }));

    // Create payroll snapshot
    const snapshot = await prisma.payrollSnapshot.create({
      data: {
        organizationId,
        periodStart: new Date(periodStart),
        periodEnd: new Date(periodEnd),
        payDate: new Date(payDate),
        totalGrossPay: totalGrossPay / 100, // Store in dollars
        totalNetPay: totalNetPay / 100,
        totalTaxWithholdings: totalTaxWithholdings / 100,
        employeeCount: entries.length,
        departmentBreakdown: JSON.stringify(departmentBreakdown),
        source: 'manual',
      },
    });

    // Create individual payroll entries
    for (const entry of entries) {
      const employee = await prisma.employee.findFirst({
        where: {
          organizationId,
          name: entry.employeeName,
        },
      });

      if (employee) {
        const entryGrossPay = entry.grossPay / 100;
        const entryTaxWithholdings = entryGrossPay * estimatedTaxRate;
        const entryNetPay = entryGrossPay - entryTaxWithholdings;

        await prisma.payrollEntry.create({
          data: {
            snapshotId: snapshot.id,
            employeeId: employee.id,
            grossPay: entryGrossPay,
            netPay: entryNetPay,
            taxWithholdings: entryTaxWithholdings,
            regularHours: entry.hoursWorked || 80, // Default to 80 hours for biweekly
            department: entry.department || 'General',
          },
        });
      }
    }

    return NextResponse.json({
      success: true,
      snapshot: {
        id: snapshot.id,
        periodStart: snapshot.periodStart,
        periodEnd: snapshot.periodEnd,
        totalGrossPay: Number(snapshot.totalGrossPay) * 100, // Return in cents
        employeeCount: snapshot.employeeCount,
      },
    });
  } catch (error) {
    logger.error('[Payroll API] Create error:', error);
    return NextResponse.json(
      { error: 'Failed to create payroll entry' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const organizationId = session.user.organizationId;

    // Get recent payroll snapshots
    const snapshots = await prisma.payrollSnapshot.findMany({
      where: { organizationId },
      orderBy: { payDate: 'desc' },
      take: 12, // Last 12 pay periods
    });

    // Get current employee count
    const employeeCount = await prisma.employee.count({
      where: { organizationId, status: 'active' },
    });

    // Calculate current period stats
    const currentPeriod = snapshots[0];
    const previousPeriod = snapshots[1];

    let payrollGrowth = 0;
    if (currentPeriod && previousPeriod) {
      const current = Number(currentPeriod.totalGrossPay);
      const previous = Number(previousPeriod.totalGrossPay);
      payrollGrowth = previous > 0 ? (current - previous) / previous : 0;
    }

    // Calculate payroll as percentage of revenue (if revenue data available)
    // For now, use a placeholder
    const payrollAsPercentOfRevenue = 0.32;

    return NextResponse.json({
      success: true,
      currentPeriod: currentPeriod
        ? {
            totalGrossPay: Number(currentPeriod.totalGrossPay) * 100,
            totalNetPay: Number(currentPeriod.totalNetPay) * 100,
            employeeCount: currentPeriod.employeeCount,
            totalBenefitsCost: Number(currentPeriod.totalBenefitsCost) * 100,
            totalOvertimeCost: Number(currentPeriod.totalOvertimeCost) * 100,
            payrollAsPercentOfRevenue,
            departmentBreakdown: currentPeriod.departmentBreakdown
              ? JSON.parse(currentPeriod.departmentBreakdown)
              : [],
          }
        : null,
      trends: {
        payrollGrowth,
        headcountChange: currentPeriod && previousPeriod
          ? currentPeriod.employeeCount - previousPeriod.employeeCount
          : 0,
      },
      snapshots: snapshots.map(s => ({
        id: s.id,
        periodStart: s.periodStart,
        periodEnd: s.periodEnd,
        payDate: s.payDate,
        totalGrossPay: Number(s.totalGrossPay) * 100,
        employeeCount: s.employeeCount,
      })),
      employeeCount,
    });
  } catch (error) {
    logger.error('[Payroll API] Get error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch payroll data' },
      { status: 500 }
    );
  }
}
