import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET(request: NextRequest) {
  const storeId = request.nextUrl.searchParams.get('storeId');
  const expenses = await prisma.expense.findMany({
    where: { storeId: storeId || undefined },
    orderBy: { date: 'desc' },
  });
  return NextResponse.json(expenses);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const expense = await prisma.expense.create({
    data: {
      ...body,
      amount: parseFloat(body.amount),
      date: new Date(body.date),
    },
  });
  return NextResponse.json(expense, { status: 201 });
}