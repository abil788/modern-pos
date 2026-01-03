import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const storeId = searchParams.get('storeId');
    const id = searchParams.get('id');

    // Get specific cashier by ID
    if (id) {
      const cashier = await prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          fullName: true,
          username: true,
          role: true,
        },
      });

      if (!cashier) {
        return NextResponse.json({ error: 'Cashier not found' }, { status: 404 });
      }

      return NextResponse.json([cashier]); // Return as array for consistency
    }

    // Get all cashiers for a store
    if (!storeId) {
      return NextResponse.json({ error: 'Store ID required' }, { status: 400 });
    }

    const cashiers = await prisma.user.findMany({
      where: { 
        storeId,
        role: { in: ['CASHIER', 'OWNER'] }
      },
      select: {
        id: true,
        fullName: true,
        username: true,
        role: true,
      },
      orderBy: { fullName: 'asc' },
    });

    return NextResponse.json(cashiers);
  } catch (error) {
    console.error('Error fetching cashiers:', error);
    return NextResponse.json({ error: 'Failed to fetch cashiers' }, { status: 500 });
  }
}