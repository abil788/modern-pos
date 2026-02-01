
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../route';
import { NextRequest } from 'next/server';
import prisma from '@/lib/db';
import { getSessionFromRequest } from '@/lib/auth-server';

// Mock dependencies
vi.mock('@/lib/db', () => {
    const mockClient = {
        transaction: { create: vi.fn(), findFirst: vi.fn() },
        product: { update: vi.fn() },
        user: { findFirst: vi.fn() },
        setting: { findUnique: vi.fn() },
        promo: { findFirst: vi.fn(), update: vi.fn() },
        promoUsageLog: { create: vi.fn() },
        $transaction: vi.fn(),
    };

    // Wire circular dependency for $transaction to execute callback with the mock client
    mockClient.$transaction.mockImplementation((cb: any) => cb(mockClient));

    return {
        __esModule: true,
        default: mockClient,
        generateInvoiceNumber: vi.fn().mockResolvedValue('INV-TEST-0001'),
    };
});

// Recursive mock for prisma inside transaction (accessing the mocked module)
const prismaMock = prisma as any;

vi.mock('@/lib/auth-server', () => ({
    getSessionFromRequest: vi.fn(),
}));

vi.mock('@/lib/pusher-server', () => ({
    triggerKitchenOrder: vi.fn(),
}));

describe('Transaction API POST', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Reset transaction mock behavior
        prismaMock.$transaction.mockImplementation((cb: any) => cb(prismaMock));
    });

    it('should return 401 if not authenticated', async () => {
        (getSessionFromRequest as any).mockResolvedValue(null);
        const req = new NextRequest('http://localhost/api/transactions', {
            method: 'POST',
            body: JSON.stringify({}),
        });
        const res = await POST(req);
        expect(res.status).toBe(401);
    });

    it('should create transaction successfully', async () => {
        // Mock Session
        (getSessionFromRequest as any).mockResolvedValue({
            user: { id: 'cashier-123', storeId: 'store-abc', role: 'CASHIER' },
        });

        // Mock Cashier Check
        prismaMock.user.findFirst.mockResolvedValue({ id: 'cashier-123' });

        // Mock Transaction Create
        prismaMock.transaction.create.mockResolvedValue({
            id: 'trans-1',
            invoiceNumber: 'INV-TEST-0001',
            total: 10000,
            createdAt: new Date(),
            items: [],
        });

        // Mock Request Body
        const body = {
            items: [{ productId: 'prod-1', name: 'Kopi', quantity: 1, price: 10000, subtotal: 10000 }],
            subtotal: 10000,
            total: 10000,
            paymentMethod: 'cash',
            amountPaid: 10000,
            storeId: 'store-abc',
            cashierId: 'cashier-123', // should be ignored but passed for completeness
        };

        const req = new NextRequest('http://localhost/api/transactions', {
            method: 'POST',
            body: JSON.stringify(body),
        });

        const res = await POST(req);
        const json = await res.json();

        expect(res.status).toBe(201);
        expect(json.invoiceNumber).toBe('INV-TEST-0001');

        // Verify usage of transaction
        expect(prismaMock.$transaction).toHaveBeenCalled();
        expect(prismaMock.transaction.create).toHaveBeenCalled();
        expect(prismaMock.product.update).toHaveBeenCalledWith({
            where: { id: 'prod-1' },
            data: { stock: { decrement: 1 } },
        });
    });

    it('should enforce atomic transaction (rollback on error)', async () => {
        // Mock Session
        (getSessionFromRequest as any).mockResolvedValue({
            user: { id: 'cashier-123', storeId: 'store-abc', role: 'CASHIER' },
        });

        prismaMock.user.findFirst.mockResolvedValue({ id: 'cashier-123' });

        // Mock Transaction Create SUCCESS
        prismaMock.transaction.create.mockResolvedValue({ id: 'trans-1' });

        // Mock Product Update FAIL to simulate rollback condition
        prismaMock.product.update.mockRejectedValue(new Error('Out of stock'));

        const body = {
            items: [{ productId: 'prod-1', name: 'Kopi', quantity: 1, price: 10000, subtotal: 10000 }],
            subtotal: 10000,
            total: 10000,
            paymentMethod: 'cash',
            amountPaid: 10000,
            storeId: 'store-abc',
        };

        const req = new NextRequest('http://localhost/api/transactions', {
            method: 'POST',
            body: JSON.stringify(body),
        });

        const res = await POST(req);
        expect(res.status).toBe(500);
        // Since we mocked $transaction to execute callback, the error thrown inside callback should propagate
    });
});
