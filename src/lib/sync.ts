import {
  getPendingTransactions,
  removePendingTransaction,
  saveLastSync,
} from './storage';

export async function syncPendingTransactions(storeId: string, cashierId: string) {
  const pending = getPendingTransactions();

  if (pending.length === 0) {
    return { success: true, synced: 0 };
  }

  let synced = 0;
  const errors: string[] = [];

  for (const transaction of pending) {
    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...transaction,
          storeId,
          cashierId,
        }),
      });

      if (res.ok) {
        removePendingTransaction(transaction.id!);
        synced++;
      } else {
        const error = await res.json();
        errors.push(`${transaction.id}: ${error.error}`);
      }
    } catch (error) {
      console.error('Sync error:', error);
      errors.push(`${transaction.id}: Network error`);
    }
  }

  if (synced > 0) {
    saveLastSync();
  }

  return {
    success: errors.length === 0,
    synced,
    errors,
  };
}

export function autoSync(storeId: string, cashierId: string, intervalMs: number = 60000) {
  const sync = async () => {
    if (!navigator.onLine) return;

    try {
      const result = await syncPendingTransactions(storeId, cashierId);
      if (result.synced > 0) {
        console.log(`Auto-sync: ${result.synced} transactions synced`);
      }
    } catch (error) {
      console.error('Auto-sync error:', error);
    }
  };

  // Initial sync
  sync();

  // Set interval
  const interval = setInterval(sync, intervalMs);

  // Return cleanup function
  return () => clearInterval(interval);
}