import { NextRequest, NextResponse } from 'next/server';
import prisma, { generateInvoiceNumber } from '@/lib/db';
import { triggerKitchenOrder } from '@/lib/pusher-server';

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const searchParams = request.nextUrl.searchParams;
    const storeId = searchParams.get('storeId');
    const cashierId = searchParams.get('cashierId');
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

    if (cashierId) {
      where.cashierId = cashierId;
    }

    if (startDate && endDate) {
      where.createdAt = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    if (search) {
      where.OR = [
        { invoiceNumber: { contains: search, mode: 'insensitive' } },
        { customerName: { contains: search, mode: 'insensitive' } },
        { customerPhone: { contains: search, mode: 'insensitive' } },
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
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.transaction.count({ where }),
      prisma.transaction.aggregate({
        where,
        _sum: { total: true },
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
        total: totalCount,
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
      paymentChannel,
      paymentReference,
      // Kitchen Display System fields
      orderType = 'dine-in',
      tableNumber,
    } = body;

    console.log(`[TRANSACTIONS API] Processing transaction | Store: ${storeId} | Cashier: ${cashierId}`);
    console.log(`[TRANSACTIONS API] Payment: ${paymentMethod} | Channel: ${paymentChannel || 'default'}`);
    console.log(`[TRANSACTIONS API] Order Type: ${orderType}${tableNumber ? ` | Table: ${tableNumber}` : ''}`);
    
    if (promoCode) {
      console.log(`[TRANSACTIONS API] Promo applied: ${promoCode} | Discount: ${promoDiscount}`);
    }

    // Validation
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

    // ✅ Check if KDS is enabled
    const kdsCheckStartTime = Date.now();
    let kdsEnabled = false;
    
    try {
      const kdsSetting = await prisma.setting.findUnique({
        where: {
          storeId_key: {
            storeId,
            key: 'kds_enabled',
          },
        },
      });
      kdsEnabled = kdsSetting?.value === 'true';
      console.log(`[TRANSACTIONS API] KDS Status checked in ${Date.now() - kdsCheckStartTime}ms | ${kdsEnabled ? 'ENABLED ✅' : 'DISABLED ❌'}`);
    } catch (error) {
      console.warn('⚠️ Failed to check KDS setting, defaulting to disabled:', error);
      kdsEnabled = false;
    }

    // Verify cashier
    const cashierStartTime = Date.now();
    const cashier = await prisma.user.findFirst({
      where: { 
        id: cashierId,
        storeId: storeId,
        isActive: true,
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

    // Validate promo code
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

    // Generate invoice number
    const invoiceStartTime = Date.now();
    const invoiceNumber = await generateInvoiceNumber(storeId);
    console.log(`[TRANSACTIONS API] Invoice generated in ${Date.now() - invoiceStartTime}ms | ${invoiceNumber}`);

    // Create transaction
    const transactionStartTime = Date.now();
    
    const transaction = await prisma.transaction.create({
      data: {
        invoiceNumber,
        subtotal: parseFloat(subtotal.toString()),
        tax: parseFloat(tax?.toString() || '0'),
        discount: parseFloat(discount?.toString() || '0'),
        total: parseFloat(total.toString()),
        paymentMethod,
        paymentChannel: paymentChannel || null,
        paymentReference: paymentReference || null,
        amountPaid: parseFloat(amountPaid.toString()),
        change: parseFloat(change?.toString() || '0'),
        customerName: customerName || null,
        customerPhone: customerPhone || null,
        notes: notes || null,
        promoCode: validatedPromo ? validatedPromo.code : null,
        promoDiscount: validatedPromo && promoDiscount ? parseFloat(promoDiscount.toString()) : 0,
        cashierId: cashier.id,
        storeId,
        
        // ✅ Kitchen Display System fields - Only set if KDS enabled
        orderType: kdsEnabled ? orderType : null,
        tableNumber: kdsEnabled && tableNumber ? tableNumber : null,
        kitchenStatus: kdsEnabled ? 'pending' : null,
        sentToKitchenAt: kdsEnabled ? new Date() : null,
        
        items: {
          create: items.map((item: any) => ({
            productId: item.productId,
            productName: item.name,
            quantity: parseInt(item.quantity.toString()),
            price: parseFloat(item.price.toString()),
            subtotal: parseFloat(item.subtotal.toString()),
            discount: parseFloat(item.discount?.toString() || '0'),
            notes: item.notes || null, // ✅ Item notes from checkout
            
            // ✅ Kitchen Display System item fields - Only if KDS enabled
            kitchenStation: kdsEnabled ? (item.kitchenStation || 'main') : null,
            kitchenStatus: kdsEnabled ? 'pending' : null,
            prepTime: kdsEnabled ? (item.prepTime || 5) : null,
            modifiers: kdsEnabled ? (item.modifiers || []) : [],
          })),
        },
      },
      include: {
        items: {
          include: {
            product: {
              select: {
                name: true,
                kitchenStation: true,
                prepTime: true,
              },
            },
          },
        },
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

    // ✅ Send to Kitchen Display ONLY if KDS is enabled
    if (kdsEnabled) {
      try {
        const pusherStartTime = Date.now();
        
        const kitchenOrder = {
          id: transaction.id,
          transactionId: transaction.id,
          invoiceNumber: transaction.invoiceNumber,
          status: transaction.kitchenStatus,
          tableNumber: transaction.tableNumber,
          customerName: transaction.customerName,
          orderType: transaction.orderType,
          notes: transaction.notes,
          createdAt: transaction.createdAt,
          items: transaction.items.map((item) => ({
            id: item.id,
            productId: item.productId,
            productName: item.productName,
            quantity: item.quantity,
            notes: item.notes, // ✅ Item notes
            station: item.kitchenStation || 'main',
            status: item.kitchenStatus || 'pending',
            prepTime: item.prepTime || 5,
            modifiers: item.modifiers || [],
          })),
        };

        await triggerKitchenOrder(storeId, kitchenOrder);
        console.log(`[TRANSACTIONS API] ✅ Kitchen order sent via Pusher in ${Date.now() - pusherStartTime}ms`);
      } catch (pusherError) {
        console.error('[TRANSACTIONS API] ⚠️ Pusher error (non-critical):', pusherError);
        // Transaction still succeeds even if pusher fails
      }
    } else {
      console.log('[TRANSACTIONS API] ⏭️ Skipping kitchen order send (KDS disabled)');
    }

    // Log promo usage
    if (validatedPromo && promoDiscount > 0) {
      const promoLogStartTime = Date.now();
      
      try {
        await Promise.all([
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
          
          prisma.promo.update({
            where: { id: validatedPromo.id },
            data: { usageCount: { increment: 1 } },
          }),
        ]);

        console.log(`[TRANSACTIONS API] Promo logged in ${Date.now() - promoLogStartTime}ms | ${validatedPromo.code}`);
      } catch (promoError) {
        console.error('[TRANSACTIONS API] Error logging promo (non-critical):', promoError);
      }
    }

    // Update product stock
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
          kdsCheck: `${Date.now() - kdsCheckStartTime}ms`,
          cashierVerification: `${Date.now() - cashierStartTime}ms`,
          invoiceGeneration: `${Date.now() - invoiceStartTime}ms`,
          transactionCreation: `${Date.now() - transactionStartTime}ms`,
          stockUpdate: `${Date.now() - stockStartTime}ms`,
        },
        kdsEnabled,
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

// DELETE - For admin/testing purposes
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Transaction ID is required' },
        { status: 400 }
      );
    }

    await prisma.transaction.delete({
      where: { id },
    });

    console.log(`[TRANSACTIONS API] Transaction deleted: ${id}`);

    return NextResponse.json({ success: true, message: 'Transaction deleted' });
  } catch (error: any) {
    console.error('[TRANSACTIONS API] DELETE Error:', error);
    return NextResponse.json(
      { error: 'Failed to delete transaction' },
      { status: 500 }
    );
  }
}