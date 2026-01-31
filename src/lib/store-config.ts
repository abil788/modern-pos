/**
 * Client/Shared Store Configuration
 * 
 * This module is safe for BOTH Client and Server components.
 * It DOES NOT import 'next/headers'.
 */

// Default store ID - can be overridden via environment variable
const DEFAULT_STORE_ID = 'demo-store';

// Client-side store ID cache
let cachedStoreId: string | null = null;

/**
 * Get store ID for client-side code
 * Priority:
 * 1. Internal cache (set by StoreInitializer)
 * 2. NEXT_PUBLIC env var
 * 3. Default fallback
 */
export function getClientStoreId(): string {
    // 0. ULTIMATE FIX: Check injected window variable (Synchronous & Immediate)
    // This ignores React lifecycles and race conditions completely.
    if (typeof window !== 'undefined' && (window as any).ENV_STORE_ID) {
        return (window as any).ENV_STORE_ID;
    }

    // 1. Check cache first (set by StoreInitializer)
    if (cachedStoreId) return cachedStoreId;


    // 2. Check Cookie (Robust fallback if React hydration is slow)
    // We manually parse document.cookie to avoid heavy library dependencies in this utility
    if (typeof document !== 'undefined') {
        const match = document.cookie.match(new RegExp('(^| )current-store-id=([^;]+)'));
        if (match) {
            const cookieValue = match[2];
            // Cache it for next time
            cachedStoreId = cookieValue;
            return cookieValue;
        }
    }

    // 3. Check NEXT_PUBLIC env var (available in browser)
    if (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_STORE_ID) {
        return process.env.NEXT_PUBLIC_STORE_ID;
    }

    // 4. Fallback
    return DEFAULT_STORE_ID;
}

/**
 * Set the store ID on client-side (call after fetching store settings or from Initializer)
 */
export function setClientStoreId(storeId: string): void {
    cachedStoreId = storeId;
}

/**
 * Clear the cached store ID (useful for logout)
 */
export function clearClientStoreId(): void {
    cachedStoreId = null;
}
