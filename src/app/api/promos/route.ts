/**
 * Fungsi-fungsi di atas menangani request GET dan POST
 * untuk mengambil dan membuat data promo
 * dengan validasi serta penanganan error.
 * @param {NextRequest} request - Parameter `request` pada fungsi
 * `GET` dan `POST` merepresentasikan HTTP request masuk
 * yang dikirim ke server. Parameter ini berisi informasi
 * request seperti header, body, parameter URL,
 * query parameter, dan lain-lain. Pada potongan kode
 * yang diberikan, parameter `request` bertipe
 * `
 * @returns Fungsi GET mengembalikan daftar promo
 * berdasarkan parameter pencarian yang diberikan
 * pada URL request. Jika terjadi error selama proses
 * pengambilan data, maka akan dikembalikan pesan error
 * dengan status code 500.
 */


import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const storeId = searchParams.get('storeId');
    const activeOnly = searchParams.get('activeOnly') === 'true';

    if (!storeId) {
      return NextResponse.json({ error: 'Store ID required' }, { status: 400 });
    }

    const where: any = { storeId };
    if (activeOnly) {
      where.isActive = true;
    }

    const promos = await prisma.promo.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(promos);
  } catch (error) {
    console.error('Error fetching promos:', error);
    return NextResponse.json({ error: 'Failed to fetch promos' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
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
      storeId,
    } = body;

    // Validation
    if (!code || !name || !type || value === undefined || !storeId) {
      return NextResponse.json(
        { error: 'Code, name, type, value, and store ID are required' },
        { status: 400 }
      );
    }

    // Check if code already exists
    const existingPromo = await prisma.promo.findFirst({
      where: {
        code: code.toUpperCase(),
        storeId,
      },
    });

    if (existingPromo) {
      return NextResponse.json(
        { error: 'Kode promo sudah digunakan' },
        { status: 400 }
      );
    }

    const promo = await prisma.promo.create({
      data: {
        code: code.toUpperCase(),
        name,
        description: description || null,
        type,
        value: parseFloat(value.toString()),
        minPurchase: parseFloat((minPurchase || 0).toString()),
        maxDiscount: maxDiscount ? parseFloat(maxDiscount.toString()) : null,
        applicableCategories: applicableCategories || [],
        applicableProducts: applicableProducts || [],
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        validDays: validDays || [],
        validHours: validHours || null,
        usageLimit: usageLimit ? parseInt(usageLimit.toString()) : null,
        perCustomerLimit: perCustomerLimit ? parseInt(perCustomerLimit.toString()) : null,
        buyQuantity: buyQuantity ? parseInt(buyQuantity.toString()) : null,
        getQuantity: getQuantity ? parseInt(getQuantity.toString()) : null,
        getProductId: getProductId || null,
        isActive: isActive !== false,
        storeId,
      },
    });

    return NextResponse.json(promo, { status: 201 });
  } catch (error: any) {
    console.error('Error creating promo:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create promo' },
      { status: 500 }
    );
  }
}