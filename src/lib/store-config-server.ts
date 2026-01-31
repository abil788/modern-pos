/**
 * Server-side Store Configuration
 * 
 * This module is for SERVER-SIDE use only (API routes, Server Components).
 * It can safely import 'next/headers'.
 */

import { headers, cookies } from 'next/headers';

// Default store ID - can be overridden via environment variable
const DEFAULT_STORE_ID = 'demo-store';

/**
 * Get store ID for server-side code (API routes, Server Components)
 * Priority:
 * 1. x-store-id header (from Middleware / Subdomain)
 * 2. STORE_ID env var
 * 3. Default fallback
 */
export function getStoreId(): string {
    try {
        const headersList = headers();
        const headerStoreId = headersList.get('x-store-id');
        if (headerStoreId) {
            return headerStoreId;
        }

        // Fallback: Check standard 'Host' header (Bypass Middleware reliance)
        const host = headersList.get('host');
        if (host) {
            // Parse subdomain directly here
            // e.g. "toko-kopi.localhost:3000" -> "toko-kopi"
            const parts = host.split('.');
            if (parts.length > 1 && !host.startsWith('www.')) {
                const subdomain = parts[0];
                if (subdomain !== 'localhost') {
                    return subdomain;
                }
            }
        }

        // Fallback: Check Cookie (Robustness against header issues)
        const cookieStore = cookies();
        const cookieStoreId = cookieStore.get('current-store-id')?.value;
        if (cookieStoreId) {
            return cookieStoreId;
        }
    } catch (error) {
        // Headers might not be available in some contexts (e.g. static generation)
    }

    return process.env.STORE_ID || DEFAULT_STORE_ID;
}
