import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        // Group users by storeId
        const usersByStore = await prisma.user.groupBy({
            by: ['storeId'],
            _count: {
                id: true,
            },
        });

        // Group products by storeId
        const productsByStore = await prisma.product.groupBy({
            by: ['storeId'],
            _count: {
                id: true,
            },
        });

        // Group transactions by storeId
        const transactionsByStore = await prisma.transaction.groupBy({
            by: ['storeId'],
            _count: {
                id: true,
            },
        });

        return NextResponse.json({
            message: "DATABASE DEBUG REPORT",
            users: usersByStore,
            products: productsByStore,
            transactions: transactionsByStore,
            check_time: new Date().toISOString()
        }, { status: 200 });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
