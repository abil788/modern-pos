// ===========================
// src/app/api/cash-drawer/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const storeId = searchParams.get('storeId');
    const status = searchParams.get('status') || 'OPEN';

    if (!storeId) {
      return NextResponse.json({ error: 'Store ID required' }, { status: 400 });
    }

    const drawer = await prisma.cashDrawer.findFirst({
      where: {
        storeId,
        status
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
        openedAt: 'desc'
      }
    });

    return NextResponse.json(drawer);

  } catch (error) {
    console.error('Error fetching cash drawer:', error);
    return NextResponse.json(
      { error: 'Failed to fetch cash drawer' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { storeId, cashierId, openingBalance } = body;

    if (!storeId || !cashierId) {
      return NextResponse.json(
        { error: 'Store ID and Cashier ID required' },
        { status: 400 }
      );
    }

    // Close any open drawers
    await prisma.cashDrawer.updateMany({
      where: {
        storeId,
        status: 'OPEN'
      },
      data: {
        status: 'CLOSED',
        closedAt: new Date()
      }
    });

    // Open new drawer
    const drawer = await prisma.cashDrawer.create({
      data: {
        storeId,
        cashierId,
        openingBalance: openingBalance || 0,
        status: 'OPEN'
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

    return NextResponse.json(drawer);

  } catch (error) {
    console.error('Error opening cash drawer:', error);
    return NextResponse.json(
      { error: 'Failed to open cash drawer' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, actualBalance, notes } = body;

    if (!id) {
      return NextResponse.json({ error: 'Drawer ID required' }, { status: 400 });
    }

    const drawer = await prisma.cashDrawer.findUnique({
      where: { id }
    });

    if (!drawer) {
      return NextResponse.json({ error: 'Drawer not found' }, { status: 404 });
    }

    const expectedBalance = drawer.openingBalance; // You might want to add cash transactions here
    const difference = actualBalance - expectedBalance;

    const updated = await prisma.cashDrawer.update({
      where: { id },
      data: {
        actualBalance,
        expectedBalance,
        difference,
        notes,
        status: 'CLOSED',
        closedAt: new Date()
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

    return NextResponse.json(updated);

  } catch (error) {
    console.error('Error closing cash drawer:', error);
    return NextResponse.json(
      { error: 'Failed to close cash drawer' },
      { status: 500 }
    );
  }
}