import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const storeId = searchParams.get('storeId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const search = searchParams.get('search'); // New search parameter

    if (!storeId) {
      return NextResponse.json({ error: 'Store ID required' }, { status: 400 });
    }

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = { storeId };

    // Add date filter
    if (startDate && endDate) {
      where.createdAt = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    // Add search filter - search in invoice number and customer name
    if (search) {
      where.OR = [
        {
          invoiceNumber: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          customerName: {
            contains: search,
            mode: 'insensitive',
          },
        },
      ];
    }

    // Get total count with filters
    const totalCount = await prisma.transaction.count({ where });

    // Get paginated transactions
    const transactions = await prisma.transaction.findMany({
      where,
      include: {
        items: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip,
      take: limit,
    });

    // Calculate stats for the filtered data (not just current page)
    const allFilteredTransactions = await prisma.transaction.findMany({
      where,
      select: {
        total: true,
      },
    });

    const totalRevenue = allFilteredTransactions.reduce((sum, t) => sum + t.total, 0);
    const avgTransaction = totalCount > 0 ? totalRevenue / totalCount : 0;

    return NextResponse.json({
      transactions,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit),
        totalCount,
        limit,
        totalRevenue,
        avgTransaction,
      },
    });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transactions' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();

    const transaction = await prisma.transaction.create({
      data: {
        storeId: data.storeId,
        cashierId: data.cashierId,
        invoiceNumber: data.invoiceNumber,
        customerName: data.customerName,
        customerPhone: data.customerPhone,
        subtotal: data.subtotal,
        tax: data.tax,
        discount: data.discount,
        total: data.total,
        amountPaid: data.amountPaid,
        change: data.change,
        paymentMethod: data.paymentMethod,
        notes: data.notes,
        items: {
          create: data.items.map((item: any) => ({
            productId: item.productId,
            productName: item.productName,
            sku: item.sku,
            quantity: item.quantity,
            price: item.price,
            discount: item.discount,
            subtotal: item.subtotal,
          })),
        },
      },
      include: {
        items: true,
      },
    });

    // Update product stock
    for (const item of data.items) {
      await prisma.product.update({
        where: { id: item.productId },
        data: {
          stock: {
            decrement: item.quantity,
          },
        },
      });
    }

    return NextResponse.json(transaction);
  } catch (error) {
    console.error('Error creating transaction:', error);
    return NextResponse.json(
      { error: 'Failed to create transaction' },
      { status: 500 }
    );
  }
}