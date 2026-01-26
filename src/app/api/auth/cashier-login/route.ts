import { NextRequest, NextResponse } from 'next/server';
import prisma, { logActivity } from '@/lib/db';

const MAX_ATTEMPTS = 3;
const LOCK_DURATION = 15 * 60 * 1000; // 15 menit

/**
 * Menangani autentikasi login kasir melalui verifikasi PIN.
 * 
 * @async
 * @param {NextRequest} request - HTTP request masuk yang berisi kredensial kasir
 * @param {string} request.cashierId - Identifier unik dari kasir
 * @param {string} request.pin - PIN 4 digit untuk autentikasi
 * 
 * @returns {Promise<NextResponse>} Respons JSON berisi hasil autentikasi
 * @returns {Object} Respons sukses (200) - Berisi data user (id, username, fullName, role)
 * @returns {Object} Respons bad request (400) - PIN tidak ada atau format PIN tidak valid
 * @returns {Object} Respons not found (404) - ID kasir tidak ditemukan
 * @returns {Object} Respons forbidden (403) - Akun kasir tidak aktif
 * @returns {Object} Respons locked (423) - Akun terkunci atau verifikasi PIN gagal setelah batas maksimal percobaan
 * @returns {Object} Respons unauthorized (401) - PIN salah dengan informasi sisa percobaan
 * @returns {Object} Respons server error (500) - Terjadi kesalahan server yang tidak terduga
 * 
 * @description
 * Endpoint ini memvalidasi kredensial kasir dan mengelola keamanan akun:
 * - Memvalidasi format PIN (4 digit)
 * - Mengecek status akun kasir (aktif/tidak aktif)
 * - Menerapkan mekanisme penguncian akun setelah percobaan gagal
 * - Melacak jumlah percobaan login gagal
 * - Mereset counter percobaan gagal saat login berhasil
 * - Mencatat aktivitas login melalui fungsi logActivity
 * - Memperbarui timestamp login terakhir
 * 
 * @throws {Error} Mencatat error server ke console
 */

export async function POST(request: NextRequest) {
  try {
    const { cashierId, pin } = await request.json();

    if (!cashierId || !pin) {
      return NextResponse.json(
        { success: false, error: 'Cashier ID dan PIN harus diisi' },
        { status: 400 }
      );
    }

    // Validasi format PIN (harus 4 digit)
    if (!/^\d{4}$/.test(pin)) {
      return NextResponse.json(
        { success: false, error: 'PIN harus 4 digit angka' },
        { status: 400 }
      );
    }

    // Cari kasir
    const cashier = await prisma.user.findUnique({
      where: { id: cashierId },
      select: {
        id: true,
        username: true,
        fullName: true,
        role: true,
        pin: true,
        isActive: true,
        isLocked: true,
        lockedUntil: true,
        failedAttempts: true,
        storeId: true,
      },
    });

    if (!cashier) {
      return NextResponse.json(
        { success: false, error: 'Kasir tidak ditemukan' },
        { status: 404 }
      );
    }

    // Cek apakah kasir aktif
    if (!cashier.isActive) {
      return NextResponse.json(
        { success: false, error: 'Akun kasir tidak aktif. Hubungi owner.' },
        { status: 403 }
      );
    }

    // Cek apakah akun terkunci
    if (cashier.isLocked && cashier.lockedUntil) {
      const now = new Date();
      if (now < cashier.lockedUntil) {
        const remainingMinutes = Math.ceil(
          (cashier.lockedUntil.getTime() - now.getTime()) / 60000
        );
        return NextResponse.json(
          {
            success: false,
            error: `Akun terkunci. Coba lagi dalam ${remainingMinutes} menit.`,
          },
          { status: 423 }
        );
      } else {
        // Unlock akun
        await prisma.user.update({
          where: { id: cashier.id },
          data: {
            isLocked: false,
            lockedUntil: null,
            failedAttempts: 0,
          },
        });
      }
    }

    // Verifikasi PIN
    if (cashier.pin !== pin) {
      const newAttempts = cashier.failedAttempts + 1;

      if (newAttempts >= MAX_ATTEMPTS) {
        // Kunci akun
        await prisma.user.update({
          where: { id: cashier.id },
          data: {
            isLocked: true,
            lockedUntil: new Date(Date.now() + LOCK_DURATION),
            failedAttempts: newAttempts,
          },
        });

        // Log aktivitas
        await logActivity(
          cashier.id,
          cashier.storeId,
          'FAILED_LOGIN_LOCKED',
          `Akun ${cashier.fullName} terkunci karena terlalu banyak percobaan gagal`
        );

        return NextResponse.json(
          {
            success: false,
            error: 'PIN salah. Akun terkunci selama 15 menit.',
          },
          { status: 423 }
        );
      } else {
        // Update failed attempts
        await prisma.user.update({
          where: { id: cashier.id },
          data: {
            failedAttempts: newAttempts,
          },
        });

        const remainingAttempts = MAX_ATTEMPTS - newAttempts;
        return NextResponse.json(
          {
            success: false,
            error: `PIN salah. ${remainingAttempts} percobaan tersisa.`,
          },
          { status: 401 }
        );
      }
    }

    // PIN benar - Reset failed attempts dan update last login
    await prisma.user.update({
      where: { id: cashier.id },
      data: {
        failedAttempts: 0,
        lastLogin: new Date(),
      },
    });

    // Log aktivitas login
    await logActivity(
      cashier.id,
      cashier.storeId,
      'CASHIER_LOGIN',
      `${cashier.fullName} login ke sistem`
    );

    return NextResponse.json({
      success: true,
      user: {
        id: cashier.id,
        username: cashier.username,
        fullName: cashier.fullName,
        role: cashier.role,
      },
    });
  } catch (error: any) {
    console.error('Cashier login error:', error);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}