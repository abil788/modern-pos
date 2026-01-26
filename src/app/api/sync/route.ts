// Fungsi ini menangani request POST untuk memproses dan menyinkronkan
// data transaksi yang diterima dari client.
// Transaksi akan disimpan ke database dan stok produk akan diperbarui.
//
// @param {NextRequest} request
// Request HTTP yang berisi data transaksi.
//
// @returns
// - 400 jika data transaksi tidak valid
// - 200 jika transaksi berhasil disinkronkan
// - 500 jika terjadi kesalahan saat proses sinkronisasi

import { NextRequest, NextResponse } from 'next/server';
import prisma, { generateInvoiceNumber } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { transactions, storeId, cashierId } = await request.json();

    if (!transactions || !Array.isArray(transactions)) {
      return NextResponse.json({ error: 'Invalid transactions data' }, { status: 400 });
    }

    const synced = [];
    const failed = [];

    for (const transaction of transactions) {
      try {
        // Generate new invoice number for synced transactions
        const invoiceNumber = await generateInvoiceNumber(storeId);

        // Create transaction
        const syncedTransaction = await prisma.transaction.create({
          data: {
            invoiceNumber,
            subtotal: parseFloat(transaction.subtotal),
            tax: parseFloat(transaction.tax) || 0,
            discount: parseFloat(transaction.discount) || 0,
            total: parseFloat(transaction.total),
            paymentMethod: transaction.paymentMethod,
            amountPaid: parseFloat(transaction.amountPaid),
            change: parseFloat(transaction.change) || 0,
            customerName: transaction.customerName,
            customerPhone: transaction.customerPhone,
            notes: transaction.notes,
            cashierId,
            storeId,
            isSynced: true,
            createdAt: transaction.createdAt ? new Date(transaction.createdAt) : new Date(),
            items: {
              create: transaction.items.map((item: any) => ({
                productId: item.productId,
                productName: item.name,
                quantity: item.quantity,
                price: parseFloat(item.price),
                subtotal: parseFloat(item.subtotal),
                discount: parseFloat(item.discount) || 0,
              })),
            },
          },
          include: {
            items: true,
          },
        });

        // Update product stock
        for (const item of transaction.items) {
          await prisma.product.update({
            where: { id: item.productId },
            data: {
              stock: {
                decrement: item.quantity,
              },
            },
          });
        }

        synced.push({
          offlineId: transaction.id,
          syncedId: syncedTransaction.id,
          invoiceNumber: syncedTransaction.invoiceNumber,
        });
      } catch (error) {
        console.error('Error syncing transaction:', error);
        failed.push({
          offlineId: transaction.id,
          error: 'Failed to sync',
        });
      }
    }

    return NextResponse.json({
      success: true,
      synced: synced.length,
      failed: failed.length,
      details: { synced, failed },
    });
  } catch (error) {
    console.error('Error in sync endpoint:', error);
    return NextResponse.json({ error: 'Failed to sync transactions' }, { status: 500 });
  }
}