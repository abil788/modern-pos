/**
 * Fungsi di atas merupakan potongan kode TypeScript untuk menangani request POST
 * yang digunakan untuk melakukan logout user dan mengembalikan pesan sukses
 * atau pesan error sesuai dengan hasil proses.
 * @param {NextRequest} request - Parameter `request` pada potongan kode ini merepresentasikan
 * objek HTTP request masuk pada fungsi serverless Next.js. Parameter ini berisi
 * informasi request seperti header, body, method, dan detail request lainnya.
 * @returns Fungsi POST ini mengembalikan respons JSON berupa pesan sukses jika
 * aktivitas logout berhasil dicatat, atau pesan error jika terjadi kegagalan
 * selama proses logout. Respons sukses berisi key `success` dengan nilai `true`,
 * serta key `message` yang menyatakan 'Logged out successfully'. Jika terjadi error,
 * respons akan berisi key `success` dengan nilai `false`.
 */

import { NextRequest, NextResponse } from 'next/server';
import { logActivity } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { userId, storeId } = await request.json();

    if (userId && storeId) {
      // Log logout activity
      await logActivity(userId, storeId, 'OWNER_LOGOUT', 'Owner logged out');
    }

    return NextResponse.json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to logout' },
      { status: 500 }
    );
  }
}