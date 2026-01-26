/**
 * Fungsi-fungsi ini menangani request GET dan PUT
 * untuk mengambil dan memperbarui data toko
 * menggunakan Prisma dalam lingkungan server Next.js.
 * @param {NextRequest} request - Parameter `request` pada fungsi
 * `GET` dan `PUT` merepresentasikan HTTP request masuk
 * yang dikirim ke server. Parameter ini berisi informasi
 * seperti header, method, URL, query parameter,
 * serta data body.
 * @returns Fungsi GET mengembalikan data toko yang
 * diambil dari database berdasarkan storeId yang
 * diberikan melalui parameter URL request.
 * Fungsi PUT memperbarui data toko menggunakan
 * informasi yang dikirim melalui body request
 * dan mengembalikan data toko yang telah diperbarui.
 */

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