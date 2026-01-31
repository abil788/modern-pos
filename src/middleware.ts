import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname, hostname } = request.nextUrl;

  // Skip middleware untuk static files dan login page
  if (
    pathname.startsWith('/_next') ||
    pathname === '/login' ||
    pathname.startsWith('/static')
  ) {
    return NextResponse.next();
  }

  // Get Store ID from Subdomain
  // e.g. "demo-store.localhost:3000" -> "demo-store"
  // e.g. "my-shop.app.com" -> "my-shop"
  // FIX: Use 'Host' header directly instead of nextUrl.hostname
  // nextUrl.hostname might be normalized to 'localhost' by Next.js
  const host = request.headers.get('host');
  console.log(`[Middleware] Raw Host Header: ${host}`);

  let storeId = process.env.STORE_ID || 'demo-store'; // Default fallback

  if (host) {
    // Remove port if present (e.g. "toko-kopi.localhost:3000" -> "toko-kopi.localhost")
    const hostname = host.split(':')[0];

    // Split hostname by dot
    const parts = hostname.split('.');

    // Logic: 
    // localhost (parts=1) -> default
    // toko-kopi.localhost (parts=2) -> toko-kopi
    // app.domain.com (parts=3) -> app

    if (parts.length > 1 && !hostname.startsWith('www.')) {
      const subdomain = parts[0];
      if (subdomain !== 'localhost') {
        storeId = subdomain;
      }
    }
  }

  // Clone the request headers and set the store ID
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-store-id', storeId);
  requestHeaders.set('x-debug-hostname', hostname || 'NULL');

  console.log(`[Middleware] Hostname: ${hostname}, Detected Store: ${storeId}`);

  // Redirect root ke login (preserve existing logic)
  if (pathname === '/') {
    const url = new URL('/login', request.url);
    return NextResponse.redirect(url, {
      headers: requestHeaders,
    });
  }

  // Pass the updated headers to the next request
  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  // ROBUSTNESS FIX: Set a cookie so client-side code can read it immediately
  // preventing race conditions with React Hydration
  response.cookies.set('current-store-id', storeId, {
    path: '/',
    httpOnly: false, // Allow client JS to read it
    sameSite: 'lax',
  });

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};

