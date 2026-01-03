'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, ShoppingCart } from 'lucide-react';

export default function HomePage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Modern POS</h1>
          <p className="text-blue-100">Pilih mode untuk melanjutkan</p>
        </div>

        <div className="space-y-4">
          <button
            onClick={() => router.push('/kasir')}
            className="w-full bg-white text-gray-800 p-6 rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-4"
          >
            <ShoppingCart className="w-8 h-8" />
            <div className="text-left">
              <h3 className="text-xl font-bold">Mode Kasir</h3>
              <p className="text-sm text-gray-600">Mulai transaksi penjualan</p>
            </div>
          </button>

          <button
            onClick={() => router.push('/owner')}
            className="w-full bg-gray-900 text-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-4"
          >
            <Lock className="w-8 h-8" />
            <div className="text-left">
              <h3 className="text-xl font-bold">Mode Owner</h3>
              <p className="text-sm text-gray-400">Dashboard & Manajemen</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}