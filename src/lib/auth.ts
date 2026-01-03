import bcrypt from 'bcryptjs';
import prisma from './db';

const LOCK_DURATION = 5 * 60 * 1000; // 5 minutes
const MAX_ATTEMPTS = 3;

export async function verifyOwnerPassword(password: string, storeId: string) {
  const owner = await prisma.user.findFirst({
    where: {
      storeId,
      role: 'OWNER',
    },
  });

  if (!owner) {
    throw new Error('Owner account not found');
  }

  // Check if account is locked
  if (owner.isLocked && owner.lockedUntil) {
    const now = new Date();
    if (now < owner.lockedUntil) {
      const remainingMinutes = Math.ceil((owner.lockedUntil.getTime() - now.getTime()) / 60000);
      throw new Error(`Account locked. Try again in ${remainingMinutes} minutes`);
    } else {
      // Unlock account
      await prisma.user.update({
        where: { id: owner.id },
        data: {
          isLocked: false,
          lockedUntil: null,
          failedAttempts: 0,
        },
      });
    }
  }

  // Verify password
  const isValid = await bcrypt.compare(password, owner.password);

  if (!isValid) {
    const newAttempts = owner.failedAttempts + 1;
    
    if (newAttempts >= MAX_ATTEMPTS) {
      // Lock account
      await prisma.user.update({
        where: { id: owner.id },
        data: {
          isLocked: true,
          lockedUntil: new Date(Date.now() + LOCK_DURATION),
          failedAttempts: newAttempts,
        },
      });
      throw new Error(`Too many failed attempts. Account locked for 5 minutes`);
    } else {
      await prisma.user.update({
        where: { id: owner.id },
        data: {
          failedAttempts: newAttempts,
        },
      });
      throw new Error(`Invalid password. ${MAX_ATTEMPTS - newAttempts} attempts remaining`);
    }
  }

  // Reset failed attempts on successful login
  await prisma.user.update({
    where: { id: owner.id },
    data: {
      failedAttempts: 0,
      lastLogin: new Date(),
    },
  });

  return owner;
}

export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, 10);
}

export async function createDefaultOwner(storeId: string, password: string = 'admin123') {
  const hashedPassword = await hashPassword(password);
  
  return await prisma.user.create({
    data: {
      username: 'owner',
      password: hashedPassword,
      role: 'OWNER',
      fullName: 'Store Owner',
      storeId,
    },
  });
}

export async function createCashier(storeId: string, username: string, password: string, fullName: string) {
  const hashedPassword = await hashPassword(password);
  
  return await prisma.user.create({
    data: {
      username,
      password: hashedPassword,
      role: 'CASHIER',
      fullName,
      storeId,
    },
  });
}