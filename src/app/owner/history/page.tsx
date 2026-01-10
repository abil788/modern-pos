'use client';

import { useState, useEffect } from 'react';
import { Receipt, Eye, Search, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { Transaction } from '@/types';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import toast from 'react-hot-toast';

interface Cashier {
  id: string;
  fullName: string;
  email: string;
}

const ITEMS_PER_PAGE = 10;

export default function HistoryPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [cashiers, setCashiers] = useState<Record<string, Cashier>>({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [dateFilter, setDateFilter] = useState('all');
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    loadTransactions();
    loadCashiers();
  }, [currentPage, searchQuery, dateFilter]);

  const loadTransactions = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        storeId: 'demo-store',
        page: currentPage.toString(),
        limit: ITEMS_PER_PAGE.toString(),
      });

      // Add date filter
      if (dateFilter !== 'all') {
        const { startDate, endDate } = getDateRange(dateFilter);
        params.append('startDate', startDate.toISOString());
        params.append('endDate', endDate.toISOString());
      }

      const res = await fetch(`/api/transactions?${params}`);
      const data = await res.json();
      
      if (data.transactions && Array.isArray(data.transactions)) {
        // Filter by search on client-side after receiving paginated data
        let filtered = data.transactions;
        if (searchQuery) {
          filtered = filtered.filter((t: Transaction) =>
            t.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
            t.customerName?.toLowerCase().includes(searchQuery.toLowerCase())
          );
        }
        
        setTransactions(filtered);
        setTotalPages(data.pagination?.totalPages || 1);
        setTotalCount(data.pagination?.totalCount || 0);
      } else if (Array.isArray(data)) {
        setTransactions(data);
      } else {
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
        const cashierMap = data.reduce((acc: Record<string, Cashier>, cashier: Cashier) => {
          acc[cashier.id] = cashier;
          return acc;
        }, {});
        setCashiers(cashierMap);
      }
    } catch (error) {
      console.error('Failed to load cashiers:', error);
    }
  };

  const getDateRange = (filter: string) => {
    const now = new Date();
    let startDate = new Date();
    let endDate = new Date();

    if (filter === 'today') {
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
    } else if (filter === 'week') {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      startDate.setHours(0, 0, 0, 0);
    } else if (filter === 'month') {
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      startDate.setHours(0, 0, 0, 0);
    }

    return { startDate, endDate };
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  const handleDateFilterChange = (value: string) => {
    setDateFilter(value);
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const totalRevenue = transactions.reduce((sum, t) => sum + t.total, 0);
  const avgTransaction = transactions.length > 0 ? totalRevenue / transactions.length : 0;

  // Filter transactions based on search query
  const filteredTransactions = searchQuery
    ? transactions.filter((t) =>
        t.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.customerName?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : transactions;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">History Transaksi</h1>
        <p className="text-gray-500 dark:text-gray-400">
          Riwayat semua transaksi penjualan • Total: {totalCount} transaksi
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Cari invoice atau pelanggan..."
              className="w-full pl-10 pr-4 py-2 border dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
            />
          </div>

          {/* Date Filter */}
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            <select
              value={dateFilter}
              onChange={(e) => handleDateFilterChange(e.target.value)}
              className="flex-1 p-2 border dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
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
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-1">Total Transaksi</p>
          <p className="text-3xl font-bold dark:text-white">{transactions.length}</p>
          <p className="text-xs text-gray-400 mt-1">Halaman {currentPage}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-1">Total Pendapatan</p>
          <p className="text-3xl font-bold text-green-600 dark:text-green-400">
            {formatCurrency(totalRevenue)}
          </p>
          <p className="text-xs text-gray-400 mt-1">Halaman {currentPage}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-1">Rata-rata Transaksi</p>
          <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
            {formatCurrency(avgTransaction)}
          </p>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                  Invoice
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                  Tanggal & Waktu
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                  Pelanggan
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                  Kasir
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                  Metode
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                  Total
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
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
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                    <Receipt className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                    <p>Tidak ada transaksi</p>
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((transaction) => (
                  <tr key={transaction.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 text-sm font-medium text-blue-600 dark:text-blue-400">
                      {transaction.invoiceNumber}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                      {formatDateTime(transaction.createdAt)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                      {transaction.customerName || '-'}
                      {transaction.customerPhone && (
                        <div className="text-xs text-gray-400">
                          {transaction.customerPhone}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-400 font-semibold text-xs">
                          {cashiers[transaction.cashierId]?.fullName?.charAt(0).toUpperCase() || 'K'}
                        </div>
                        <div>
                          <p className="font-medium dark:text-white">
                            {cashiers[transaction.cashierId]?.fullName || 'Kasir'}
                          </p>
                          <p className="text-xs text-gray-400">
                            {cashiers[transaction.cashierId]?.email || ''}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-xs font-semibold">
                        {transaction.paymentMethod}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-right dark:text-white">
                      {formatCurrency(transaction.total)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => setSelectedTransaction(transaction)}
                        className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900 rounded inline-flex items-center gap-1"
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

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-gray-50 dark:bg-gray-700 px-6 py-4 border-t dark:border-gray-600">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Halaman {currentPage} dari {totalPages} • Total {totalCount} transaksi
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="px-3 py-2 border dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed dark:text-white"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                
                {/* Page numbers */}
                <div className="flex gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    
                    return (
                      <button
                        key={pageNum}
                        onClick={() => handlePageChange(pageNum)}
                        className={`px-3 py-2 border dark:border-gray-600 rounded-lg ${
                          currentPage === pageNum
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'hover:bg-gray-100 dark:hover:bg-gray-600 dark:text-white'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="px-3 py-2 border dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed dark:text-white"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Detail Modal */}
      {selectedTransaction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-2xl font-bold dark:text-white">Detail Transaksi</h2>
              <button
                onClick={() => setSelectedTransaction(null)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Invoice Info */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500 dark:text-gray-400">Invoice Number</p>
                  <p className="font-semibold dark:text-white">{selectedTransaction.invoiceNumber}</p>
                </div>
                <div>
                  <p className="text-gray-500 dark:text-gray-400">Tanggal</p>
                  <p className="font-semibold dark:text-white">
                    {formatDateTime(selectedTransaction.createdAt)}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 dark:text-gray-400">Kasir</p>
                  <p className="font-semibold dark:text-white">
                    {cashiers[selectedTransaction.cashierId]?.fullName || 'Kasir'}
                  </p>
                  <p className="text-xs text-gray-400">
                    {cashiers[selectedTransaction.cashierId]?.email || ''}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 dark:text-gray-400">Metode Pembayaran</p>
                  <p className="font-semibold dark:text-white">{selectedTransaction.paymentMethod}</p>
                </div>
                {selectedTransaction.customerName && (
                  <>
                    <div>
                      <p className="text-gray-500 dark:text-gray-400">Nama Pelanggan</p>
                      <p className="font-semibold dark:text-white">{selectedTransaction.customerName}</p>
                    </div>
                    {selectedTransaction.customerPhone && (
                      <div>
                        <p className="text-gray-500 dark:text-gray-400">No. Telepon</p>
                        <p className="font-semibold dark:text-white">{selectedTransaction.customerPhone}</p>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Items */}
              <div>
                <h3 className="font-bold mb-3 dark:text-white">Items</h3>
                <div className="space-y-2">
                  {selectedTransaction.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded"
                    >
                      <div>
                        <p className="font-semibold dark:text-white">{item.productName}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {item.quantity} x {formatCurrency(item.price)}
                        </p>
                        {item.discount > 0 && (
                          <p className="text-xs text-red-600 dark:text-red-400">
                            Diskon: -{formatCurrency(item.discount)}
                          </p>
                        )}
                      </div>
                      <p className="font-bold dark:text-white">{formatCurrency(item.subtotal)}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Totals */}
              <div className="border-t dark:border-gray-600 pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="dark:text-gray-400">Subtotal:</span>
                  <span className="dark:text-white">{formatCurrency(selectedTransaction.subtotal)}</span>
                </div>
                {selectedTransaction.tax > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="dark:text-gray-400">Pajak:</span>
                    <span className="dark:text-white">{formatCurrency(selectedTransaction.tax)}</span>
                  </div>
                )}
                {selectedTransaction.discount > 0 && (
                  <div className="flex justify-between text-sm text-red-600 dark:text-red-400">
                    <span>Diskon:</span>
                    <span>-{formatCurrency(selectedTransaction.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-xl font-bold pt-2 border-t dark:border-gray-600">
                  <span className="dark:text-white">TOTAL:</span>
                  <span className="dark:text-white">{formatCurrency(selectedTransaction.total)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="dark:text-gray-400">Bayar:</span>
                  <span className="dark:text-white">{formatCurrency(selectedTransaction.amountPaid)}</span>
                </div>
                {selectedTransaction.change > 0 && (
                  <div className="flex justify-between text-sm font-semibold">
                    <span className="dark:text-white">Kembalian:</span>
                    <span className="dark:text-white">{formatCurrency(selectedTransaction.change)}</span>
                  </div>
                )}
              </div>

              {selectedTransaction.notes && (
                <div className="bg-yellow-50 dark:bg-yellow-900 border border-yellow-200 dark:border-yellow-700 rounded p-3">
                  <p className="text-sm font-semibold mb-1 dark:text-white">Catatan:</p>
                  <p className="text-sm text-gray-700 dark:text-gray-300">{selectedTransaction.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}