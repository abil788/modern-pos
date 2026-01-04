// src/app/api/dashboard/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

function getDateRange(period: string) {
  const now = new Date();
  const start = new Date(now);
  const end = new Date(now);

  switch (period) {
    case 'today':
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case 'week':
      start.setDate(now.getDate() - 7);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case 'month':
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      end.setMonth(now.getMonth() + 1, 0);
      end.setHours(23, 59, 59, 999);
      break;
    default:
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
  }

  return { start, end };
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const storeId = searchParams.get('storeId') || 'demo-store';
    const period = searchParams.get('period') || 'today';
    
    const { start, end } = getDateRange(period);

    console.log('Dashboard request:', { storeId, period, start, end });

    // Parallel queries untuk performa lebih cepat
    const [transactions, products] = await Promise.all([
      // Get transactions with items
      prisma.transaction.findMany({
        where: {
          storeId,
          createdAt: { gte: start, lte: end },
        },
        include: {
          items: {
            include: {
              product: {
                select: {
                  cost: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      // Get low stock products
      prisma.product.findMany({
        where: {
          storeId,
          isActive: true,
        },
        select: {
          id: true,
          stock: true,
          minStock: true,
        },
      }),
    ]);

    // Calculate stats
    const todayRevenue = transactions.reduce((sum, t) => sum + t.total, 0);
    const todayTransactions = transactions.length;

    // Calculate profit
    let todayProfit = 0;
    for (const transaction of transactions) {
      for (const item of transaction.items) {
        const cost = item.product?.cost || 0;
        const profit = (item.price - cost) * item.quantity;
        todayProfit += profit;
      }
    }

    // Count low stock products
    const lowStockProducts = products.filter(p => p.stock <= p.minStock).length;

    // Top products
    const productSales: Record<string, { name: string; quantity: number; revenue: number }> = {};
    
    transactions.forEach(t => {
      t.items.forEach(item => {
        if (!productSales[item.productId]) {
          productSales[item.productId] = {
            name: item.productName,
            quantity: 0,
            revenue: 0,
          };
        }
        productSales[item.productId].quantity += item.quantity;
        productSales[item.productId].revenue += item.subtotal;
      });
    });

    const topProducts = Object.entries(productSales)
      .map(([id, data]) => ({
        id,
        name: data.name,
        totalSold: data.quantity,
        revenue: data.revenue,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    // Revenue chart data - Group by date
    const revenueByDate: Record<string, number> = {};
    
    transactions.forEach(t => {
      const date = new Date(t.createdAt).toISOString().split('T')[0];
      if (!revenueByDate[date]) {
        revenueByDate[date] = 0;
      }
      revenueByDate[date] += t.total;
    });

    const revenueChart = Object.entries(revenueByDate)
      .map(([date, revenue]) => ({
        date,
        revenue,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const response = {
      todayRevenue,
      todayTransactions,
      todayProfit,
      lowStockProducts,
      topProducts,
      revenueChart,
    };

    console.log('Dashboard response:', response);

    return NextResponse.json(response);
  } catch (error) {
    console.error('Dashboard error:', error);
    return NextResponse.json(
      { error: 'Failed to load dashboard data' },
      { status: 500 }
    );
  }
}