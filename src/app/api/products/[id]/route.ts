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

    // Cek apakah produk ada
    const existingProduct = await prisma.product.findUnique({
      where: { id: params.id },
    });

    if (!existingProduct) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

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
  const startTime = Date.now();
  
  try {
    console.log(`[DELETE PRODUCT] Attempting to delete product ID: ${params.id}`);

    // 1️⃣ Cek apakah produk ada
    const existingProduct = await prisma.product.findUnique({
      where: { id: params.id },
      include: {
        transactionItems: true, // Cek relasi dengan transaksi
      },
    });

    if (!existingProduct) {
      console.log(`[DELETE PRODUCT] Product not found: ${params.id}`);
      return NextResponse.json(
        { error: 'Product not found' }, 
        { status: 404 }
      );
    }

    // 2️⃣ Cek apakah ada transaksi terkait
    if (existingProduct.transactionItems.length > 0) {
      console.log(`[DELETE PRODUCT] Product has ${existingProduct.transactionItems.length} transaction items`);
      
      // Opsi 1: Soft delete (ubah isActive jadi false)
      const softDeleted = await prisma.product.update({
        where: { id: params.id },
        data: { 
          isActive: false,
          name: `[DELETED] ${existingProduct.name}` // Tandai sebagai deleted
        },
      });

      const queryTime = Date.now() - startTime;
      console.log(`[DELETE PRODUCT] Soft deleted in ${queryTime}ms | ID: ${params.id}`);

      return NextResponse.json({ 
        success: true, 
        softDeleted: true,
        message: 'Product has transactions, marked as inactive instead'
      });
    }

    // 3️⃣ Hard delete jika tidak ada transaksi
    await prisma.product.delete({
      where: { id: params.id },
    });

    const queryTime = Date.now() - startTime;
    console.log(`[DELETE PRODUCT] Hard deleted in ${queryTime}ms | ID: ${params.id}`);

    return NextResponse.json({ 
      success: true,
      softDeleted: false,
      message: 'Product deleted successfully'
    });

  } catch (error: any) {
    const queryTime = Date.now() - startTime;
    console.error(`[DELETE PRODUCT] Error after ${queryTime}ms:`, error);

    // Handle specific Prisma errors
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Product not found or already deleted' },
        { status: 404 }
      );
    }

    if (error.code === 'P2003') {
      return NextResponse.json(
        { error: 'Cannot delete product with existing relations' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { 
        error: 'Failed to delete product',
        details: error.message 
      }, 
      { status: 500 }
    );
  }
}


