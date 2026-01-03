import { CartItem, Transaction } from '@/types';

const STORAGE_KEYS = {
  CART: 'pos_cart',
  PENDING_TRANSACTIONS: 'pos_pending_transactions',
  OFFLINE_MODE: 'pos_offline_mode',
  THEME: 'pos_theme',
  LAST_SYNC: 'pos_last_sync',
  AUTH: 'pos_auth',
};

// Cart operations
export function saveCart(items: CartItem[]) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEYS.CART, JSON.stringify(items));
  }
}

export function getCart(): CartItem[] {
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem(STORAGE_KEYS.CART);
  return data ? JSON.parse(data) : [];
}

export function clearCart() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEYS.CART);
  }
}

// Pending transactions (offline mode)
export function savePendingTransaction(transaction: Partial<Transaction>) {
  if (typeof window === 'undefined') return;
  
  const pending = getPendingTransactions();
  pending.push({
    ...transaction,
    id: `offline_${Date.now()}`,
    createdAt: new Date(),
  });
  localStorage.setItem(STORAGE_KEYS.PENDING_TRANSACTIONS, JSON.stringify(pending));
}

export function getPendingTransactions(): Partial<Transaction>[] {
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem(STORAGE_KEYS.PENDING_TRANSACTIONS);
  return data ? JSON.parse(data) : [];
}

export function clearPendingTransactions() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEYS.PENDING_TRANSACTIONS);
  }
}

export function removePendingTransaction(id: string) {
  if (typeof window === 'undefined') return;
  
  const pending = getPendingTransactions();
  const filtered = pending.filter(t => t.id !== id);
  localStorage.setItem(STORAGE_KEYS.PENDING_TRANSACTIONS, JSON.stringify(filtered));
}

// Offline mode
export function setOfflineMode(enabled: boolean) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEYS.OFFLINE_MODE, JSON.stringify(enabled));
  }
}

export function getOfflineMode(): boolean {
  if (typeof window === 'undefined') return false;
  const data = localStorage.getItem(STORAGE_KEYS.OFFLINE_MODE);
  return data ? JSON.parse(data) : false;
}

// Theme
export function saveTheme(theme: 'light' | 'dark') {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEYS.THEME, theme);
  }
}

export function getTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';
  return (localStorage.getItem(STORAGE_KEYS.THEME) as 'light' | 'dark') || 'light';
}

// Last sync timestamp
export function saveLastSync() {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEYS.LAST_SYNC, new Date().toISOString());
  }
}

export function getLastSync(): Date | null {
  if (typeof window === 'undefined') return null;
  const data = localStorage.getItem(STORAGE_KEYS.LAST_SYNC);
  return data ? new Date(data) : null;
}

// Auth session
export function saveAuthSession(userId: string, role: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEYS.AUTH, JSON.stringify({ userId, role, timestamp: Date.now() }));
  }
}

export function getAuthSession() {
  if (typeof window === 'undefined') return null;
  const data = localStorage.getItem(STORAGE_KEYS.AUTH);
  if (!data) return null;
  
  const session = JSON.parse(data);
  // Check if session is older than 8 hours
  if (Date.now() - session.timestamp > 8 * 60 * 60 * 1000) {
    clearAuthSession();
    return null;
  }
  return session;
}

export function clearAuthSession() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEYS.AUTH);
  }
}

// Backup data
export function backupAllData() {
  if (typeof window === 'undefined') return null;
  
  return {
    cart: getCart(),
    pendingTransactions: getPendingTransactions(),
    theme: getTheme(),
    lastSync: getLastSync(),
    timestamp: new Date().toISOString(),
  };
}

export function restoreBackupData(backup: any) {
  if (typeof window === 'undefined') return;
  
  if (backup.cart) saveCart(backup.cart);
  if (backup.theme) saveTheme(backup.theme);
  if (backup.pendingTransactions) {
    localStorage.setItem(STORAGE_KEYS.PENDING_TRANSACTIONS, JSON.stringify(backup.pendingTransactions));
  }
}