/*
 * Komponen ini adalah komponen React TypeScript untuk modal checkout.
 * Fungsinya memungkinkan pengguna melihat ringkasan pesanan, memilih
 * metode pembayaran, memasukkan detail pembayaran, data pelanggan,
 * serta catatan tambahan.
 *
 * Komponen ini juga menghitung total pembayaran termasuk pajak,
 * melakukan validasi pembayaran, dan memproses transaksi dengan
 * mengirim data ke API. Setelah transaksi berhasil, struk akan
 * ditampilkan dan keranjang belanja akan dikosongkan.
 *
 * Selain itu, komponen ini menggunakan berbagai state, fungsi,
 * serta library eksternal seperti `lucide-react` untuk ikon dan
 * `react-hot-toast` untuk menampilkan notifikasi.
 */

'use client';

import { useState } from 'react';
import { X, CreditCard, Smartphone, Banknote, ArrowRight } from 'lucide-react';
import { useCartStore } from '@/store/cartStore';
import { useSettingsStore } from '@/store/settingsStore';
import { formatCurrency } from '@/lib/utils';
import toast from 'react-hot-toast';
import { getClientStoreId } from '@/lib/store-config';

interface CheckoutProps {
  isOpen: boolean;
  onClose: () => void;
}

const PAYMENT_METHODS = [
  { id: 'CASH', name: 'Tunai', icon: Banknote },
  { id: 'CARD', name: 'Kartu', icon: CreditCard },
  { id: 'QRIS', name: 'QRIS', icon: Smartphone },
  { id: 'TRANSFER', name: 'Transfer', icon: ArrowRight },
];

export function Checkout({ isOpen, onClose }: CheckoutProps) {
  const { items, getTotal, clearCart } = useCartStore();
  const { store } = useSettingsStore();
  
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [amountPaid, setAmountPaid] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const subtotal = getTotal();
  const tax = store?.taxRate ? (subtotal * store.taxRate) / 100 : 0;
  const total = subtotal + tax;
  const paid = parseFloat(amountPaid) || 0;
  const change = paid - total;

  const handleSubmit = async () => {
    if (paymentMethod === 'CASH' && paid < total) {
      toast.error('Jumlah bayar kurang!');
      return;
    }

    try {
      setLoading(true);
      
      const transactionData = {
        items: items.map(item => ({
          productId: item.productId,
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          subtotal: item.subtotal,
          discount: item.discount,
        })),
        subtotal,
        tax,
        discount: 0,
        total,
        paymentMethod,
        amountPaid: paid,
        change: Math.max(0, change),
        customerName: customerName || undefined,
        customerPhone: customerPhone || undefined,
        notes: notes || undefined,
        cashierId: 'demo-cashier', // TODO: Get from auth
        storeId: store?.id || getClientStoreId(),
      };

      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(transactionData),
      });

      if (!res.ok) throw new Error('Failed to create transaction');

      const transaction = await res.json();
      
      toast.success('Transaksi berhasil!');
      
      // Print receipt
      // window.print(); // TODO: Implement receipt component
      
      clearCart();
      onClose();
      
    } catch (error) {
      console.error('Transaction error:', error);
      toast.error('Gagal memproses transaksi');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b flex items-center justify-between">
          <h2 className="text-2xl font-bold">Checkout</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Order Summary */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-semibold mb-3">Ringkasan Pesanan</h3>
            <div className="space-y-2 text-sm">
              {items.map((item) => (
                <div key={item.productId} className="flex justify-between">
                  <span>{item.name} x{item.quantity}</span>
                  <span>{formatCurrency(item.subtotal)}</span>
                </div>
              ))}
              <div className="border-t pt-2 mt-2">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                {tax > 0 && (
                  <div className="flex justify-between text-gray-600">
                    <span>Pajak ({store?.taxRate}%):</span>
                    <span>{formatCurrency(tax)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-lg mt-2 pt-2 border-t">
                  <span>Total:</span>
                  <span className="text-blue-600">{formatCurrency(total)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Method */}
          <div>
            <label className="block font-semibold mb-2">Metode Pembayaran</label>
            <div className="grid grid-cols-2 gap-3">
              {PAYMENT_METHODS.map((method) => (
                <button
                  key={method.id}
                  onClick={() => setPaymentMethod(method.id)}
                  className={`p-4 border-2 rounded-lg flex items-center gap-3 transition-colors ${
                    paymentMethod === method.id
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <method.icon className="w-6 h-6" />
                  <span className="font-semibold">{method.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Amount Paid (for CASH) */}
          {paymentMethod === 'CASH' && (
            <div>
              <label className="block font-semibold mb-2">Jumlah Bayar</label>
              <input
                type="number"
                value={amountPaid}
                onChange={(e) => setAmountPaid(e.target.value)}
                placeholder="0"
                className="w-full p-3 border rounded-lg text-lg font-semibold"
              />
              {change >= 0 && amountPaid && (
                <div className="mt-2 p-3 bg-green-50 rounded-lg">
                  <div className="flex justify-between text-green-800">
                    <span>Kembalian:</span>
                    <span className="font-bold text-xl">{formatCurrency(change)}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Customer Info (Optional) */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-1">Nama Pelanggan</label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Opsional"
                className="w-full p-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">No. Telepon</label>
              <input
                type="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="Opsional"
                className="w-full p-2 border rounded-lg"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-semibold mb-1">Catatan</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Catatan tambahan..."
              className="w-full p-2 border rounded-lg"
              rows={2}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-semibold"
          >
            Batal
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || (paymentMethod === 'CASH' && paid < total)}
            className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {loading ? 'Memproses...' : 'Bayar Sekarang'}
          </button>
        </div>
      </div>
    </div>
  );
}