/**
 * Centralized Store Configuration
 * 
 * This module provides utilities for managing the store ID across the application.
 * For single-tenancy deployment, set STORE_ID and NEXT_PUBLIC_STORE_ID in your .env file.
 */

// Default store ID - can be overridden via environment variable
const DEFAULT_STORE_ID = 'demo-store';

/**
 * Get store ID for server-side code (API routes)
 * Reads from STORE_ID environment variable
 */
export function getStoreId(): string {
    return process.env.STORE_ID || DEFAULT_STORE_ID;
}

// Client-side store ID cache
let cachedStoreId: string | null = null;

/**
 * Get store ID for client-side code
 * Reads from NEXT_PUBLIC_STORE_ID environment variable (available in browser)
 * Falls back to cached value or default
 */
export function getClientStoreId(): string {
    // First check NEXT_PUBLIC env var (available at build time in Next.js)
    if (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_STORE_ID) {
        return process.env.NEXT_PUBLIC_STORE_ID;
    }
    // Fall back to cached value
    if (cachedStoreId) return cachedStoreId;
    // Finally return default
    return DEFAULT_STORE_ID;
}

/**
 * Set the store ID on client-side (call after fetching store settings)
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

