/**
 * Kode TypeScript di atas mendefinisikan fungsi GET, PUT, dan DELETE
 * untuk menangani proses pengambilan, pembaruan, dan penghapusan
 * data produk menggunakan Prisma
 * dalam lingkungan server Next.js.
 * @param {NextRequest} request - Parameter `request` pada fungsi
 * `GET`, `PUT`, dan `DELETE` merepresentasikan HTTP request masuk
 * yang dikirim ke server. Parameter ini berisi informasi seperti
 * header, body, method, URL, dan detail lain yang berkaitan
 * dengan request yang sedang diproses.
 * @param  - Kode yang diberikan merupakan sekumpulan fungsi
 * untuk menangani request GET, PUT, dan DELETE yang berkaitan
 * dengan produk pada API Next.js. Berikut adalah penjabaran
 * parameter yang digunakan dalam fungsi-fungsi tersebut:
 * @returns Potongan kode ini berisi tiga fungsi, yaitu GET, PUT,
 * dan DELETE, yang masing-masing menangani method HTTP yang berbeda
 * untuk operasi produk. Berikut adalah nilai yang dikembalikan
 * oleh masing-masing fungsi:
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const product = await prisma.product.findUnique({
      where: { id: params.id },
      include: {
        category: true,
        variations: true,
      },
    });

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json(product);
  } catch (error) {
    console.error('Error fetching product:', error);
    return NextResponse.json({ error: 'Failed to fetch product' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { id, variations, ...data } = body;

    const product = await prisma.product.update({
      where: { id: params.id },
      data: {
        ...data,
        price: data.price ? parseFloat(data.price) : undefined,
        cost: data.cost ? parseFloat(data.cost) : undefined,
        stock: data.stock ? parseInt(data.stock) : undefined,
        minStock: data.minStock ? parseInt(data.minStock) : undefined,
      },
      include: {
        category: true,
        variations: true,
      },
    });

    return NextResponse.json(product);
  } catch (error) {
    console.error('Error updating product:', error);
    return NextResponse.json({ error: 'Failed to update product' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.product.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting product:', error);
    return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 });
  }
}