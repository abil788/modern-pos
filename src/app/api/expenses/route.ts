import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const searchParams = request.nextUrl.searchParams;
    const storeId = searchParams.get('storeId');
    const search = searchParams.get('search');
    const category = searchParams.get('category');
    const month = searchParams.get('month');
    
    // Pagination parameters
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = (page - 1) * limit;

    if (!storeId) {
      return NextResponse.json({ error: 'Store ID required' }, { status: 400 });
    }

    const where: any = { storeId };

    // Search filter
    if (search) {
      where.OR = [
        { category: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Category filter
    if (category) {
      where.category = category;
    }

    // Month filter
    if (month) {
      const [year, monthNum] = month.split('-').map(Number);
      const startDate = new Date(year, monthNum - 1, 1);
      const endDate = new Date(year, monthNum, 0, 23, 59, 59);
      
      where.date = {
        gte: startDate,
        lte: endDate,
      };
    }

    // Parallel queries for better performance
    const [expenses, totalCount] = await Promise.all([
      prisma.expense.findMany({
        where,
        orderBy: { date: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.expense.count({ where }),
    ]);

    const queryTime = Date.now() - startTime;
    console.log(`[EXPENSES API] Query took: ${queryTime}ms | Expenses: ${expenses.length} | Page: ${page}`);

    return NextResponse.json({
      expenses,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
        hasMore: offset + expenses.length < totalCount,
      },
      performance: {
        queryTime: `${queryTime}ms`,
      },
    });
  } catch (error) {
    const queryTime = Date.now() - startTime;
    console.error(`[EXPENSES API] Error after ${queryTime}ms:`, error);
    return NextResponse.json({ error: 'Failed to fetch expenses' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const body = await request.json();
    const expense = await prisma.expense.create({
      data: {
        ...body,
        amount: parseFloat(body.amount),
        date: new Date(body.date),
      },
    });

    const queryTime = Date.now() - startTime;
    console.log(`[EXPENSES API] Expense created in ${queryTime}ms | ID: ${expense.id}`);

    return NextResponse.json(expense, { status: 201 });
  } catch (error) {
    const queryTime = Date.now() - startTime;
    console.error(`[EXPENSES API] Create error after ${queryTime}ms:`, error);
    return NextResponse.json({ error: 'Failed to create expense' }, { status: 500 });
  }
}