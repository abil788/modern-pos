/* 
 * Kode di atas merupakan komponen React TypeScript untuk sebuah halaman
 * yang menampilkan riwayat transaksi kasir.
 * Komponen ini bertanggung jawab untuk mengambil, menampilkan,
 * dan mengelola data transaksi yang dilakukan oleh kasir.
 */

'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Receipt, Eye, Calendar, DollarSign, ShoppingBag, Filter, ChevronLeft, ChevronRight, Search, X } from 'lucide-react';
import { Transaction } from '@/types';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import toast from 'react-hot-toast';
import { debounce } from 'lodash';
import { getClientStoreId } from '@/lib/store-config';

const ITEMS_PER_PAGE = 20;

export default function KasirHistoryPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [session, setSession] = useState<any>(null);
  
  // Pagination & Filter State
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [filterPeriod, setFilterPeriod] = useState<'today' | 'week' | 'month' | 'all'>('today');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const data = localStorage.getItem('cashier_session');
    if (data) {
      try {
        const parsed = JSON.parse(data);
        setSession(parsed);
      } catch (error) {
        console.error('Failed to parse session:', error);
        router.push('/login');
      }
    } else {
      router.push('/login');
    }
  }, [router]);

  // Debounce search input
  useEffect(() => {
    const handler = debounce(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1); // Reset to first page on search
    }, 500);

    handler();
    return () => handler.cancel();
  }, [searchQuery]);

  useEffect(() => {
    if (session) {
      loadTransactions();
    }
  }, [session, filterPeriod, currentPage, debouncedSearch]);

  const loadTransactions = async () => {
    if (!session) return;

    try {
      setLoading(true);

      const { startDate, endDate } = getDateRange(filterPeriod);
      
      // Build query params
      const params = new URLSearchParams({
        storeId: getClientStoreId(),
        cashierId: session.userId,
        page: currentPage.toString(),
        limit: ITEMS_PER_PAGE.toString(),
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });

      if (debouncedSearch) {
        params.append('search', debouncedSearch);
      }

      const res = await fetch(`/api/transactions?${params}`);
      
      if (!res.ok) throw new Error('Failed to fetch transactions');
      
      const data = await res.json();
      
      setTransactions(data.transactions || []);
      setTotalPages(data.pagination?.totalPages || 1);
      setTotalRecords(data.pagination?.total || 0);
    } catch (error) {
      console.error('Error loading transactions:', error);
      toast.error('Gagal memuat history transaksi');
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  const getDateRange = (period: typeof filterPeriod) => {
    const now = new Date();
    const startDate = new Date(now);
    const endDate = new Date(now);

    switch (period) {
      case 'today':
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'week':
        startDate.setDate(now.getDate() - 7);
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'month':
        startDate.setDate(1);
        startDate.setHours(0, 0, 0, 0);
        endDate.setMonth(now.getMonth() + 1, 0);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'all':
        startDate.setFullYear(2020, 0, 1);
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
        break;
    }

    return { startDate, endDate };
  };

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setDebouncedSearch('');
  };

  // Calculate stats from current transactions
  const stats = useMemo(() => {
    const totalRevenue = transactions.reduce((sum, t) => sum + t.total, 0);
    const totalTransactions = totalRecords; // Use total from server
    const avgTransaction = transactions.length > 0 
      ? transactions.reduce((sum, t) => sum + t.total, 0) / transactions.length 
      : 0;

    return { totalRevenue, totalTransactions, avgTransaction };
  }, [transactions, totalRecords]);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">
          History Transaksi Saya
        </h1>
        <p className="text-gray-500 dark:text-gray-400">
          Riwayat transaksi yang saya tangani
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <ShoppingBag className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-gray-500 dark:text-gray-400 text-sm">Total Transaksi</p>
              <p className="text-3xl font-bold dark:text-white">{stats.totalTransactions}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-green-100 dark:bg-green-900 rounded-lg">
              <DollarSign className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-gray-500 dark:text-gray-400 text-sm">Total Pendapatan</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                {formatCurrency(stats.totalRevenue)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-lg">
              <Receipt className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-gray-500 dark:text-gray-400 text-sm">Rata-rata Transaksi</p>
              <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {formatCurrency(stats.avgTransaction)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter & Search */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-6 space-y-4">
        {/* Period Filter */}
        <div className="flex items-center gap-3">
          <Filter className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          <div className="flex gap-2 flex-wrap">
            {(['today', 'week', 'month', 'all'] as const).map((period) => (
              <button
                key={period}
                onClick={() => {
                  setFilterPeriod(period);
                  setCurrentPage(1);
                }}
                className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                  filterPeriod === period
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {period === 'today' && 'Hari Ini'}
                {period === 'week' && '7 Hari'}
                {period === 'month' && 'Bulan Ini'}
                {period === 'all' && 'Semua'}
              </button>
            ))}
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Cari invoice, nama pelanggan, atau nomor telepon..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-10 py-3 border dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          />
          {searchQuery && (
            <button
              onClick={handleClearSearch}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          )}
        </div>

        {debouncedSearch && (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Mencari: "{debouncedSearch}" - {totalRecords} hasil
          </p>
        )}
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
                  <td colSpan={6} className="px-6 py-8 text-center">
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                    <Receipt className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                    <p>Tidak ada transaksi ditemukan</p>
                  </td>
                </tr>
              ) : (
                transactions.map((transaction) => (
                  <tr key={transaction.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 text-sm font-medium text-blue-600">
                      {transaction.invoiceNumber}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        {formatDateTime(transaction.createdAt)}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                      {transaction.customerName || '-'}
                      {transaction.customerPhone && (
                        <div className="text-xs text-gray-400">
                          {transaction.customerPhone}
                        </div>
                      )}
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

        {/* Server-Side Pagination */}
        {!loading && transactions.length > 0 && (
          <div className="px-6 py-4 border-t dark:border-gray-700 flex items-center justify-between">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Halaman {currentPage} dari {totalPages} ({totalRecords} total transaksi)
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="p-2 rounded-lg border dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-1">
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
                      onClick={() => goToPage(pageNum)}
                      className={`px-3 py-1 rounded-lg ${
                        currentPage === pageNum
                          ? 'bg-blue-600 text-white'
                          : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg border dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detail Modal (same as before) */}
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
                      </div>
                      <p className="font-bold dark:text-white">{formatCurrency(item.subtotal)}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t dark:border-gray-700 pt-4 space-y-2">
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
                  <div className="flex justify-between text-sm text-red-600">
                    <span>Diskon:</span>
                    <span>-{formatCurrency(selectedTransaction.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-xl font-bold pt-2 border-t dark:border-gray-700">
                  <span className="dark:text-white">TOTAL:</span>
                  <span className="text-blue-600 dark:text-blue-400">{formatCurrency(selectedTransaction.total)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}