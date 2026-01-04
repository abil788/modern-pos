'use client';

import { useState, useEffect } from 'react';
import { Receipt, Eye, Search, Calendar } from 'lucide-react';
import { Transaction } from '@/types';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import toast from 'react-hot-toast';

interface Cashier {
  id: string;
  fullName: string;
  email: string;
}

export default function HistoryPage() {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [cashiers, setCashiers] = useState<Record<string, Cashier>>({});
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
    const [dateFilter, setDateFilter] = useState('all');

    useEffect(() => {
      loadTransactions();
      loadCashiers();
    }, []);

    const loadTransactions = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/transactions?storeId=demo-store&limit=1000');
      const data = await res.json();
      
      // Handle new API response format with pagination
      if (data.transactions && Array.isArray(data.transactions)) {
        setTransactions(data.transactions);
      } else if (Array.isArray(data)) {
        // Fallback for old API format
        setTransactions(data);
      } else {
        console.error('Unexpected API response format:', data);
        setTransactions([]);
      }
    } catch (error) {
      console.error('Error loading transactions:', error);
      toast.error('Gagal memuat history transaksi');
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  const loadCashiers = async () => {
    try {
      const res = await fetch('/api/cashiers?storeId=demo-store');
      if (res.ok) {
        const data = await res.json();
        // Create a lookup map for cashiers
        const cashierMap = data.reduce((acc: Record<string, Cashier>, cashier: Cashier) => {
          acc[cashier.id] = cashier;
          return acc;
        }, {});
        setCashiers(cashierMap);
      }
    } catch (error) {
      console.error('Failed to load cashiers:', error);
      // Not critical, so don't show error to user
    }
  };

  const filteredTransactions = (Array.isArray(transactions) ? transactions : []).filter((transaction) => {
  const matchSearch =
      transaction.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      transaction.customerName?.toLowerCase().includes(searchQuery.toLowerCase());

    const now = new Date();
    let matchDate = true;

    if (dateFilter === 'today') {
      const today = new Date(now.setHours(0, 0, 0, 0));
      matchDate = new Date(transaction.createdAt) >= today;
    } else if (dateFilter === 'week') {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      matchDate = new Date(transaction.createdAt) >= weekAgo;
    } else if (dateFilter === 'month') {
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      matchDate = new Date(transaction.createdAt) >= monthAgo;
    }

    return matchSearch && matchDate;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">History Transaksi</h1>
        <p className="text-gray-500">Riwayat semua transaksi penjualan</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Cari invoice atau pelanggan..."
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Date Filter */}
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-gray-600" />
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="flex-1 p-2 border rounded-lg"
            >
              <option value="all">Semua Waktu</option>
              <option value="today">Hari Ini</option>
              <option value="week">7 Hari Terakhir</option>
              <option value="month">30 Hari Terakhir</option>
            </select>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-gray-500 text-sm mb-1">Total Transaksi</p>
          <p className="text-3xl font-bold">{filteredTransactions.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-gray-500 text-sm mb-1">Total Pendapatan</p>
          <p className="text-3xl font-bold text-green-600">
            {formatCurrency(
              filteredTransactions.reduce((sum, t) => sum + t.total, 0)
            )}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-gray-500 text-sm mb-1">Rata-rata Transaksi</p>
          <p className="text-3xl font-bold text-blue-600">
            {formatCurrency(
              filteredTransactions.length > 0
                ? filteredTransactions.reduce((sum, t) => sum + t.total, 0) /
                    filteredTransactions.length
                : 0
            )}
          </p>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Invoice
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Tanggal & Waktu
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Pelanggan
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Kasir
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Metode
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Total
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center">
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                  </td>
                </tr>
              ) : filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                    <Receipt className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                    <p>Tidak ada transaksi</p>
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((transaction) => (
                  <tr key={transaction.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-blue-600">
                      {transaction.invoiceNumber}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {formatDateTime(transaction.createdAt)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {transaction.customerName || '-'}
                      {transaction.customerPhone && (
                        <div className="text-xs text-gray-400">
                          {transaction.customerPhone}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {cashiers[transaction.cashierId]?.fullName || transaction.cashierId || '-'}
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-semibold">
                        {transaction.paymentMethod}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-right">
                      {formatCurrency(transaction.total)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => setSelectedTransaction(transaction)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded inline-flex items-center gap-1"
                      >
                        <Eye className="w-4 h-4" />
                        <span className="text-xs">Detail</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedTransaction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex items-center justify-between">
              <h2 className="text-2xl font-bold">Detail Transaksi</h2>
              <button
                onClick={() => setSelectedTransaction(null)}
                className="p-2 hover:bg-gray-100 rounded"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Invoice Info */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Invoice Number</p>
                  <p className="font-semibold">{selectedTransaction.invoiceNumber}</p>
                </div>
                <div>
                  <p className="text-gray-500">Tanggal</p>
                  <p className="font-semibold">
                    {formatDateTime(selectedTransaction.createdAt)}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Kasir</p>
                  <p className="font-semibold">
                    {cashiers[selectedTransaction.cashierId]?.fullName || 
                     selectedTransaction.cashierId || '-'}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Metode Pembayaran</p>
                  <p className="font-semibold">{selectedTransaction.paymentMethod}</p>
                </div>
                {selectedTransaction.customerName && (
                  <>
                    <div>
                      <p className="text-gray-500">Nama Pelanggan</p>
                      <p className="font-semibold">{selectedTransaction.customerName}</p>
                    </div>
                    {selectedTransaction.customerPhone && (
                      <div>
                        <p className="text-gray-500">No. Telepon</p>
                        <p className="font-semibold">{selectedTransaction.customerPhone}</p>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Items */}
              <div>
                <h3 className="font-bold mb-3">Items</h3>
                <div className="space-y-2">
                  {selectedTransaction.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex justify-between items-center p-3 bg-gray-50 rounded"
                    >
                      <div>
                        <p className="font-semibold">{item.productName}</p>
                        <p className="text-sm text-gray-500">
                          {item.quantity} x {formatCurrency(item.price)}
                        </p>
                        {item.discount > 0 && (
                          <p className="text-xs text-red-600">
                            Diskon: -{formatCurrency(item.discount)}
                          </p>
                        )}
                      </div>
                      <p className="font-bold">{formatCurrency(item.subtotal)}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Totals */}
              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(selectedTransaction.subtotal)}</span>
                </div>
                {selectedTransaction.tax > 0 && (
                  <div className="flex justify-between text-sm">
                    <span>Pajak:</span>
                    <span>{formatCurrency(selectedTransaction.tax)}</span>
                  </div>
                )}
                {selectedTransaction.discount > 0 && (
                  <div className="flex justify-between text-sm text-red-600">
                    <span>Diskon:</span>
                    <span>-{formatCurrency(selectedTransaction.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-xl font-bold pt-2 border-t">
                  <span>TOTAL:</span>
                  <span>{formatCurrency(selectedTransaction.total)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Bayar:</span>
                  <span>{formatCurrency(selectedTransaction.amountPaid)}</span>
                </div>
                {selectedTransaction.change > 0 && (
                  <div className="flex justify-between text-sm font-semibold">
                    <span>Kembalian:</span>
                    <span>{formatCurrency(selectedTransaction.change)}</span>
                  </div>
                )}
              </div>

              {selectedTransaction.notes && (
                <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                  <p className="text-sm font-semibold mb-1">Catatan:</p>
                  <p className="text-sm text-gray-700">{selectedTransaction.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}