/**
 * Fungsi TypeScript ini menangani request POST untuk memverifikasi password owner,
 * mencatat aktivitas login owner, dan mengembalikan informasi user jika berhasil.
 * @param {NextRequest} request - Parameter `request` pada potongan kode ini merepresentasikan
 * HTTP request masuk yang dikirim ke server. Parameter ini berisi informasi seperti
 * metode request, header, body, dan data relevan lainnya yang dikirim oleh client.
 * Dalam fungsi ini, parameter `request` digunakan untuk mengekstrak password dan storeId.
 * @returns Fungsi POST ini mengembalikan respons JSON berupa pesan sukses beserta
 * detail user jika verifikasi password berhasil, atau pesan gagal dengan detail error
 * jika terjadi kesalahan selama proses. Respons ini mencakup id, username, role,
 * dan full name user jika login berhasil. Jika terjadi error, status 400 akan
 * dikembalikan beserta pesan error.
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyOwnerPassword } from '@/lib/auth';
import { logActivity } from '@/lib/db';
import { createSession } from '@/lib/auth-server';

export async function POST(request: NextRequest) {
  try {
    const { password, storeId } = await request.json();

    // 1. Verify credentials against DB
    const user = await verifyOwnerPassword(password, storeId);

    // 2. Log activity
    await logActivity(user.id, storeId, 'OWNER_LOGIN', 'Owner logged in via Secure API');

    // 3. Create Secure Session (HTTP-Only Cookie)
    await createSession({
      id: user.id,
      username: user.username,
      role: user.role,
      storeId: user.storeId,
      fullName: user.fullName,
    });

    // 4. Return success (Client doesn't need token, it's in the cookie)
    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        fullName: user.fullName,
      },
    });
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 400 }
    );
  }
}