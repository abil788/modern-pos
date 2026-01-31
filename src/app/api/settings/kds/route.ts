/**
 * Kode TypeScript di atas mendefinisikan API route
 * untuk memuat dan menyimpan pengaturan
 * Kitchen Display System (KDS)
 * menggunakan Next.js dan Prisma.
 * @param {NextRequest} request - Parameter `request` pada fungsi
 * `GET` dan `POST` merepresentasikan HTTP request masuk
 * yang dikirim ke endpoint API. Parameter ini berisi
 * informasi seperti method request, header, URL,
 * serta data body. Pada kasus ini, parameter tersebut
 * bertipe `NextRequest`, yang merupakan tipe khusus
 * pada Next.js.
 * @returns Fungsi GET mengembalikan objek respons JSON
 * dengan properti: success (boolean), enabled (boolean),
 * dan setting (object). Jika terjadi error, fungsi ini
 * mengembalikan objek respons JSON dengan properti
 * success (boolean), enabled (boolean), dan error (string).
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getStoreId } from '@/lib/store-config';

// GET - Load KDS Setting
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get('storeId') || getStoreId();


    const setting = await prisma.setting.findUnique({
      where: {
        storeId_key: {
          storeId,
          key: 'kds_enabled',
        },
      },
    });

    const enabled = setting?.value === 'true';


    return NextResponse.json({
      success: true,
      enabled,
      setting,
    });
  } catch (error: any) {
    console.error('❌ [KDS API] GET Error:', error);
    return NextResponse.json(
      {
        success: false,
        enabled: false,
        error: error.message
      },
      { status: 500 }
    );
  }
}

// POST - Save KDS Setting
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { storeId, enabled } = body;


    if (!storeId) {
      return NextResponse.json(
        { success: false, error: 'Store ID required' },
        { status: 400 }
      );
    }

    if (typeof enabled !== 'boolean') {
      return NextResponse.json(
        { success: false, error: 'Enabled must be boolean' },
        { status: 400 }
      );
    }

    const setting = await prisma.setting.upsert({
      where: {
        storeId_key: {
          storeId,
          key: 'kds_enabled',
        },
      },
      update: {
        value: enabled ? 'true' : 'false',
        updatedAt: new Date(),
      },
      create: {
        storeId,
        key: 'kds_enabled',
        value: enabled ? 'true' : 'false',
      },
    });


    return NextResponse.json({
      success: true,
      enabled: setting.value === 'true',
      setting,
      message: enabled
        ? 'Kitchen Display System diaktifkan'
        : 'Kitchen Display System dinonaktifkan',
    });
  } catch (error: any) {
    console.error('❌ [KDS API] POST Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message
      },
      { status: 500 }
    );
  }
}