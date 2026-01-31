/* 
 * Kode ini merupakan komponen React TypeScript
 * yang berfungsi sebagai root layout untuk sebuah aplikasi web.
 * Komponen ini mengatur struktur dasar halaman, termasuk elemen
 * HTML utama, header, footer, dan area konten yang akan dirender
 * oleh halaman-halaman anak.
 */
import './globals.css';
import { Inter } from 'next/font/google';
import { Toaster } from 'react-hot-toast';
import { headers, cookies } from 'next/headers';
import StoreInitializer from '@/components/shared/StoreInitializer';
import { getStoreId } from '@/lib/store-config-server';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'Modern POS System',
  description: 'Sistem Point of Sale Modern',
};



export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const h = headers();
  const c = cookies();
  const headerId = h.get('x-store-id');
  const cookieId = c.get('current-store-id')?.value;
  const computedId = getStoreId();

  const debugHostname = h.get('x-debug-hostname');

  return (
    <html lang="id">
      <head>
        <script
          dangerouslySetInnerHTML={{
             __html: `window.ENV_STORE_ID = "${computedId}";`,
          }}
        />
      </head>
      <body className={inter.className}>
        <StoreInitializer storeId={computedId} />
        {children}
        <Toaster position="top-right" />
      </body>
    </html>
  );
}