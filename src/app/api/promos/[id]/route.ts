// 📁 src/app/api/promos/[id]/route.ts - NEW FILE

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const promo = await prisma.promo.findUnique({
      where: { id: params.id },
      include: {
        logs: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!promo) {
      return NextResponse.json({ error: 'Promo not found' }, { status: 404 });
    }

    return NextResponse.json(promo);
  } catch (error) {
    console.error('Error fetching promo:', error);
    return NextResponse.json({ error: 'Failed to fetch promo' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const {
      code,
      name,
      description,
      type,
      value,
      minPurchase,
      maxDiscount,
      applicableCategories,
      applicableProducts,
      startDate,
      endDate,
      validDays,
      validHours,
      usageLimit,
      perCustomerLimit,
      buyQuantity,
      getQuantity,
      getProductId,
      isActive,
    } = body;

    // Check if code is being changed and if it conflicts
    if (code) {
      const existingPromo = await prisma.promo.findFirst({
        where: {
          code: code.toUpperCase(),
          id: { not: params.id },
        },
      });

      if (existingPromo) {
        return NextResponse.json(
          { error: 'Kode promo sudah digunakan' },
          { status: 400 }
        );
      }
    }

    const promo = await prisma.promo.update({
      where: { id: params.id },
      data: {
        code: code ? code.toUpperCase() : undefined,
        name,
        description: description || null,
        type,
        value: value !== undefined ? parseFloat(value.toString()) : undefined,
        minPurchase: minPurchase !== undefined ? parseFloat(minPurchase.toString()) : undefined,
        maxDiscount: maxDiscount ? parseFloat(maxDiscount.toString()) : null,
        applicableCategories,
        applicableProducts,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        validDays,
        validHours: validHours || null,
        usageLimit: usageLimit ? parseInt(usageLimit.toString()) : null,
        perCustomerLimit: perCustomerLimit ? parseInt(perCustomerLimit.toString()) : null,
        buyQuantity: buyQuantity ? parseInt(buyQuantity.toString()) : null,
        getQuantity: getQuantity ? parseInt(getQuantity.toString()) : null,
        getProductId: getProductId || null,
        isActive,
      },
    });

    return NextResponse.json(promo);
  } catch (error) {
    console.error('Error updating promo:', error);
    return NextResponse.json({ error: 'Failed to update promo' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.promo.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting promo:', error);
    return NextResponse.json({ error: 'Failed to delete promo' }, { status: 500 });
  }
}