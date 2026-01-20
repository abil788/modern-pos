
// ===========================
// src/app/api/daily-closing/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const storeId = searchParams.get('storeId');

    if (!storeId) {
      return NextResponse.json({ error: 'Store ID required' }, { status: 400 });
    }

    const closings = await prisma.dailyClosing.findMany({
      where: { storeId },
      include: {
        cashier: {
          select: {
            id: true,
            fullName: true
          }
        }
      },
      orderBy: {
        closingDate: 'desc'
      },
      take: 30
    });

    return NextResponse.json(closings);

  } catch (error) {
    console.error('Error fetching daily closings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch daily closings' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      storeId,
      cashierId,
      closingDate,
      actualCash,
      paymentBreakdown,
      notes
    } = body;

    console.log('Daily Closing Request:', { storeId, cashierId, closingDate, actualCash });

    if (!storeId || !cashierId) {
      return NextResponse.json(
        { error: 'Store ID and Cashier ID required' },
        { status: 400 }
      );
    }

    // Get transactions for the day
    const startDate = new Date(closingDate);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(closingDate);
    endDate.setHours(23, 59, 59, 999);

    const transactions = await prisma.transaction.findMany({
      where: {
        storeId,
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      }
    });

    console.log(`Found ${transactions.length} transactions for closing`);

    // Calculate totals
    const totalTransactions = transactions.length;
    const totalRevenue = transactions.reduce((sum, t) => sum + t.total, 0);

    const cashTotal = transactions
      .filter(t => t.paymentMethod === 'CASH')
      .reduce((sum, t) => sum + t.total, 0);
    
    const transferTotal = transactions
      .filter(t => t.paymentMethod === 'TRANSFER')
      .reduce((sum, t) => sum + t.total, 0);
    
    const cardTotal = transactions
      .filter(t => t.paymentMethod === 'CARD')
      .reduce((sum, t) => sum + t.total, 0);
    
    const qrisTotal = transactions
      .filter(t => t.paymentMethod === 'QRIS')
      .reduce((sum, t) => sum + t.total, 0);

    const expectedCash = cashTotal;
    const actualCashAmount = parseFloat(actualCash?.toString() || '0');
    const cashDifference = actualCashAmount - expectedCash;

    console.log('Closing Summary:', { 
      totalTransactions, 
      totalRevenue, 
      expectedCash, 
      actualCashAmount, 
      cashDifference 
    });

    // Create daily closing
    const closing = await prisma.dailyClosing.create({
      data: {
        storeId,
        cashierId,
        closingDate: new Date(closingDate),
        totalTransactions,
        totalRevenue,
        cashTotal,
        transferTotal,
        cardTotal,
        qrisTotal,
        expectedCash,
        actualCash: actualCashAmount,
        cashDifference,
        paymentBreakdown: paymentBreakdown || {},
        notes: notes || null
      },
      include: {
        cashier: {
          select: {
            id: true,
            fullName: true
          }
        }
      }
    });

    console.log('Daily Closing Created:', closing.id);

    // Mark transactions as reconciled
    const updateResult = await prisma.transaction.updateMany({
      where: {
        storeId,
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      },
      data: {
        isReconciled: true,
        reconciledAt: new Date(),
        reconciledBy: cashierId,
        dailyClosingId: closing.id
      }
    });

    console.log(`Updated ${updateResult.count} transactions as reconciled`);

    return NextResponse.json({
      success: true,
      closing
    });

  } catch (error: any) {
    console.error('Error creating daily closing:', error);
    return NextResponse.json(
      { 
        error: 'Failed to create daily closing',
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

