/**
 * Fungsi ini mengambil dan memproses data transaksi
 * berdasarkan parameter yang ditentukan
 * untuk menghasilkan laporan yang detail.
 * @param {NextRequest} request - Fungsi `GET` pada potongan
 * kode yang diberikan merupakan route handler
 * untuk mengambil laporan berdasarkan berbagai
 * parameter yang dikirim melalui request.
 * Berikut adalah penjabaran parameter yang
 * digunakan dalam fungsi tersebut:
 * @returns Fungsi `GET` pada potongan kode ini
 * mengembalikan respons JSON yang berisi berbagai
 * data terkait transaksi dan laporan. Respons
 * mencakup data ringkasan seperti total pendapatan,
 * total transaksi, total pajak, total diskon,
 * total diskon promo, total profit, serta rata-rata
 * nilai transaksi. Selain itu, respons juga
 * menyertakan data yang dikelompokkan berdasarkan
 * metode pembayaran, produk terlaris, data harian
 * untuk pendapatan, transaksi, dan profit, serta
 * data grafik (chart data).
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const storeId = searchParams.get('storeId');
    const type = searchParams.get('type') || 'today';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;

    if (!storeId) {
      return NextResponse.json({ error: 'Store ID required' }, { status: 400 });
    }

    let dateFrom: Date;
    let dateTo: Date;
    const now = new Date();

    switch (type) {
      case 'today':
        dateFrom = new Date(now.setHours(0, 0, 0, 0));
        dateTo = new Date(now.setHours(23, 59, 59, 999));
        break;
      case 'week':
        dateFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        dateTo = new Date();
        break;
      case 'month':
        dateFrom = new Date(now.getFullYear(), now.getMonth(), 1);
        dateTo = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
        break;
      case 'custom':
        if (!startDate || !endDate) {
          return NextResponse.json({ error: 'Dates required' }, { status: 400 });
        }
        dateFrom = new Date(startDate);
        dateTo = new Date(endDate);
        break;
      default:
        dateFrom = new Date(now.setHours(0, 0, 0, 0));
        dateTo = new Date();
    }

    const where = {
      storeId,
      createdAt: { gte: dateFrom, lte: dateTo },
    };

    const [transactions, totalCount] = await Promise.all([
      prisma.transaction.findMany({
        where,
        include: {
          items: { include: { product: true } },
          cashier: { select: { id: true, fullName: true, username: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.transaction.count({ where }),
    ]);

    const totalRevenue = transactions.reduce((sum, t) => sum + t.total, 0);
    const totalTransactions = transactions.length;
    const totalTax = transactions.reduce((sum, t) => sum + t.tax, 0);
    const totalDiscount = transactions.reduce((sum, t) => sum + t.discount, 0);
    
    const totalPromoDiscount = transactions.reduce((sum, t) => sum + (t.promoDiscount || 0), 0);

    let totalProfit = 0;
    for (const transaction of transactions) {
      let transactionItemProfit = 0;
      for (const item of transaction.items) {
        const profit = (item.price - (item.product?.cost || 0)) * item.quantity;
        transactionItemProfit += profit;
      }
      
      const netProfit = transactionItemProfit - (transaction.promoDiscount || 0);
      totalProfit += netProfit;
    }

    const byPaymentMethod = transactions.reduce((acc, t) => {
      if (!acc[t.paymentMethod]) {
        acc[t.paymentMethod] = { count: 0, total: 0 };
      }
      acc[t.paymentMethod].count++;
      acc[t.paymentMethod].total += t.total;
      return acc;
    }, {} as Record<string, { count: number; total: number }>);

    const productSales = transactions.flatMap(t => t.items).reduce((acc, item) => {
      if (!acc[item.productId]) {
        acc[item.productId] = {
          id: item.productId,
          name: item.productName,
          quantity: 0,
          revenue: 0,
        };
      }
      acc[item.productId].quantity += item.quantity;
      acc[item.productId].revenue += item.subtotal;
      return acc;
    }, {} as Record<string, any>);

    const topProducts = Object.values(productSales)
      .sort((a: any, b: any) => b.revenue - a.revenue)
      .slice(0, 10);

    const dailyData = transactions.reduce((acc, t) => {
      const date = new Date(t.createdAt).toISOString().split('T')[0];
      if (!acc[date]) {
        acc[date] = { date, revenue: 0, transactions: 0, profit: 0 };
      }
      acc[date].revenue += t.total;
      acc[date].transactions++;
      
      let transactionItemProfit = 0;
      for (const item of t.items) {
        const profit = (item.price - (item.product?.cost || 0)) * item.quantity;
        transactionItemProfit += profit;
      }
      const netProfit = transactionItemProfit - (t.promoDiscount || 0);
      acc[date].profit += netProfit;
      
      return acc;
    }, {} as Record<string, any>);

    const chartData = Object.values(dailyData).sort((a: any, b: any) => 
      a.date.localeCompare(b.date)
    );

    return NextResponse.json({
      summary: {
        totalRevenue,
        totalTransactions,
        totalTax,
        totalDiscount,
        totalPromoDiscount, 
        totalProfit, 
        averageTransaction: totalTransactions > 0 ? totalRevenue / totalTransactions : 0,
      },
      byPaymentMethod,
      topProducts,
      chartData,
      transactions: transactions.map(t => ({
        id: t.id,
        invoiceNumber: t.invoiceNumber,
        createdAt: t.createdAt,
        total: t.total,
        paymentMethod: t.paymentMethod,
        customerName: t.customerName,
        cashier: t.cashier,
        itemCount: t.items.length,
        promoCode: t.promoCode, 
        promoDiscount: t.promoDiscount, 
      })),
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
        hasMore: offset + transactions.length < totalCount,
      },
    });
  } catch (error) {
    console.error('Error generating report:', error);
    return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 });
  }
}