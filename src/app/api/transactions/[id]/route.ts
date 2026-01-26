/**
 * Kode ini menangani request GET dan DELETE untuk data transaksi.
 * - GET digunakan untuk mengambil detail transaksi berdasarkan ID.
 * - DELETE digunakan untuk menghapus transaksi dan mengembalikan stok produk.
 *
 * @param {NextRequest} request
 * Request HTTP yang berisi parameter transaksi.
 *
 * @returns
 * - GET: mengembalikan data transaksi jika ditemukan
 * - GET: mengembalikan error jika transaksi tidak ditemukan atau gagal diambil
 * - DELETE: berhasil menghapus transaksi dan memulihkan stok
 * - DELETE: mengembalikan error jika proses gagal
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const transaction = await prisma.transaction.findUnique({
      where: { id: params.id },
      include: {
        items: true,
        cashier: {
          select: {
            id: true,
            fullName: true,
            username: true,
          },
        },
      },
    });

    if (!transaction) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    return NextResponse.json(transaction);
  } catch (error) {
    console.error('Error fetching transaction:', error);
    return NextResponse.json({ error: 'Failed to fetch transaction' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Get transaction first to restore stock
    const transaction = await prisma.transaction.findUnique({
      where: { id: params.id },
      include: { items: true },
    });

    if (!transaction) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    // Restore product stock
    for (const item of transaction.items) {
      await prisma.product.update({
        where: { id: item.productId },
        data: {
          stock: {
            increment: item.quantity,
          },
        },
      });
    }

    // Delete transaction
    await prisma.transaction.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true, message: 'Transaction deleted and stock restored' });
  } catch (error) {
    console.error('Error deleting transaction:', error);
    return NextResponse.json({ error: 'Failed to delete transaction' }, { status: 500 });
  }
}