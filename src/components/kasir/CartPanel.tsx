'use client';

import { useState } from 'react';
import { ShoppingCart, Trash2 } from 'lucide-react';
import { useCartStore } from '@/store/cartStore';
import { useSettingsStore } from '@/store/settingsStore';
import { formatCurrency } from '@/lib/utils';
import toast from 'react-hot-toast';

interface CartPanelProps {
  onCheckout: () => void;
}

export function CartPanel({ onCheckout }: CartPanelProps) {
  const { items, removeItem, updateQuantity, getTotal, getSubtotal } = useCartStore();
  const { store } = useSettingsStore();
  
  const [editingQuantity, setEditingQuantity] = useState<string | null>(null);
  const [quantityInput, setQuantityInput] = useState<string>('');

  const handleQuantityInputStart = (productId: string, currentQuantity: number) => {
    setEditingQuantity(productId);
    setQuantityInput(currentQuantity.toString());
  };

  const handleQuantityInputChange = (value: string) => {
    // Only allow numbers
    if (value === '' || /^\d+$/.test(value)) {
      setQuantityInput(value);
    }
  };

  const handleQuantityInputSubmit = (productId: string, maxStock: number) => {
    const newQuantity = parseInt(quantityInput) || 0;
    
    if (newQuantity <= 0) {
      toast.error('Quantity harus lebih dari 0!');
      setEditingQuantity(null);
      return;
    }
    
    if (newQuantity > maxStock) {
      toast.error(`Stok tidak cukup! Maksimal: ${maxStock}`);
      setQuantityInput(maxStock.toString());
      return;
    }
    
    updateQuantity(productId, newQuantity);
    setEditingQuantity(null);
    toast.success('Quantity diupdate');
  };

  const handleQuantityInputBlur = (productId: string, maxStock: number) => {
    if (quantityInput) {
      handleQuantityInputSubmit(productId, maxStock);
    } else {
      setEditingQuantity(null);
    }
  };

  const subtotal = getSubtotal();
  const taxRate = store?.taxRate || 0;
  const tax = taxRate > 0 ? (subtotal * taxRate) / 100 : 0;
  const total = subtotal + tax;

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
            {items.map((item) => {
              const maxStock = item.maxStock || 999;
              
              return (
                <div key={item.productId} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-semibold text-sm flex-1 dark:text-white">
                      {item.name}
                    </h4>
                    <button
                      onClick={() => removeItem(item.productId)}
                      className="text-red-600 hover:text-red-700 ml-2 p-1 rounded hover:bg-red-50 dark:hover:bg-red-900"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                        className="w-8 h-8 bg-gray-200 dark:bg-gray-600 rounded hover:bg-gray-300 dark:hover:bg-gray-500 flex items-center justify-center font-bold"
                      >
                        -
                      </button>
                      
                      {editingQuantity === item.productId ? (
                        <input
                          type="text"
                          value={quantityInput}
                          onChange={(e) => handleQuantityInputChange(e.target.value)}
                          onBlur={() => handleQuantityInputBlur(item.productId, maxStock)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleQuantityInputSubmit(item.productId, maxStock);
                            } else if (e.key === 'Escape') {
                              setEditingQuantity(null);
                            }
                          }}
                          className="w-16 text-center font-semibold border-2 border-blue-500 rounded px-1 py-1 dark:bg-gray-600 dark:text-white"
                          autoFocus
                        />
                      ) : (
                        <button
                          onClick={() => handleQuantityInputStart(item.productId, item.quantity)}
                          className="w-16 text-center font-semibold dark:text-white hover:bg-gray-200 dark:hover:bg-gray-600 rounded py-1"
                          title="Klik untuk input manual"
                        >
                          {item.quantity}
                        </button>
                      )}
                      
                      <button
                        onClick={() => {
                          if (item.quantity >= maxStock) {
                            toast.error(`Stok maksimal: ${maxStock}`);
                            return;
                          }
                          updateQuantity(item.productId, item.quantity + 1);
                        }}
                        className="w-8 h-8 bg-gray-200 dark:bg-gray-600 rounded hover:bg-gray-300 dark:hover:bg-gray-500 flex items-center justify-center font-bold"
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
                  
                  {/* Stock indicator */}
                  <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    Stok tersedia: {maxStock}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="border-t dark:border-gray-700 p-4">
        <div className="space-y-2 mb-4">
          <div className="flex justify-between">
            <span className="dark:text-gray-300">Subtotal:</span>
            <span className="font-semibold dark:text-white">{formatCurrency(subtotal)}</span>
          </div>
          {tax > 0 && (
            <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
              <span>Pajak ({taxRate}%):</span>
              <span>{formatCurrency(tax)}</span>
            </div>
          )}
          <div className="flex justify-between text-2xl font-bold text-blue-600 dark:text-blue-400">
            <span>Total:</span>
            <span>{formatCurrency(total)}</span>
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