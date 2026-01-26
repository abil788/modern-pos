/**
 * Komponen HomePage melakukan redirect ke halaman login menggunakan hook useRouter di Next.js
 * dan menampilkan loading spinner di atas latar belakang gradien.
 *
 * @returns
 * Komponen HomePage mengembalikan loading spinner yang ditampilkan di atas background gradien
 * dengan animasi berputar. Hook `useEffect` digunakan untuk melakukan redirect pengguna
 * ke halaman '/login' menggunakan `router.push` saat komponen dimount.
 */

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    router.push('/login');
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
    </div>
  );
}