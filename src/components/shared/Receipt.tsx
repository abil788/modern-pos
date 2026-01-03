'use client';

import { useRef, useState, useEffect } from 'react';
import { Transaction } from '@/types';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { Printer, Download, X } from 'lucide-react';

interface ReceiptProps {
  transaction: Transaction;
  storeName: string;
  storeAddress?: string;
  storePhone?: string;
  receiptFooter?: string;
  isOpen: boolean;
  onClose: () => void;
}

interface Cashier {
  id: string;
  fullName: string;
  email: string;
}

export function Receipt({
  transaction,
  storeName,
  storeAddress,
  storePhone,
  receiptFooter,
  isOpen,
  onClose,
}: ReceiptProps) {
  const receiptRef = useRef<HTMLDivElement>(null);
  const [cashierName, setCashierName] = useState<string>('');

  useEffect(() => {
    if (transaction.cashierId) {
      loadCashierName(transaction.cashierId);
    }
  }, [transaction.cashierId]);

  const loadCashierName = async (cashierId: string) => {
    try {
      const res = await fetch(`/api/cashiers?id=${cashierId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.length > 0) {
          setCashierName(data[0].fullName);
        } else {
          setCashierName(cashierId);
        }
      } else {
        setCashierName(cashierId);
      }
    } catch (error) {
      console.error('Failed to load cashier:', error);
      setCashierName(cashierId);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    const content = receiptRef.current?.innerHTML || '';
    const blob = new Blob([`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Struk - ${transaction.invoiceNumber}</title>
        <style>
          body { font-family: monospace; max-width: 300px; margin: 0 auto; padding: 20px; }
          .receipt { text-align: center; }
          .divider { border-top: 2px dashed #000; margin: 10px 0; }
          table { width: 100%; }
          .text-right { text-align: right; }
          .bold { font-weight: bold; }
        </style>
      </head>
      <body>
        ${content}
      </body>
      </html>
    `], { type: 'text/html' });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `struk-${transaction.invoiceNumber}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Modal */}
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="p-4 border-b flex items-center justify-between print:hidden">
            <h2 className="text-xl font-bold">Struk Pembayaran</h2>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Receipt Content */}
          <div ref={receiptRef} className="p-6 receipt-content">
            <div className="text-center mb-4">
              <h1 className="text-2xl font-bold">{storeName}</h1>
              {storeAddress && <p className="text-sm text-gray-600">{storeAddress}</p>}
              {storePhone && <p className="text-sm text-gray-600">Telp: {storePhone}</p>}
            </div>

            <div className="border-t-2 border-dashed border-gray-300 my-4"></div>

            <div className="text-sm space-y-1 mb-4">
              <div className="flex justify-between">
                <span>No. Invoice:</span>
                <span className="font-bold">{transaction.invoiceNumber}</span>
              </div>
              <div className="flex justify-between">
                <span>Tanggal:</span>
                <span>{formatDateTime(transaction.createdAt)}</span>
              </div>
              <div className="flex justify-between">
                <span>Kasir:</span>
                <span>{cashierName || transaction.cashierId || '-'}</span>
              </div>
              {transaction.customerName && (
                <div className="flex justify-between">
                  <span>Pelanggan:</span>
                  <span>{transaction.customerName}</span>
                </div>
              )}
            </div>

            <div className="border-t-2 border-dashed border-gray-300 my-4"></div>

            {/* Items */}
            <div className="mb-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left pb-2">Item</th>
                    <th className="text-center pb-2">Qty</th>
                    <th className="text-right pb-2">Harga</th>
                    <th className="text-right pb-2">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {transaction.items.map((item) => (
                    <tr key={item.id} className="border-b">
                      <td className="py-2">
                        <div className="font-semibold">{item.productName}</div>
                        {item.discount > 0 && (
                          <div className="text-xs text-red-600">
                            Diskon: -{formatCurrency(item.discount)}
                          </div>
                        )}
                      </td>
                      <td className="text-center">{item.quantity}</td>
                      <td className="text-right">{formatCurrency(item.price)}</td>
                      <td className="text-right font-semibold">
                        {formatCurrency(item.subtotal)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="border-t-2 border-dashed border-gray-300 my-4"></div>

            {/* Totals */}
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>{formatCurrency(transaction.subtotal)}</span>
              </div>
              {transaction.tax > 0 && (
                <div className="flex justify-between text-gray-600">
                  <span>Pajak:</span>
                  <span>{formatCurrency(transaction.tax)}</span>
                </div>
              )}
              {transaction.discount > 0 && (
                <div className="flex justify-between text-red-600">
                  <span>Diskon:</span>
                  <span>-{formatCurrency(transaction.discount)}</span>
                </div>
              )}
              <div className="border-t pt-2 flex justify-between text-lg font-bold">
                <span>TOTAL:</span>
                <span>{formatCurrency(transaction.total)}</span>
              </div>
              <div className="flex justify-between">
                <span>Bayar ({transaction.paymentMethod}):</span>
                <span>{formatCurrency(transaction.amountPaid)}</span>
              </div>
              {transaction.change > 0 && (
                <div className="flex justify-between font-semibold">
                  <span>Kembalian:</span>
                  <span>{formatCurrency(transaction.change)}</span>
                </div>
              )}
            </div>

            {transaction.notes && (
              <>
                <div className="border-t-2 border-dashed border-gray-300 my-4"></div>
                <div className="text-sm">
                  <p className="font-semibold mb-1">Catatan:</p>
                  <p className="text-gray-600">{transaction.notes}</p>
                </div>
              </>
            )}

            <div className="border-t-2 border-dashed border-gray-300 my-4"></div>

            {/* Footer */}
            <div className="text-center text-sm">
              {receiptFooter ? (
                <p className="whitespace-pre-line">{receiptFooter}</p>
              ) : (
                <>
                  <p className="font-semibold">Terima kasih atas kunjungan Anda!</p>
                  <p className="text-gray-600">Barang yang sudah dibeli tidak dapat ditukar</p>
                </>
              )}
            </div>

            {/* QR Code Placeholder */}
            <div className="mt-4 flex justify-center">
              <div className="w-32 h-32 bg-gray-200 rounded flex items-center justify-center text-xs text-gray-500">
                QR Code
                <br />
                (Optional)
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="p-4 border-t flex gap-3 print:hidden">
            <button
              onClick={handlePrint}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
            >
              <Printer className="w-5 h-5" />
              Print
            </button>
            <button
              onClick={handleDownload}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center gap-2"
            >
              <Download className="w-5 h-5" />
              Download
            </button>
          </div>
        </div>
      </div>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .receipt-content,
          .receipt-content * {
            visibility: visible;
          }
          .receipt-content {
            position: absolute;
            left: 0;
            top: 0;
            width: 80mm;
            font-size: 12px;
          }
        }
      `}</style>
    </>
  );
}