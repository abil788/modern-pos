/**
 * Kode TypeScript ini mendefinisikan fungsi GET, PUT, dan DELETE
 * untuk menangani proses pengambilan, pembaruan, dan penghapusan
 * data pengeluaran (expense) menggunakan Prisma
 * dalam lingkungan server Next.js.
 * @param {NextRequest} request - Parameter `request` pada fungsi `GET`,
 * `PUT`, dan `DELETE` merepresentasikan HTTP request masuk yang dikirim
 * ke server. Parameter ini berisi informasi seperti header, body, method,
 * URL, dan detail lain yang berkaitan dengan request.
 * @param  - Kode yang diberikan merupakan file API route Next.js
 * yang menangani request GET, PUT, dan DELETE untuk mengelola data
 * pengeluaran di database menggunakan Prisma. Berikut adalah
 * penjelasan parameter yang digunakan dalam fungsi-fungsi tersebut:
 * @returns Potongan kode ini berisi tiga fungsi, yaitu GET, PUT,
 * dan DELETE, yang masing-masing menangani method HTTP yang berbeda
 * untuk mengelola data pengeluaran pada aplikasi server-side.
 * Berikut adalah nilai yang dikembalikan oleh masing-masing fungsi:
 */


import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const expense = await prisma.expense.findUnique({
      where: { id: params.id },
    });

    if (!expense) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
    }

    return NextResponse.json(expense);
  } catch (error) {
    console.error('Error fetching expense:', error);
    return NextResponse.json({ error: 'Failed to fetch expense' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    
    const expense = await prisma.expense.update({
      where: { id: params.id },
      data: {
        ...body,
        amount: body.amount ? parseFloat(body.amount) : undefined,
        date: body.date ? new Date(body.date) : undefined,
      },
    });

    return NextResponse.json(expense);
  } catch (error) {
    console.error('Error updating expense:', error);
    return NextResponse.json({ error: 'Failed to update expense' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.expense.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting expense:', error);
    return NextResponse.json({ error: 'Failed to delete expense' }, { status: 500 });
  }
}