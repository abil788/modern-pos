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

    // Validation
    if (!storeId) {
      return NextResponse.json({ error: 'Store ID required' }, { status: 400 });
    }

    // Build WHERE clause
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

    const [transactions, totalCount, stats] = await Promise.all([
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
      
      // Get total count
      prisma.transaction.count({ where }),
      
      // Get aggregated stats (more efficient than fetching all records)
      prisma.transaction.aggregate({
        where,
        _sum: {
          total: true,
        },
      }),
    ]);

    const totalRevenue = stats._sum.total || 0;
    const avgTransaction = totalCount > 0 ? totalRevenue / totalCount : 0;

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
      promoCode,        
      promoDiscount,
      cashierId,
      paymentChannel,      // ✅ Received from body
      paymentReference,    // ✅ Received from body
    } = body;

    console.log(`[TRANSACTIONS API] Processing transaction | Store: ${storeId} | Cashier: ${cashierId}`);
    console.log(`[TRANSACTIONS API] Payment: ${paymentMethod} | Channel: ${paymentChannel || 'default'}`);
    if (promoCode) {
      console.log(`[TRANSACTIONS API] Promo applied: ${promoCode} | Discount: ${promoDiscount}`);
    }

    if (!items || items.length === 0) {
      return NextResponse.json(
        { error: 'At least one item is required' },
        { status: 400 }
      );
    }

    if (!storeId) {
      return NextResponse.json(
        { error: 'Store ID is required' },
        { status: 400 }
      );
    }

    if (!cashierId) {
      return NextResponse.json(
        { error: 'Cashier ID is required. Please login again.' },
        { status: 400 }
      );
    }

    const cashierStartTime = Date.now();
    const cashier = await prisma.user.findFirst({
      where: { 
        id: cashierId,
        storeId: storeId,
        isActive: true, // Ensure cashier is active
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
        { error: 'Invalid or inactive cashier. Please login again.' },
        { status: 403 }
      );
    }

    console.log(`[TRANSACTIONS API] Cashier verified in ${Date.now() - cashierStartTime}ms | ${cashier.fullName}`);

    let validatedPromo = null;
    if (promoCode) {
      const promoStartTime = Date.now();
      
      validatedPromo = await prisma.promo.findFirst({
        where: {
          code: promoCode.toUpperCase(),
          storeId,
          isActive: true,
          startDate: { lte: new Date() },
          endDate: { gte: new Date() },
        },
      });

      if (!validatedPromo) {
        console.warn(`[TRANSACTIONS API] Invalid promo code: ${promoCode}`);
      } else {
        console.log(`[TRANSACTIONS API] Promo validated in ${Date.now() - promoStartTime}ms | ${validatedPromo.code}`);
      }
    }

    const invoiceStartTime = Date.now();
    const invoiceNumber = await generateInvoiceNumber(storeId);
    console.log(`[TRANSACTIONS API] Invoice generated in ${Date.now() - invoiceStartTime}ms | ${invoiceNumber}`);

    const transactionStartTime = Date.now();
    
    const transaction = await prisma.transaction.create({
      data: {
        invoiceNumber,
        subtotal: parseFloat(subtotal.toString()),
        tax: parseFloat(tax?.toString() || '0'),
        discount: parseFloat(discount?.toString() || '0'),
        total: parseFloat(total.toString()),
        paymentMethod,
        paymentChannel: paymentChannel || null,        // ✅ NOW SAVED!
        paymentReference: paymentReference || null,    // ✅ NOW SAVED!
        amountPaid: parseFloat(amountPaid.toString()),
        change: parseFloat(change?.toString() || '0'),
        customerName: customerName || null,
        customerPhone: customerPhone || null,
        notes: notes || null,
        promoCode: validatedPromo ? validatedPromo.code : null,
        promoDiscount: validatedPromo && promoDiscount ? parseFloat(promoDiscount.toString()) : 0,
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
            role: true,
          },
        },
      },
    });
    
    console.log(`[TRANSACTIONS API] Transaction created in ${Date.now() - transactionStartTime}ms | ${transaction.id} | Channel: ${transaction.paymentChannel}`);

    if (validatedPromo && promoDiscount > 0) {
      const promoLogStartTime = Date.now();
      
      try {
        await Promise.all([
          // Log promo usage
          prisma.promoUsageLog.create({
            data: {
              promoId: validatedPromo.id,
              promoCode: validatedPromo.code,
              customerPhone: customerPhone || null,
              transactionId: transaction.id,
              invoiceNumber: transaction.invoiceNumber,
              discountAmount: parseFloat(promoDiscount.toString()),
              cashierId: cashier.id,
              storeId,
            },
          }),
          
          // Increment usage count
          prisma.promo.update({
            where: { id: validatedPromo.id },
            data: { usageCount: { increment: 1 } },
          }),
        ]);

        console.log(`[TRANSACTIONS API] Promo logged in ${Date.now() - promoLogStartTime}ms | ${validatedPromo.code}`);
      } catch (promoError) {
        console.error('[TRANSACTIONS API] Error logging promo (non-critical):', promoError);
        // Don't fail transaction if promo logging fails
      }
    }

    const stockStartTime = Date.now();
    
    const stockUpdates = items.map((item: any) =>
      prisma.product.update({
        where: { id: item.productId },
        data: {
          stock: {
            decrement: parseInt(item.quantity.toString()),
          },
        },
      }).catch((error) => {
        console.error(`[TRANSACTIONS API] Failed to update stock for product ${item.productId}:`, error);
        // Consider if you want to rollback the transaction here
      })
    );

    await Promise.all(stockUpdates);
    console.log(`[TRANSACTIONS API] Stock updated in ${Date.now() - stockStartTime}ms | ${items.length} products`);

    const totalTime = Date.now() - startTime;
    console.log(`[TRANSACTIONS API] ✅ Transaction completed in ${totalTime}ms | Invoice: ${transaction.invoiceNumber}`);

    return NextResponse.json({
      ...transaction,
      performance: {
        totalTime: `${totalTime}ms`,
        breakdown: {
          cashierVerification: `${Date.now() - cashierStartTime}ms`,
          invoiceGeneration: `${Date.now() - invoiceStartTime}ms`,
          transactionCreation: `${Date.now() - transactionStartTime}ms`,
          stockUpdate: `${Date.now() - stockStartTime}ms`,
        },
      },
    }, { status: 201 });

  } catch (error: any) {
    const queryTime = Date.now() - startTime;
    console.error(`[TRANSACTIONS API] ❌ POST Error after ${queryTime}ms:`, error);
    
    return NextResponse.json(
      { 
        error: error.message || 'Failed to create transaction',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined 
      },
      { status: 500 }
    );
  }
}