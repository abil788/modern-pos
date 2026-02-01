/**
 * Kode ini mendefinisikan endpoint API untuk mengelola transaksi.
 * Fungsinya meliputi:
 * - GET: mengambil data transaksi
 * - POST: membuat transaksi baru
 * - DELETE: menghapus transaksi (khusus admin / testing)
 *
 * @param {NextRequest} request
 * Request HTTP yang berisi data transaksi, parameter query, atau body
 * yang dibutuhkan sesuai dengan metode yang digunakan.
 *
 * @returns
 * Response JSON sesuai dengan metode:
 * - GET: data transaksi atau pesan error
 * - POST: hasil pembuatan transaksi
 * - DELETE: status penghapusan transaksi
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma, { generateInvoiceNumber } from '@/lib/db';
import { triggerKitchenOrder } from '@/lib/pusher-server';
import { getSessionFromRequest } from '@/lib/auth-server';

export async function GET(request: NextRequest) {
  // ... existing GET implementation ...
  // ideally GET should also be protected, but focusing on POST (Creation) first as requested
  // I will leave GET for now as it wasn't the primary vulnerability (though it leaks data)
  // Let's protect POST first.
  const startTime = Date.now();

  try {
    const searchParams = request.nextUrl.searchParams;
    const storeId = searchParams.get('storeId');
    const cashierId = searchParams.get('cashierId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const search = searchParams.get('search');

    // Check Authorization for GET as well
    const session = await getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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
    // 1. Validate Session FIRST
    const session = await getSessionFromRequest(request);
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized. Please login again.' },
        { status: 401 }
      );
    }

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
      paymentChannel,
      paymentReference,
      // Kitchen Display System fields
      orderType = 'dine-in',
      tableNumber,
    } = body;

    // Use User ID from Session
    const cashierId = session.user.id;

    // Ensure Store ID matches session
    if (storeId !== session.user.storeId && session.user.role !== 'SUPERADMIN') {
      if (storeId !== session.user.storeId) {
        return NextResponse.json({ error: 'Store ID mismatch' }, { status: 403 });
      }
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

    // Check if KDS is enabled
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
    } catch (error) {
      console.warn('⚠️ Failed to check KDS setting, defaulting to disabled:', error);
      kdsEnabled = false;
    }

    // Verify cashier (optional since we have session, but good for active check)
    const cashierStartTime = Date.now();
    const cashier = await prisma.user.findFirst({
      where: {
        id: cashierId,
        storeId: storeId,
        isActive: true,
      },
      select: {
        id: true,
      },
    });

    if (!cashier) {
      return NextResponse.json(
        { error: 'Invalid or inactive cashier. Please login again.' },
        { status: 403 }
      );
    }

    // Validate promo code
    let validatedPromo: any = null;
    if (promoCode) {
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
      }
    }

    // --- START ATOMIC TRANSACTION ---
    const transactionResult = await prisma.$transaction(async (tx) => {
      // 1. Generate Invoice (Atomic check with tx)
      const invoiceStartTime = Date.now();
      const invoiceNumber = await generateInvoiceNumber(storeId, tx);

      // 2. Create Transaction
      const transactionStartTime = Date.now();
      const newTransaction = await tx.transaction.create({
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

          // KDS fields
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
              notes: item.notes || null,

              // KDS item fields
              kitchenStation: kdsEnabled ? (item.kitchenStation || 'main') : null,
              kitchenStatus: kdsEnabled ? 'pending' : null,
              prepTime: kdsEnabled ? (item.prepTime || 5) : null,
              modifiers: kdsEnabled ? (item.modifiers || []) : [],
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

      // 3. Log promo usage
      if (validatedPromo && promoDiscount > 0) {
        await tx.promoUsageLog.create({
          data: {
            promoId: validatedPromo.id,
            promoCode: validatedPromo.code,
            customerPhone: customerPhone || null,
            transactionId: newTransaction.id,
            invoiceNumber: newTransaction.invoiceNumber,
            discountAmount: parseFloat(promoDiscount.toString()),
            cashierId: cashier.id,
            storeId,
          },
        });

        await tx.promo.update({
          where: { id: validatedPromo.id },
          data: { usageCount: { increment: 1 } },
        });
      }

      // 4. Update product stock
      const stockStartTime = Date.now();
      for (const item of items) {
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stock: {
              decrement: parseInt(item.quantity.toString()),
            },
          },
        });
      }

      return {
        transaction: newTransaction,
        timings: {
          invoice: Date.now() - invoiceStartTime,
          creation: Date.now() - transactionStartTime,
          stock: Date.now() - stockStartTime,
        }
      };
    }); // END TRANSACTION

    const { transaction, timings } = transactionResult;

    // Send to Kitchen Display (Outside Transaction)
    if (kdsEnabled) {
      try {
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
          items: transaction.items.map((item: any) => ({
            id: item.id,
            productId: item.productId,
            productName: item.productName,
            quantity: item.quantity,
            notes: item.notes,
            station: item.kitchenStation || 'main',
            status: item.kitchenStatus || 'pending',
            prepTime: item.prepTime || 5,
            modifiers: item.modifiers || [],
          })),
        };

        triggerKitchenOrder(storeId, kitchenOrder).catch(console.error);
      } catch (pusherError) {
        console.error('[TRANSACTIONS API] Pusher error:', pusherError);
      }
    }

    const totalTime = Date.now() - startTime;

    return NextResponse.json({
      ...transaction,
      performance: {
        totalTime: `${totalTime}ms`,
        breakdown: {
          kdsCheck: `${Date.now() - kdsCheckStartTime}ms`,
          cashierVerification: `${Date.now() - cashierStartTime}ms`,
          invoiceGeneration: `${timings.invoice}ms`,
          transactionCreation: `${timings.creation}ms`,
          stockUpdate: `${timings.stock}ms`,
        },
        kdsEnabled,
      },
    }, { status: 201 });

  } catch (error: any) {
    const queryTime = Date.now() - startTime;
    console.error(`[TRANSACTIONS API] POST Error after ${queryTime}ms:`, error);

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


    return NextResponse.json({ success: true, message: 'Transaction deleted' });
  } catch (error: any) {
    console.error('[TRANSACTIONS API] DELETE Error:', error);
    return NextResponse.json(
      { error: 'Failed to delete transaction' },
      { status: 500 }
    );
  }
}