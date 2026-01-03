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
            id: true,
            fullName: true,
            username: true,
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
      storeId,
    } = body;

    console.log('Received transaction data:', body);

    if (!items || items.length === 0 || !storeId) {
      return NextResponse.json(
        { error: 'Items and store ID are required' },
        { status: 400 }
      );
    }

    // Get or create default cashier
    let cashier = await prisma.user.findFirst({
      where: {
        storeId,
        role: 'CASHIER',
      },
    });

    // If no cashier exists, create a default one
    if (!cashier) {
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash('kasir123', 10);
      
      cashier = await prisma.user.create({
        data: {
          username: 'kasir',
          password: hashedPassword,
          role: 'CASHIER',
          fullName: 'Kasir Default',
          storeId,
        },
      });
    }

    const invoiceNumber = await generateInvoiceNumber(storeId);

    // Create transaction with items
    const transaction = await prisma.transaction.create({
      data: {
        invoiceNumber,
        subtotal: parseFloat(subtotal.toString()),
        tax: parseFloat(tax?.toString() || '0'),
        discount: parseFloat(discount?.toString() || '0'),
        total: parseFloat(total.toString()),
        paymentMethod,
        amountPaid: parseFloat(amountPaid.toString()),
        change: parseFloat(change?.toString() || '0'),
        customerName: customerName || null,
        customerPhone: customerPhone || null,
        notes: notes || null,
        cashierId: cashier.id,
        storeId,
        items: {
          create: items.map((item: any) => ({
            productId: item.productId,
            productName: item.name,
            quantity: parseInt(item.quantity.toString()),
            price: parseFloat(item.price.toString()),
            subtotal: parseFloat(item.subtotal.toString()),
            discount: parseFloat(item.discount?.toString() || '0'),
          })),
        },
      },
      include: {
        items: true,
        cashier: {
          select: {
            id: true,
            fullName: true,
            username: true,
          },
        },
      },
    });

    // Update product stock
    for (const item of items) {
      try {
        await prisma.product.update({
          where: { id: item.productId },
          data: {
            stock: {
              decrement: parseInt(item.quantity.toString()),
            },
          },
        });
      } catch (error) {
        console.error(`Failed to update stock for product ${item.productId}:`, error);
      }
    }

    console.log('Transaction created successfully:', transaction.id);

    return NextResponse.json(transaction, { status: 201 });
  } catch (error: any) {
    console.error('Error creating transaction:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create transaction' },
      { status: 500 }
    );
  }
}