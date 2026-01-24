import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { triggerOrderUpdate } from '@/lib/pusher-server';

// GET - Fetch kitchen orders
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const storeId = searchParams.get('storeId');
    const station = searchParams.get('station');
    const status = searchParams.get('status');

    if (!storeId) {
      return NextResponse.json({ error: 'Store ID required' }, { status: 400 });
    }

    const statusArray = status ? status.split(',') : ['pending', 'preparing'];

    const where: any = {
      storeId,
      kitchenStatus: { in: statusArray },
    };

    const transactions = await prisma.transaction.findMany({
      where,
      include: {
        items: {
          include: {
            product: {
              select: {
                name: true,
                categoryId: true,
                category: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Transform to kitchen orders
    const kitchenOrders = transactions.map((t) => ({
      id: t.id,
      transactionId: t.id,
      invoiceNumber: t.invoiceNumber,
      status: t.kitchenStatus || 'pending',
      tableNumber: t.tableNumber,
      customerName: t.customerName,
      orderType: t.orderType || 'dine-in',
      notes: t.notes,
      createdAt: t.createdAt,
      startedAt: t.kitchenStartedAt,
      completedAt: t.kitchenCompletedAt,
      items: t.items.map((item) => ({
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
    }));

    // Filter by station if provided
    const filtered = station
      ? kitchenOrders.filter((order) =>
          order.items.some((item) => item.station === station)
        )
      : kitchenOrders;

    return NextResponse.json(filtered);
  } catch (error) {
    console.error('Error fetching kitchen orders:', error);
    return NextResponse.json(
      { error: 'Failed to fetch kitchen orders' },
      { status: 500 }
    );
  }
}

// PATCH - Update kitchen order status
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { transactionId, status, itemId, itemStatus } = body;

    if (!transactionId) {
      return NextResponse.json(
        { error: 'Transaction ID required' },
        { status: 400 }
      );
    }

    // Get transaction to find storeId
    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId },
      select: { storeId: true },
    });

    if (!transaction) {
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      );
    }

    // Update item status
    if (itemId && itemStatus) {
      await prisma.transactionItem.update({
        where: { id: itemId },
        data: {
          kitchenStatus: itemStatus,
        },
      });

      // Check if all items are ready, then update transaction
      const updatedTransaction = await prisma.transaction.findUnique({
        where: { id: transactionId },
        include: { items: true },
      });

      const allReady = updatedTransaction?.items.every(
        (item) => item.kitchenStatus === 'ready'
      );

      if (allReady) {
        await prisma.transaction.update({
          where: { id: transactionId },
          data: {
            kitchenStatus: 'ready',
            kitchenCompletedAt: new Date(),
          },
        });

        // Trigger real-time update
        await triggerOrderUpdate(transaction.storeId, transactionId, 'ready');
      }
    }

    // Update transaction status
    if (status) {
      const updateData: any = { kitchenStatus: status };

      if (status === 'preparing') {
        updateData.kitchenStartedAt = new Date();
      }

      if (status === 'completed') {
        updateData.kitchenCompletedAt = new Date();
      }

      await prisma.transaction.update({
        where: { id: transactionId },
        data: updateData,
      });

      // Trigger real-time update
      await triggerOrderUpdate(transaction.storeId, transactionId, status);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating kitchen order:', error);
    return NextResponse.json(
      { error: 'Failed to update kitchen order' },
      { status: 500 }
    );
  }
}

// POST - Create kitchen order (called from POS)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { transactionId } = body;

    if (!transactionId) {
      return NextResponse.json(
        { error: 'Transaction ID required' },
        { status: 400 }
      );
    }

    // Update transaction to send to kitchen
    const transaction = await prisma.transaction.update({
      where: { id: transactionId },
      data: {
        kitchenStatus: 'pending',
        sentToKitchenAt: new Date(),
      },
      select: {
        storeId: true,
      },
    });

    // Trigger real-time update
    await triggerOrderUpdate(transaction.storeId, transactionId, 'pending');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error creating kitchen order:', error);
    return NextResponse.json(
      { error: 'Failed to create kitchen order' },
      { status: 500 }
    );
  }
}