import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getDateRange } from '@/lib/utils';

export async function GET(request: NextRequest) {
  const storeId = request.nextUrl.searchParams.get('storeId') || 'demo';
  const period = request.nextUrl.searchParams.get('period') || 'today';
  
  const { start, end } = getDateRange(period as any);

  // Today's stats
  const todayTransactions = await prisma.transaction.findMany({
    where: {
      storeId,
      createdAt: { gte: start, lte: end },
    },
    include: { items: true },
  });

  const todayRevenue = todayTransactions.reduce((sum, t) => sum + t.total, 0);
  const todayProfit = todayTransactions.reduce((sum, t) => {
    const itemsProfit = t.items.reduce((itemSum, item) => {
      return itemSum + (item.price - (item as any).cost || 0) * item.quantity;
    }, 0);
    return sum + itemsProfit;
  }, 0);

  // Low stock products
  const lowStockProducts = await prisma.product.count({
    where: {
      storeId,
      stock: { lte: prisma.product.fields.minStock },
    },
  });

  // Top products
  const topProducts = await prisma.transactionItem.groupBy({
    by: ['productId', 'productName'],
    where: {
      transaction: {
        storeId,
        createdAt: { gte: start, lte: end },
      },
    },
    _sum: {
      quantity: true,
      subtotal: true,
    },
    orderBy: {
      _sum: {
        subtotal: 'desc',
      },
    },
    take: 10,
  });

  return NextResponse.json({
    todayRevenue,
    todayTransactions: todayTransactions.length,
    todayProfit,
    lowStockProducts,
    topProducts: topProducts.map(p => ({
      id: p.productId,
      name: p.productName,
      totalSold: p._sum.quantity || 0,
      revenue: p._sum.subtotal || 0,
    })),
    revenueChart: [], // Implement chart data logic
  });
}