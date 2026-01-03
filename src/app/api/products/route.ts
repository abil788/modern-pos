import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const storeId = searchParams.get('storeId');
    const search = searchParams.get('search');
    const categoryId = searchParams.get('categoryId');
    const barcode = searchParams.get('barcode');

    if (!storeId) {
      return NextResponse.json({ error: 'Store ID required' }, { status: 400 });
    }

    const where: any = {
      storeId,
      isActive: true,
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (barcode) {
      where.barcode = barcode;
    }

    const products = await prisma.product.findMany({
      where,
      include: {
        category: true,
        variations: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    return NextResponse.json(products);
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name,
      sku,
      barcode,
      description,
      price,
      cost,
      stock,
      minStock,
      image,
      categoryId,
      storeId,
      variations,
    } = body;

    if (!name || !price || !storeId) {
      return NextResponse.json(
        { error: 'Name, price, and store ID are required' },
        { status: 400 }
      );
    }

    const product = await prisma.product.create({
      data: {
        name,
        sku,
        barcode,
        description,
        price: parseFloat(price),
        cost: parseFloat(cost) || 0,
        stock: parseInt(stock) || 0,
        minStock: parseInt(minStock) || 5,
        image,
        categoryId,
        storeId,
        variations: variations
          ? {
              create: variations.map((v: any) => ({
                name: v.name,
                price: parseFloat(v.price),
                stock: parseInt(v.stock) || 0,
                sku: v.sku,
              })),
            }
          : undefined,
      },
      include: {
        category: true,
        variations: true,
      },
    });

    return NextResponse.json(product, { status: 201 });
  } catch (error: any) {
    console.error('Error creating product:', error);
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'SKU or barcode already exists' },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...data } = body;

    if (!id) {
      return NextResponse.json({ error: 'Product ID required' }, { status: 400 });
    }

    const product = await prisma.product.update({
      where: { id },
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

export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Product ID required' }, { status: 400 });
    }

    await prisma.product.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting product:', error);
    return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 });
  }
}