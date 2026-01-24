// src/app/api/settings/kds/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

// GET - Load KDS Setting
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get('storeId') || 'demo-store';

    console.log('🔍 [KDS API] GET request | Store:', storeId);

    const setting = await prisma.setting.findUnique({
      where: {
        storeId_key: {
          storeId,
          key: 'kds_enabled',
        },
      },
    });

    const enabled = setting?.value === 'true';

    console.log('✅ [KDS API] Setting loaded | Enabled:', enabled);

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

    console.log('💾 [KDS API] POST request | Store:', storeId, '| Enabled:', enabled);

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

    console.log('✅ [KDS API] Setting saved | Value:', setting.value);

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