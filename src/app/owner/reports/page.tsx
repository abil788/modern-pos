/* 
 * Kode di atas merupakan komponen React TypeScript
 * untuk halaman laporan (Reports Page).
 * Komponen ini digunakan untuk menampilkan laporan transaksi
 * berdasarkan berbagai filter seperti tanggal, metode pembayaran,
 * dan kasir, serta menyajikan ringkasan data seperti total pendapatan,
 * jumlah transaksi, pajak, diskon, keuntungan, dan grafik laporan.
 */
'use client';

import { useState, useEffect } from 'react';
import { Download, FileText, Calendar, TrendingUp, DollarSign, ShoppingBag, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Transaction } from '@/types';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { exportTransactionsPDF, exportTransactionsExcel, downloadPDF, downloadExcel } from '@/lib/export';
import toast from 'react-hot-toast';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];
const ITEMS_PER_PAGE = 5;

export default function ReportsPage() {
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [filterType, setFilterType] = useState<'today' | 'week' | 'month' | 'custom'>('today');
  
  // Pagination state for transactions table
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    setDateByFilter(filterType);
  }, [filterType]);

  useEffect(() => {
    if (startDate && endDate) {
      loadReport();
    }
  }, [startDate, endDate]);

  const setDateByFilter = (type: typeof filterType) => {
    const now = new Date();
    let start = new Date();
    let end = new Date();

    switch (type) {
      case 'today':
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        break;
      case 'week':
        start.setDate(now.getDate() - 7);
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        break;
      case 'month':
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
        end.setMonth(now.getMonth() + 1, 0);
        end.setHours(23, 59, 59, 999);
        break;
    }

    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(end.toISOString().split('T')[0]);
  };

  const loadReport = async () => {
    try {
      setLoading(true);
      
      // Load report data
      const reportRes = await fetch(
        `/api/reports?storeId=demo-store&type=${filterType}&startDate=${startDate}&endDate=${endDate}`
      );
      const reportData = await reportRes.json();
      
      // Load transactions for export
      const transRes = await fetch(
        `/api/transactions?storeId=demo-store&startDate=${startDate}&endDate=${endDate}&limit=1000`
      );
      const transData = await transRes.json();
      
      // Handle new API response format
      const allTransactions = transData.transactions || transData;
      
      setReportData({
        ...reportData,
        fullTransactions: allTransactions,
      });
      
      // Calculate total pages for transactions table
      const totalCount = reportData.transactions?.length || 0;
      setTotalPages(Math.ceil(totalCount / ITEMS_PER_PAGE));
      setCurrentPage(1); // Reset to first page
    } catch (error) {
      toast.error('Gagal memuat laporan');
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = () => {
    try {
      const doc = exportTransactionsPDF(
        reportData.fullTransactions,
        'Toko Modern',
        { start: new Date(startDate), end: new Date(endDate) }
      );
      downloadPDF(doc, `laporan-${startDate}-${endDate}.pdf`);
      toast.success('PDF berhasil diexport!');
    } catch (error) {
      toast.error('Gagal export PDF');
    }
  };

  const handleExportExcel = () => {
    try {
      const wb = exportTransactionsExcel(
        reportData.fullTransactions,
        'Toko Modern',
        { start: new Date(startDate), end: new Date(endDate) }
      );
      downloadExcel(wb, `laporan-${startDate}-${endDate}.xlsx`);
      toast.success('Excel berhasil diexport!');
    } catch (error) {
      toast.error('Gagal export Excel');
    }
  };

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      // Scroll to table
      document.getElementById('transactions-table')?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const summary = reportData?.summary || {};
  const byPaymentMethod = reportData?.byPaymentMethod || {};
  const topProducts = reportData?.topProducts || [];
  const chartData = reportData?.chartData || [];
  const allTransactions = reportData?.transactions || [];

  // Paginate transactions
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedTransactions = allTransactions.slice(startIndex, endIndex);

  // Prepare payment method chart data
  const paymentChartData = Object.entries(byPaymentMethod).map(([method, data]: [string, any]) => ({
    name: method,
    value: data.total,
    count: data.count,
  }));

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">Laporan Penjualan</h1>
        <p className="text-gray-500 dark:text-gray-400">Analisis transaksi dan pendapatan toko</p>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
        <div className="flex items-center gap-4 mb-4">
          <Filter className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          <h3 className="font-semibold dark:text-white">Filter Periode</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          {(['today', 'week', 'month', 'custom'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-4 py-2 rounded-lg font-semibold ${
                filterType === type
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {type === 'today' && 'Hari Ini'}
              {type === 'week' && '7 Hari Terakhir'}
              {type === 'month' && 'Bulan Ini'}
              {type === 'custom' && 'Custom'}
            </button>
          ))}
        </div>

        {filterType === 'custom' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-1 dark:text-white">Tanggal Mulai</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full p-2 border dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1 dark:text-white">Tanggal Akhir</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full p-2 border dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>
        )}
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-green-100 dark:bg-green-900 rounded-lg">
              <DollarSign className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
          <h3 className="text-gray-500 dark:text-gray-400 text-sm mb-1">Total Pendapatan</h3>
          <p className="text-2xl font-bold dark:text-white">{formatCurrency(summary.totalRevenue || 0)}</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <ShoppingBag className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <h3 className="text-gray-500 dark:text-gray-400 text-sm mb-1">Total Transaksi</h3>
          <p className="text-2xl font-bold dark:text-white">{summary.totalTransactions || 0}</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-lg">
              <TrendingUp className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
          <h3 className="text-gray-500 dark:text-gray-400 text-sm mb-1">Rata-rata Transaksi</h3>
          <p className="text-2xl font-bold dark:text-white">{formatCurrency(summary.averageTransaction || 0)}</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-orange-100 dark:bg-orange-900 rounded-lg">
              <FileText className="w-6 h-6 text-orange-600 dark:text-orange-400" />
            </div>
          </div>
          <h3 className="text-gray-500 dark:text-gray-400 text-sm mb-1">Total Profit</h3>
          <p className="text-2xl font-bold dark:text-white">{formatCurrency(summary.totalProfit || 0)}</p>
        </div>
      </div>

      {/* Export Buttons */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
        <h3 className="font-semibold mb-4 dark:text-white">Export Laporan</h3>
        <div className="flex gap-4">
          <button
            onClick={handleExportPDF}
            disabled={!reportData?.fullTransactions?.length}
            className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            <Download className="w-5 h-5" />
            Export PDF
          </button>
          <button
            onClick={handleExportExcel}
            disabled={!reportData?.fullTransactions?.length}
            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            <Download className="w-5 h-5" />
            Export Excel
          </button>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Revenue Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4 dark:text-white">Grafik Pendapatan</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip 
                formatter={(value: any) => formatCurrency(Number(value))}
                contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '8px' }}
              />
              <Legend />
              <Line type="monotone" dataKey="revenue" stroke="#3B82F6" strokeWidth={2} name="Pendapatan" />
              <Line type="monotone" dataKey="profit" stroke="#10B981" strokeWidth={2} name="Profit" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Payment Methods */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4 dark:text-white">Metode Pembayaran</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={paymentChartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={(entry) => `${entry.name}: ${entry.count}x`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {paymentChartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: any) => formatCurrency(Number(value))} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Top Products */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4 dark:text-white">Produk Terlaris</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={topProducts.slice(0, 5)}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
              <YAxis />
              <Tooltip formatter={(value: any) => formatCurrency(Number(value))} />
              <Bar dataKey="revenue" fill="#3B82F6" name="Pendapatan" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Transaction Volume */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4 dark:text-white">Volume Transaksi</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="transactions" fill="#10B981" name="Jumlah Transaksi" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Transactions Table */}
      <div id="transactions-table" className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="p-6 border-b dark:border-gray-700">
          <h3 className="text-lg font-semibold dark:text-white">
            Detail Transaksi • Total: {allTransactions.length} transaksi
          </h3>
        </div>
        
        {!allTransactions?.length ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            <FileText className="w-12 h-12 mx-auto mb-2 text-gray-300" />
            <p>Tidak ada transaksi pada periode ini</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                      Invoice
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                      Tanggal
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                      Pelanggan
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                      Metode
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                      Items
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {paginatedTransactions.map((transaction: any) => (
                    <tr key={transaction.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 text-sm font-medium dark:text-white">
                        {transaction.invoiceNumber}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                        {formatDateTime(transaction.createdAt)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                        {transaction.customerName || '-'}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-xs">
                          {transaction.paymentMethod}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                        {transaction.itemCount} items
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-right dark:text-white">
                        {formatCurrency(transaction.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="bg-gray-50 dark:bg-gray-700 px-6 py-4 border-t dark:border-gray-600">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Halaman {currentPage} dari {totalPages} • Menampilkan {startIndex + 1}-{Math.min(endIndex, allTransactions.length)} dari {allTransactions.length} transaksi
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
          </>
        )}
      </div>
    </div>
  );
}