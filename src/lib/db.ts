// src/lib/db.ts
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development'
      ? ['query', 'error', 'warn']
      : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// Helper functions
export async function getStoreSettings(storeId: string) {
  const startTime = Date.now();

  const settings = await prisma.setting.findMany({
    where: { storeId },
  });


  return settings.reduce((acc, setting) => {
    acc[setting.key] = setting.value;
    return acc;
  }, {} as Record<string, string>);
}

export async function updateStoreSetting(storeId: string, key: string, value: string) {
  const startTime = Date.now();

  const result = await prisma.setting.upsert({
    where: {
      storeId_key: {
        storeId,
        key,
      },
    },
    update: { value },
    create: {
      storeId,
      key,
      value,
    },
  });

  return result;
}

export async function generateInvoiceNumber(storeId: string, tx?: any): Promise<string> {
  const startTime = Date.now();
  const client = tx || prisma;

  const today = new Date();
  const prefix = `INV-${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;

  const lastTransaction = await client.transaction.findFirst({
    where: {
      storeId,
      invoiceNumber: {
        startsWith: prefix,
      },
    },
    orderBy: {
      invoiceNumber: 'desc',
    },
    select: {
      invoiceNumber: true,
    },
  });

  let sequence = 1;
  if (lastTransaction) {
    const lastSequence = parseInt(lastTransaction.invoiceNumber.split('-').pop() || '0');
    sequence = lastSequence + 1;
  }

  const invoiceNumber = `${prefix}-${String(sequence).padStart(4, '0')}`;

  return invoiceNumber;
}

export async function logActivity(
  userId: string,
  storeId: string,
  action: string,
  details?: string
) {
  const startTime = Date.now();

  await prisma.activityLog.create({
    data: {
      userId,
      storeId,
      action,
      details,
    },
  });

}

// Graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

export default prisma;