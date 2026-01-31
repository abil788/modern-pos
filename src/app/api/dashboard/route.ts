/**
 * Fungsi TypeScript di atas mengambil dan memproses data dashboard
 * untuk periode tertentu, termasuk pendapatan, transaksi, profit,
 * produk dengan stok menipis, produk terlaris, serta data grafik pendapatan.
 * @param {string} period - Parameter `period` pada potongan kode ini
 * menentukan rentang waktu pengambilan data dashboard.
 * Parameter ini dapat memiliki nilai sebagai berikut:
 * @returns Kode ini mengembalikan sebuah objek respons JSON
 * yang berisi berbagai data terkait dashboard sebuah toko.
 * Data yang dikembalikan meliputi:
 * - `todayRevenue`: Total pendapatan untuk hari ini
 * - `todayTransactions`: Jumlah transaksi yang terjadi hari ini
 * - `todayProfit`: Total profit hari ini dengan memperhitungkan diskon promo
 * - `lowStockProducts`: Jumlah produk dengan stok rendah
 * - `topProducts
 */


import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getStoreId } from '@/lib/store-config-server';

export const dynamic = 'force-dynamic';

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
    // Log debug info
    const queryStoreId = searchParams.get('storeId');
    const headerStoreId = getStoreId();
    console.log(`[Dashboard API] Query: ${queryStoreId}, Header/Context: ${headerStoreId}`);

    // PRIORITY FIX: Prefer header context (middleware) over query param if query is default 'demo-store'
    // This allows middleware to dictate the store even if client sends legacy fallback
    let storeId = headerStoreId;
    if (queryStoreId && queryStoreId !== 'demo-store') {
      storeId = queryStoreId;
    }

    // If both resolve to default or are missing
    if (!storeId) storeId = 'demo-store';

    console.log(`[Dashboard API] Final Used StoreID: ${storeId}`);

    const period = searchParams.get('period') || 'today';
    const { start, end } = getDateRange(period);

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

    let todayProfit = 0;
    for (const transaction of transactions) {
      let transactionItemProfit = 0;
      for (const item of transaction.items) {
        const cost = item.product?.cost || 0;
        const profit = (item.price - cost) * item.quantity;
        transactionItemProfit += profit;
      }

      const netProfit = transactionItemProfit - (transaction.promoDiscount || 0);
      todayProfit += netProfit;
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
      todayProfit, // ✅ Now correctly accounts for promo discount
      lowStockProducts,
      topProducts,
      revenueChart,
      debugStoreId: storeId,
    };


    return NextResponse.json(response);
  } catch (error) {
    console.error('Dashboard error:', error);
    return NextResponse.json(
      { error: 'Failed to load dashboard data' },
      { status: 500 }
    );
  }
}