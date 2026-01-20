// src/components/kasir/EnhancedCheckout.tsx
'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { PAYMENT_METHODS } from '@/lib/payment-config';
import { formatCurrency } from '@/lib/utils';
import toast from 'react-hot-toast';

interface EnhancedCheckoutProps {
  isOpen: boolean;
  onClose: () => void;
  subtotal: number;
  tax: number;
  total: number;
  items: any[];
  onComplete: (paymentData: any) => void;
  currentCashier: any;
}

export function EnhancedCheckout({
  isOpen,
  onClose,
  subtotal,
  tax,
  total,
  items,
  onComplete,
  currentCashier
}: EnhancedCheckoutProps) {
  const [selectedMethod, setSelectedMethod] = useState<string>('CASH');
  const [selectedChannel, setSelectedChannel] = useState<string>('CASH_IDR');
  const [paymentReference, setPaymentReference] = useState('');
  const [amountPaid, setAmountPaid] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [notes, setNotes] = useState('');

  const methodConfig = PAYMENT_METHODS[selectedMethod];
  const channelConfig = methodConfig?.channels.find(c => c.id === selectedChannel);
  
  const paid = parseFloat(amountPaid) || 0;
  const change = paid - total;

  const handleMethodChange = (methodId: string) => {
    setSelectedMethod(methodId);
    setSelectedChannel(PAYMENT_METHODS[methodId].channels[0].id);
    setPaymentReference('');
    
    // Auto-fill amount for non-cash
    if (methodId !== 'CASH') {
      setAmountPaid(total.toString());
    }
  };

  const handleSubmit = () => {
    // Validation
    if (selectedMethod === 'CASH' && paid < total) {
      toast.error('Jumlah bayar kurang!');
      return;
    }

    if (channelConfig?.requiresReference && !paymentReference.trim()) {
      toast.error('Nomor referensi harus diisi!');
      return;
    }

    const paymentData = {
      paymentMethod: selectedMethod,
      paymentChannel: selectedChannel,
      paymentReference: paymentReference || undefined,
      amountPaid: paid,
      change: Math.max(0, change),
      customerName: customerName || undefined,
      customerPhone: customerPhone || undefined,
      notes: notes || undefined
    };

    onComplete(paymentData);
  };

  const quickCashAmounts = [50000, 100000, 200000, 500000];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b dark:border-gray-700 flex items-center justify-between sticky top-0 bg-white dark:bg-gray-800 z-10">
          <h2 className="text-2xl font-bold dark:text-white">Checkout</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
            <X className="w-6 h-6 dark:text-gray-400" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Order Summary */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <h3 className="font-semibold mb-3 dark:text-white">Ringkasan Pesanan</h3>
            <div className="space-y-2 text-sm">
              {items.map((item) => (
                <div key={item.productId} className="flex justify-between dark:text-gray-300">
                  <span>{item.name} x{item.quantity}</span>
                  <span>{formatCurrency(item.subtotal)}</span>
                </div>
              ))}
              <div className="border-t dark:border-gray-600 pt-2 mt-2">
                <div className="flex justify-between dark:text-gray-300">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                {tax > 0 && (
                  <div className="flex justify-between text-gray-600 dark:text-gray-400">
                    <span>Pajak:</span>
                    <span>{formatCurrency(tax)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-lg mt-2 pt-2 border-t dark:border-gray-600 text-blue-600 dark:text-blue-400">
                  <span>Total:</span>
                  <span>{formatCurrency(total)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Method Selection */}
          <div>
            <label className="block font-semibold mb-3 dark:text-white">
              Metode Pembayaran
            </label>
            <div className="grid grid-cols-2 gap-3">
              {Object.values(PAYMENT_METHODS).map((method) => {
                const Icon = method.icon;
                return (
                  <button
                    key={method.id}
                    type="button"
                    onClick={() => handleMethodChange(method.id)}
                    className={`p-4 border-2 rounded-lg transition-all ${
                      selectedMethod === method.id
                        ? 'border-blue-600 bg-blue-50 dark:bg-blue-900'
                        : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`${method.bgColor} text-white p-3 rounded-lg`}>
                        <Icon className="w-6 h-6" />
                      </div>
                      <span className="font-semibold dark:text-white">{method.name}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Payment Channel Selection */}
          {methodConfig && (
            <div className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <label className="block font-semibold mb-3 dark:text-white">
                Pilih Channel - {methodConfig.name}
              </label>
              <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                {methodConfig.channels.map((channel) => (
                  <button
                    key={channel.id}
                    type="button"
                    onClick={() => setSelectedChannel(channel.id)}
                    className={`p-3 border-2 rounded-lg text-left transition-all ${
                      selectedChannel === channel.id
                        ? 'border-blue-600 bg-blue-50 dark:bg-blue-900'
                        : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'
                    }`}
                  >
                    <div className="font-medium text-sm dark:text-white">
                      {channel.name}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Reference Number for non-cash */}
          {channelConfig?.requiresReference && (
            <div>
              <label className="block font-semibold mb-2 dark:text-white">
                Nomor Referensi / Approval Code <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
                placeholder="Contoh: 1234567890 atau APPROV123"
                className="w-full p-3 border dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white font-mono"
                required
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Masukkan nomor referensi transaksi dari {channelConfig.name}
              </p>
            </div>
          )}

          {/* Amount Paid - Only for CASH */}
          {selectedMethod === 'CASH' && (
            <div>
              <label className="block font-semibold mb-2 dark:text-white">
                Jumlah Bayar
              </label>
              
              <div className="grid grid-cols-4 gap-2 mb-3">
                {quickCashAmounts.map((amount) => (
                  <button
                    key={amount}
                    type="button"
                    onClick={() => setAmountPaid(amount.toString())}
                    className="px-3 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg text-sm font-semibold dark:text-white"
                  >
                    {formatCurrency(amount)}
                  </button>
                ))}
              </div>

              <input
                type="number"
                value={amountPaid}
                onChange={(e) => setAmountPaid(e.target.value)}
                placeholder="0"
                className="w-full p-3 border dark:border-gray-600 rounded-lg text-lg font-semibold dark:bg-gray-700 dark:text-white"
                autoFocus
              />
              
              {change >= 0 && amountPaid && (
                <div className="mt-3 p-3 bg-green-50 dark:bg-green-900 rounded-lg">
                  <div className="flex justify-between text-green-800 dark:text-green-200">
                    <span>Kembalian:</span>
                    <span className="font-bold text-xl">{formatCurrency(change)}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Non-cash auto amount */}
          {selectedMethod !== 'CASH' && (
            <div className="bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700 rounded-lg p-3">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                ✓ Pembayaran {channelConfig?.name}: <strong>{formatCurrency(total)}</strong>
              </p>
            </div>
          )}

          {/* Customer Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-1 dark:text-white">
                Nama Pelanggan
              </label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Opsional"
                className="w-full p-2 border dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1 dark:text-white">
                No. Telepon
              </label>
              <input
                type="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="Opsional"
                className="w-full p-2 border dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-semibold mb-1 dark:text-white">
              Catatan
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Catatan tambahan..."
              className="w-full p-2 border dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
              rows={2}
            />
          </div>
        </div>

        <div className="p-6 border-t dark:border-gray-700 flex gap-3 sticky bottom-0 bg-white dark:bg-gray-800">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 font-semibold"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={
              (selectedMethod === 'CASH' && paid < total) ||
              (channelConfig?.requiresReference && !paymentReference.trim())
            }
            className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            Bayar Sekarang
          </button>
        </div>
      </div>
    </div>
  );
}