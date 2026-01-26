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
  return (
    <html lang="id">
      <body className={inter.className}>
        {children}
        <Toaster position="top-right" />
      </body>
    </html>
  );
}