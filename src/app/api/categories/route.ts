/**
 * Fungsi-fungsi di atas menangani operasi CRUD (Create, Read, Update, Delete)
 * untuk kategori pada API Next.js dengan menggunakan Prisma
 * untuk interaksi dengan database.
 * @param {NextRequest} request - Parameter `request` pada masing-masing fungsi
 * merepresentasikan HTTP request masuk yang dikirim ke server. Parameter ini
 * berisi informasi request seperti header, body, parameter URL, query parameter,
 * dan lain-lain. Pada potongan kode ini, parameter `request`
 * bertipe `NextRequest`, yaitu
 * @returns Kode yang disediakan berisi empat fungsi untuk menangani
 * berbagai method HTTP (GET, POST, PUT, DELETE) yang berkaitan
 * dengan kategori pada sebuah toko. Berikut adalah apa yang
 * dikembalikan oleh masing-masing fungsi:
 */


import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const storeId = searchParams.get('storeId');

    if (!storeId) {
      return NextResponse.json({ error: 'Store ID required' }, { status: 400 });
    }

    const categories = await prisma.category.findMany({
      where: { storeId },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, icon, color, storeId } = body;

    if (!name || !storeId) {
      return NextResponse.json(
        { error: 'Name and store ID are required' },
        { status: 400 }
      );
    }

    const category = await prisma.category.create({
      data: {
        name,
        icon,
        color,
        storeId,
      },
    });

    return NextResponse.json(category, { status: 201 });
  } catch (error: any) {
    console.error('Error creating category:', error);
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Category name already exists' },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: 'Failed to create category' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');
    const body = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'Category ID required' }, { status: 400 });
    }

    const category = await prisma.category.update({
      where: { id },
      data: body,
    });

    return NextResponse.json(category);
  } catch (error) {
    console.error('Error updating category:', error);
    return NextResponse.json({ error: 'Failed to update category' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Category ID required' }, { status: 400 });
    }

    await prisma.category.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting category:', error);
    return NextResponse.json({ error: 'Failed to delete category' }, { status: 500 });
  }
}