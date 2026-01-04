import { NextRequest, NextResponse } from 'next/server';
import prisma, { logActivity } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const storeId = searchParams.get('storeId');
    const activeOnly = searchParams.get('activeOnly') === 'true';

    if (!storeId) {
      return NextResponse.json(
        { error: 'Store ID required' },
        { status: 400 }
      );
    }

    const where: any = {
      storeId,
      role: 'CASHIER',
    };

    if (activeOnly) {
      where.isActive = true;
    }

    const cashiers = await prisma.user.findMany({
      where,
      select: {
        id: true,
        fullName: true,
        username: true,
        photo: true,
        isActive: true,
        lastLogin: true,
        createdAt: true,
        role: true,
      },
      orderBy: { fullName: 'asc' },
    });

    return NextResponse.json(cashiers);
  } catch (error) {
    console.error('Error fetching staff:', error);
    return NextResponse.json(
      { error: 'Failed to fetch staff' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fullName, username, pin, photo, storeId } = body;

    // Validasi
    if (!fullName || !username || !pin || !storeId) {
      return NextResponse.json(
        { error: 'Nama lengkap, username, PIN, dan store ID harus diisi' },
        { status: 400 }
      );
    }

    // Validasi PIN format
    if (!/^\d{4}$/.test(pin)) {
      return NextResponse.json(
        { error: 'PIN harus 4 digit angka' },
        { status: 400 }
      );
    }

    // Cek username duplikat
    const existingUser = await prisma.user.findUnique({
      where: { username },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'Username sudah digunakan' },
        { status: 400 }
      );
    }

    // Buat kasir baru
    const newCashier = await prisma.user.create({
      data: {
        fullName,
        username,
        pin,
        photo: photo || null,
        password: '', // Kasir tidak perlu password
        role: 'CASHIER',
        storeId,
        isActive: true,
      },
      select: {
        id: true,
        fullName: true,
        username: true,
        photo: true,
        isActive: true,
        createdAt: true,
      },
    });

    // Log aktivitas
    await logActivity(
      newCashier.id,
      storeId,
      'CASHIER_CREATED',
      `Kasir baru ditambahkan: ${fullName}`
    );

    return NextResponse.json(newCashier, { status: 201 });
  } catch (error: any) {
    console.error('Error creating cashier:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create cashier' },
      { status: 500 }
    );
  }
}
