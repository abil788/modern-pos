// src/app/api/reconciliation/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { calculatePaymentSummary } from '@/lib/payment-config';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const storeId = searchParams.get('storeId');
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];
    const summaryOnly = searchParams.get('summary') === 'true';

    if (!storeId) {
      return NextResponse.json({ error: 'Store ID required' }, { status: 400 });
    }

    // Get transactions for the day
    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);

    const transactions = await prisma.transaction.findMany({
      where: {
        storeId,
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      },
      include: {
        cashier: {
          select: {
            id: true,
            fullName: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Calculate payment summary
    const paymentSummary = calculatePaymentSummary(transactions);

    // Calculate totals
    const totalRevenue = transactions.reduce((sum, t) => sum + t.total, 0);
    const totalTransactions = transactions.length;
    
    // Group by method
    const byMethod = {
      CASH: 0,
      TRANSFER: 0,
      CARD: 0,
      QRIS: 0
    };

    transactions.forEach(trx => {
      const method = trx.paymentMethod;
      if (byMethod[method as keyof typeof byMethod] !== undefined) {
        byMethod[method as keyof typeof byMethod] += trx.total;
      }
    });

    // If summaryOnly, don't send transactions detail
    if (summaryOnly) {
      return NextResponse.json({
        date,
        totalRevenue,
        totalTransactions,
        byMethod,
        paymentSummary
        // transactions excluded to reduce payload
      });
    }

    // Full response with transactions (for export)
    return NextResponse.json({
      date,
      totalRevenue,
      totalTransactions,
      byMethod,
      paymentSummary,
      transactions: transactions.slice(0, 50) // Limit for performance
    });

  } catch (error) {
    console.error('Reconciliation error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reconciliation data' },
      { status: 500 }
    );
  }
}