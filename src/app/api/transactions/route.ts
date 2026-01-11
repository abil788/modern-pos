import { NextRequest, NextResponse } from 'next/server';
import prisma, { generateInvoiceNumber } from '@/lib/db';

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const searchParams = request.nextUrl.searchParams;
    const storeId = searchParams.get('storeId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const search = searchParams.get('search'); 
    
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;

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

    const [transactions, totalCount] = await Promise.all([
      prisma.transaction.findMany({
        where,
        include: {
          items: true,
          cashier: {
            select: {
              id: true,
              fullName: true,
              username: true,
              role: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: limit,
        skip: offset,
      }),
      prisma.transaction.count({ where }),
    ]);

    const statsStartTime = Date.now();
    const allFilteredTransactions = await prisma.transaction.findMany({
      where,
      select: {
        total: true,
      },
    });

    const totalRevenue = allFilteredTransactions.reduce((sum, t) => sum + t.total, 0);
    const avgTransaction = totalCount > 0 ? totalRevenue / totalCount : 0;
    
    console.log(`[TRANSACTIONS API] Stats calculation: ${Date.now() - statsStartTime}ms`);

    const queryTime = Date.now() - startTime;
    console.log(`[TRANSACTIONS API] GET Query took: ${queryTime}ms | Transactions: ${transactions.length} | Page: ${page}${search ? ` | Search: "${search}"` : ''}`);

    return NextResponse.json({
      transactions,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
        hasMore: offset + transactions.length < totalCount,
        totalRevenue,     
        avgTransaction,    
      },
      performance: {
        queryTime: `${queryTime}ms`,
      },
    });
  } catch (error) {
    const queryTime = Date.now() - startTime;
    console.error(`[TRANSACTIONS API] GET Error after ${queryTime}ms:`, error);
    return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
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
      cashierId, // ✅ CRITICAL: This must be sent from frontend
    } = body;

    console.log(`[TRANSACTIONS API] Received transaction data at ${new Date().toISOString()}`);
    console.log(`[TRANSACTIONS API] Received cashierId: ${cashierId}`); // ✅ Log untuk debugging

    if (!items || items.length === 0 || !storeId) {
      return NextResponse.json(
        { error: 'Items and store ID are required' },
        { status: 400 }
      );
    }

    // ✅ CRITICAL FIX: cashierId WAJIB dikirim dari frontend
    if (!cashierId) {
      return NextResponse.json(
        { error: 'Cashier ID is required. Please login again.' },
        { status: 400 }
      );
    }

    // Verify cashier exists and belongs to the store
    const cashierStartTime = Date.now();
    const cashier = await prisma.user.findFirst({
      where: { 
        id: cashierId,
        storeId: storeId,
      },
      select: {
        id: true,
        fullName: true,
        username: true,
        role: true,
      },
    });

    if (!cashier) {
      return NextResponse.json(
        { error: 'Invalid cashier. Please login again.' },
        { status: 403 }
      );
    }

    console.log(`[TRANSACTIONS API] Cashier verified: ${Date.now() - cashierStartTime}ms | Cashier: ${cashier.fullName} (${cashier.id})`);

    const invoiceStartTime = Date.now();
    const invoiceNumber = await generateInvoiceNumber(storeId);
    console.log(`[TRANSACTIONS API] Invoice generation: ${Date.now() - invoiceStartTime}ms`);

    const transactionStartTime = Date.now();
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
        cashierId: cashier.id, // ✅ Use verified cashier ID
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
            role: true,
          },
        },
      },
    });
    console.log(`[TRANSACTIONS API] Transaction creation: ${Date.now() - transactionStartTime}ms`);

    const stockStartTime = Date.now();
    await Promise.all(
      items.map((item: any) =>
        prisma.product.update({
          where: { id: item.productId },
          data: {
            stock: {
              decrement: parseInt(item.quantity.toString()),
            },
          },
        }).catch((error) => {
          console.error(`[TRANSACTIONS API] Failed to update stock for product ${item.productId}:`, error);
        })
      )
    );
    console.log(`[TRANSACTIONS API] Stock update: ${Date.now() - stockStartTime}ms`);

    const totalTime = Date.now() - startTime;
    console.log(`[TRANSACTIONS API] Transaction created successfully in ${totalTime}ms | ID: ${transaction.id} | Cashier: ${cashier.fullName} (${cashier.id})`);

    return NextResponse.json({
      ...transaction,
      performance: {
        totalTime: `${totalTime}ms`,
        breakdown: {
          cashierLookup: `${Date.now() - cashierStartTime}ms`,
          invoiceGeneration: `${Date.now() - invoiceStartTime}ms`,
          transactionCreation: `${Date.now() - transactionStartTime}ms`,
          stockUpdate: `${Date.now() - stockStartTime}ms`,
        },
      },
    }, { status: 201 });
  } catch (error: any) {
    const queryTime = Date.now() - startTime;
    console.error(`[TRANSACTIONS API] POST Error after ${queryTime}ms:`, error);
    return NextResponse.json(
      { error: error.message || 'Failed to create transaction' },
      { status: 500 }
    );
  }
}