/**
 * Fungsi ini mengambil data log aktivitas
 * berdasarkan parameter yang ditentukan
 * seperti store ID, user ID, dan limit,
 * serta menangani error dengan tepat.
 * @param {NextRequest} request - Parameter `request` pada fungsi `GET`
 * merupakan objek yang merepresentasikan HTTP request masuk.
 * Parameter ini berisi informasi request seperti header,
 * method, URL, query parameter, dan lainnya.
 * Pada potongan kode ini, parameter `request`
 * bertipe `NextRequest`, yaitu
 * @returns Potongan kode ini merupakan API route Next.js
 * yang menangani request GET. Fungsi ini mengambil
 * data log aktivitas dari database menggunakan Prisma
 * berdasarkan query parameter yang diberikan
 * seperti storeId, userId, dan limit.
 * Jika storeId tidak diberikan, maka fungsi akan
 * mengembalikan respons JSON berisi pesan error
 * dengan status code 400. Jika terjadi error
 * saat proses query database, error tersebut
 * akan ditangkap dan ditangani.
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const storeId = searchParams.get('storeId');
    const userId = searchParams.get('userId');
    const limit = parseInt(searchParams.get('limit') || '50');

    if (!storeId) {
      return NextResponse.json({ error: 'Store ID required' }, { status: 400 });
    }

    const where: any = { storeId };
    if (userId) {
      where.userId = userId;
    }

    const logs = await prisma.activityLog.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            username: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return NextResponse.json(logs);
  } catch (error) {
    console.error('Error fetching logs:', error);
    return NextResponse.json({ error: 'Failed to fetch logs' }, { status: 500 });
  }
}