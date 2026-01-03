import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const storeId = searchParams.get('storeId');

    if (!storeId) {
      return NextResponse.json({ error: 'Store ID required' }, { status: 400 });
    }

    // Get all data for backup
    const [store, products, categories, transactions, expenses, settings] = await Promise.all([
      prisma.store.findUnique({ where: { id: storeId } }),
      prisma.product.findMany({ where: { storeId }, include: { variations: true } }),
      prisma.category.findMany({ where: { storeId } }),
      prisma.transaction.findMany({ where: { storeId }, include: { items: true } }),
      prisma.expense.findMany({ where: { storeId } }),
      prisma.setting.findMany({ where: { storeId } }),
    ]);

    const backup = {
      version: '1.0',
      timestamp: new Date().toISOString(),
      store,
      products,
      categories,
      transactions,
      expenses,
      settings,
    };

    return NextResponse.json(backup);
  } catch (error) {
    console.error('Error creating backup:', error);
    return NextResponse.json({ error: 'Failed to create backup' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const backup = await request.json();
    const storeId = backup.store?.id;

    if (!storeId) {
      return NextResponse.json({ error: 'Invalid backup data' }, { status: 400 });
    }

    // Restore products
    if (backup.products) {
      for (const product of backup.products) {
        await prisma.product.upsert({
          where: { id: product.id },
          update: product,
          create: product,
        });
      }
    }

    // Restore categories
    if (backup.categories) {
      for (const category of backup.categories) {
        await prisma.category.upsert({
          where: { id: category.id },
          update: category,
          create: category,
        });
      }
    }

    return NextResponse.json({ success: true, message: 'Backup restored successfully' });
  } catch (error) {
    console.error('Error restoring backup:', error);
    return NextResponse.json({ error: 'Failed to restore backup' }, { status: 500 });
  }
}