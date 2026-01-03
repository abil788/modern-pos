import { NextRequest, NextResponse } from 'next/server';
import prisma, { generateInvoiceNumber } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const storeId = searchParams.get('storeId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!storeId) {
      return NextResponse.json({ error: 'Store ID required' }, { status: 400 });
    }

    const where: any = { storeId };

    if (startDate && endDate) {
      where.createdAt = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    const transactions = await prisma.transaction.findMany({
      where,
      include: {
        items: true,
        cashier: {
          select: {
            fullName: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(transactions);
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      items,
      subtotal,
      tax,
      discount,
      total,
      paymentMethod,
      amountPaid,
      change,
      customerName,
      customerPhone,
      notes,
      cashierId,
      storeId,
    } = body;

    if (!items || items.length === 0 || !storeId || !cashierId) {
      return NextResponse.json(
        { error: 'Items, store ID, and cashier ID are required' },
        { status: 400 }
      );
    }

    const invoiceNumber = await generateInvoiceNumber(storeId);

    // Create transaction with items
    const transaction = await prisma.transaction.create({
      data: {
        invoiceNumber,
        subtotal: parseFloat(subtotal),
        tax: parseFloat(tax) || 0,
        discount: parseFloat(discount) || 0,
        total: parseFloat(total),
        paymentMethod,
        amountPaid: parseFloat(amountPaid),
        change: parseFloat(change) || 0,
        customerName,
        customerPhone,
        notes,
        cashierId,
        storeId,
        items: {
          create: items.map((item: any) => ({
            productId: item.productId,
            productName: item.name,
            quantity: item.quantity,
            price: parseFloat(item.price),
            subtotal: parseFloat(item.subtotal),
            discount: parseFloat(item.discount) || 0,
          })),
        },
      },
      include: {
        items: true,
      },
    });

    // Update product stock
    for (const item of items) {
      await prisma.product.update({
        where: { id: item.productId },
        data: {
          stock: {
            decrement: item.quantity,
          },
        },
      });
    }

    return NextResponse.json(transaction, { status: 201 });
  } catch (error) {
    console.error('Error creating transaction:', error);
    return NextResponse.json({ error: 'Failed to create transaction' }, { status: 500 });
  }
}