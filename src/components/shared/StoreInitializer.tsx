'use client';

import { useEffect, useRef } from 'react';
import { setClientStoreId } from '@/lib/store-config';

interface StoreInitializerProps {
  storeId: string;
}

/**
 * StoreInitializer
 * 
 * This client component receives the storeId from the server (RootLayout)
 * and initializes the client-side store configuration cache.
 * 
 * It ensures that all subsequent client-side components (using getClientStoreId)
 * have access to the correct store ID without needing to prop-drill it everywhere.
 */
export default function StoreInitializer({ storeId }: StoreInitializerProps) {
  // CRITICAL FIX: Set the store ID immediately during render phase
  // This ensures it is available before child components' effects run.
  // This is safe because it's a singleton assignment and idempotent.
  if (typeof window !== 'undefined') {
    setClientStoreId(storeId);
  }

  // Use a ref to track initialization for strict mode double-invocation handling
  const initialized = useRef(false);

  // Also update on mount/change just in case (e.g. navigation)
  useEffect(() => {
    setClientStoreId(storeId);
  }, [storeId]);

  return null; // This component renders nothing
}
