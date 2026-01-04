// 📁 src/app/api/staff/[id]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import prisma, { logActivity } from '@/lib/db';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { fullName, username, pin, photo, isActive, storeId } = body;

    // Cek kasir exists
    const existingCashier = await prisma.user.findUnique({
      where: { id: params.id },
    });

    if (!existingCashier) {
      return NextResponse.json(
        { error: 'Kasir tidak ditemukan' },
        { status: 404 }
      );
    }

    // Jika ada username baru, cek duplikat
    if (username && username !== existingCashier.username) {
      const duplicateUsername = await prisma.user.findUnique({
        where: { username },
      });

      if (duplicateUsername) {
        return NextResponse.json(
          { error: 'Username sudah digunakan' },
          { status: 400 }
        );
      }
    }

    // Validasi PIN jika diubah
    if (pin) {
      if (!/^\d{4}$/.test(pin)) {
        return NextResponse.json(
          { error: 'PIN harus 4 digit angka' },
          { status: 400 }
        );
      }
    }

    // Prepare update data
    const updateData: any = {};
    if (fullName !== undefined) updateData.fullName = fullName;
    if (username !== undefined) updateData.username = username;
    if (pin !== undefined && pin !== '') updateData.pin = pin;
    if (photo !== undefined) updateData.photo = photo || null;
    if (isActive !== undefined) updateData.isActive = isActive;

    // Update kasir
    const updatedCashier = await prisma.user.update({
      where: { id: params.id },
      data: updateData,
      select: {
        id: true,
        fullName: true,
        username: true,
        photo: true,
        isActive: true,
        lastLogin: true,
        createdAt: true,
      },
    });

    // Log aktivitas
    if (storeId) {
      await logActivity(
        params.id,
        storeId,
        'CASHIER_UPDATED',
        `Data kasir diupdate: ${updatedCashier.fullName}`
      );
    }

    return NextResponse.json(updatedCashier);
  } catch (error: any) {
    console.error('Error updating cashier:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update cashier' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const storeId = searchParams.get('storeId');

    // Cek kasir exists
    const cashier = await prisma.user.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        fullName: true,
        storeId: true,
      },
    });

    if (!cashier) {
      return NextResponse.json(
        { error: 'Kasir tidak ditemukan' },
        { status: 404 }
      );
    }

    // Hapus kasir
    await prisma.user.delete({
      where: { id: params.id },
    });

    // Log aktivitas
    if (storeId) {
      await logActivity(
        params.id,
        storeId,
        'CASHIER_DELETED',
        `Kasir dihapus: ${cashier.fullName}`
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting cashier:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete cashier' },
      { status: 500 }
    );
  }
}