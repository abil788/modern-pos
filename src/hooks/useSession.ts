import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  getCashierSession,
  getOwnerSession,
  clearCashierSession,
  clearOwnerSession,
  CashierSession,
  OwnerSession,
} from '@/lib/auth-utils';

export function useSession() {
  const router = useRouter();
  const [cashierSession, setCashierSession] = useState<CashierSession | null>(null);
  const [ownerSession, setOwnerSession] = useState<OwnerSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = () => {
    const cashier = getCashierSession();
    const owner = getOwnerSession();

    setCashierSession(cashier);
    setOwnerSession(owner);
    setLoading(false);
  };

  const logout = async () => {
    if (cashierSession) {
      // Log cashier logout
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: cashierSession.userId,
            storeId: 'demo-store',
          }),
        });
      } catch (error) {
        console.error('Logout error:', error);
      }
      clearCashierSession();
    }

    if (ownerSession) {
      clearOwnerSession();
    }

    router.push('/login');
  };

  return {
    cashierSession,
    ownerSession,
    isAuthenticated: cashierSession !== null || ownerSession !== null,
    isCashier: cashierSession !== null,
    isOwner: ownerSession !== null,
    loading,
    logout,
    refreshSession: checkSession,
  };
}