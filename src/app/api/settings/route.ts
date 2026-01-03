import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET(request: NextRequest) {
  const storeId = request.nextUrl.searchParams.get('storeId');
  const store = await prisma.store.findUnique({
    where: { id: storeId || undefined },
  });
  return NextResponse.json(store);
}

export async function PUT(request: NextRequest) {
  const body = await request.json();
  const { id, ...data } = body;
  
  const store = await prisma.store.update({
    where: { id },
    data,
  });
  
  return NextResponse.json(store);
}