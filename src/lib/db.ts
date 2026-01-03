import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// Helper functions
export async function getStoreSettings(storeId: string) {
  const settings = await prisma.setting.findMany({
    where: { storeId },
  });
  
  return settings.reduce((acc, setting) => {
    acc[setting.key] = setting.value;
    return acc;
  }, {} as Record<string, string>);
}

export async function updateStoreSetting(storeId: string, key: string, value: string) {
  return await prisma.setting.upsert({
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
}

export async function generateInvoiceNumber(storeId: string): Promise<string> {
  const today = new Date();
  const prefix = `INV-${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
  
  const lastTransaction = await prisma.transaction.findFirst({
    where: {
      storeId,
      invoiceNumber: {
        startsWith: prefix,
      },
    },
    orderBy: {
      invoiceNumber: 'desc',
    },
  });

  let sequence = 1;
  if (lastTransaction) {
    const lastSequence = parseInt(lastTransaction.invoiceNumber.split('-').pop() || '0');
    sequence = lastSequence + 1;
  }

  return `${prefix}-${String(sequence).padStart(4, '0')}`;
}

export async function logActivity(
  userId: string,
  storeId: string,
  action: string,
  details?: string
) {
  await prisma.activityLog.create({
    data: {
      userId,
      storeId,
      action,
      details,
    },
  });
}

export default prisma;