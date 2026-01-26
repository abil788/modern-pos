/**
 * Fungsi ini menangani proses penggantian password pengguna dengan melakukan validasi,
 * hashing password, pembaruan data ke database, serta pencatatan aktivitas.
 * @param {NextRequest} request - Parameter `request` pada fungsi `POST` merepresentasikan
 * HTTP request masuk yang dikirim ke server. Parameter ini berisi informasi seperti
 * metode request, header, body, dan data relevan lainnya yang dikirim oleh client.
 * Dalam konteks ini, parameter `request` digunakan untuk mengekstrak data `current
 * @returns Respons JSON berupa pesan sukses jika penggantian password berhasil,
 * atau pesan error jika terjadi kesalahan validasi, kesalahan autentikasi,
 * atau kesalahan pada server. Respons spesifik yang dikembalikan adalah:
 */


import { NextRequest, NextResponse } from 'next/server';
import prisma, { logActivity } from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    const { currentPassword, newPassword, storeId } = await request.json();

    // Validation
    if (!currentPassword || !newPassword || !storeId) {
      return NextResponse.json(
        { error: 'Password saat ini, password baru, dan store ID harus diisi' },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: 'Password baru minimal 6 karakter' },
        { status: 400 }
      );
    }

    // Find owner account
    const owner = await prisma.user.findFirst({
      where: {
        storeId,
        role: 'OWNER',
      },
    });

    if (!owner) {
      return NextResponse.json(
        { error: 'Akun owner tidak ditemukan' },
        { status: 404 }
      );
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, owner.password);

    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Password saat ini salah' },
        { status: 401 }
      );
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await prisma.user.update({
      where: { id: owner.id },
      data: {
        password: hashedNewPassword,
        failedAttempts: 0,
        isLocked: false,
        lockedUntil: null,
      },
    });

    // Log activity
    await logActivity(
      owner.id,
      storeId,
      'PASSWORD_CHANGED',
      'Owner changed their password'
    );

    return NextResponse.json({
      success: true,
      message: 'Password berhasil diubah',
    });

  } catch (error: any) {
    console.error('Change password error:', error);
    return NextResponse.json(
      { error: error.message || 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}