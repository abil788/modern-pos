/* 
 * Potongan kode tersebut adalah komponen React TypeScript bernama `ProductGrid`
 * yang berfungsi untuk menampilkan daftar produk dalam bentuk grid. Komponen ini
 * menerima data produk sebagai input, lalu merender setiap produk ke dalam
 * tampilan grid agar mudah dilihat dan dipilih oleh pengguna.
 */

'use client';

import { Product } from '@/types';
import { formatCurrency } from '@/lib/utils';

interface ProductGridProps {
  products: Product[];
  onAddToCart: (product: Product) => void;
}

export function ProductGrid({ products, onAddToCart }: ProductGridProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      {products.map((product) => (
        <button
          key={product.id}
          onClick={() => onAddToCart(product)}
          disabled={product.stock <= 0}
          className="bg-white dark:bg-gray-800 rounded-lg p-4 hover:shadow-lg transition-shadow border dark:border-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {product.image ? (
            <img
              src={product.image}
              alt={product.name}
              className="w-full h-32 object-cover rounded-lg mb-2"
            />
          ) : (
            <div className="w-full h-32 bg-gray-200 dark:bg-gray-700 rounded-lg mb-2 flex items-center justify-center">
              <span className="text-4xl">📦</span>
            </div>
          )}
          <h3 className="font-semibold text-sm mb-1 truncate dark:text-white">
            {product.name}
          </h3>
          <p className="text-blue-600 dark:text-blue-400 font-bold">
            {formatCurrency(product.price)}
          </p>
          <p
            className={`text-xs mt-1 ${
              product.stock <= product.minStock
                ? 'text-red-600'
                : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            Stok: {product.stock}
          </p>
        </button>
      ))}
    </div>
  );
}

