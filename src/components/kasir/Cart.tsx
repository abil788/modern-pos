/* 
 * Komponen `Cart` adalah komponen React TypeScript yang merepresentasikan
 * antarmuka keranjang belanja. Komponen ini digunakan untuk menampilkan
 * daftar produk yang ditambahkan ke keranjang, mengatur jumlah item,
 * menghitung total harga, serta menyediakan aksi seperti menghapus item
 * dan melanjutkan ke proses checkout.
 */

'use client';

import { ShoppingCart } from 'lucide-react';
import { useCartStore } from '@/store/cartStore';
import { formatCurrency } from '@/lib/utils';

interface CartProps {
  onCheckout: () => void;
}

export function Cart({ onCheckout }: CartProps) {
  const { items, removeItem, updateQuantity, getTotal, getSubtotal } = useCartStore();

  return (
    <div className="w-96 bg-white dark:bg-gray-800 border-l dark:border-gray-700 flex flex-col">
      <div className="p-4 border-b dark:border-gray-700">
        <h2 className="text-xl font-bold flex items-center gap-2 dark:text-white">
          <ShoppingCart className="w-6 h-6" />
          Keranjang ({items.length})
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {items.length === 0 ? (
          <div className="text-center text-gray-400 mt-20">
            <ShoppingCart className="w-16 h-16 mx-auto mb-2" />
            <p>Keranjang kosong</p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <div key={item.productId} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-semibold text-sm flex-1 dark:text-white">
                    {item.name}
                  </h4>
                  <button
                    onClick={() => removeItem(item.productId)}
                    className="text-red-600 hover:text-red-700 ml-2"
                  >
                    ✕
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                      className="w-8 h-8 bg-gray-200 dark:bg-gray-600 rounded hover:bg-gray-300 dark:hover:bg-gray-500"
                    >
                      -
                    </button>
                    <span className="w-12 text-center font-semibold dark:text-white">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                      className="w-8 h-8 bg-gray-200 dark:bg-gray-600 rounded hover:bg-gray-300 dark:hover:bg-gray-500"
                    >
                      +
                    </button>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {formatCurrency(item.price)}
                    </p>
                    <p className="font-bold dark:text-white">
                      {formatCurrency(item.subtotal)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="border-t dark:border-gray-700 p-4">
        <div className="space-y-2 mb-4">
          <div className="flex justify-between">
            <span className="dark:text-gray-300">Subtotal:</span>
            <span className="font-semibold dark:text-white">
              {formatCurrency(getSubtotal())}
            </span>
          </div>
          <div className="flex justify-between text-2xl font-bold text-blue-600 dark:text-blue-400">
            <span>Total:</span>
            <span>{formatCurrency(getTotal())}</span>
          </div>
        </div>
        <button
          onClick={onCheckout}
          disabled={items.length === 0}
          className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-semibold text-lg"
        >
          Bayar
        </button>
      </div>
    </div>
  );
}