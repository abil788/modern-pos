'use client';

import { useState, useEffect } from 'react';
import { TrendingUp, Package, DollarSign, ShoppingBag, AlertTriangle } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// Types
interface TopProduct {
  id: string;
  name: string;
  totalSold: number;
  revenue: number;
}

interface RevenueChartData {
  date: string;
  revenue: number;
}

interface DashboardStats {
  todayRevenue: number;
  todayTransactions: number;
  todayProfit: number;
  lowStockProducts: number;
  topProducts: TopProduct[];
  revenueChart: RevenueChartData[];
}

// Format currency
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount);
};

// Format date
const formatDate = (date: string): string => {
  return new Date(date).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
  });
};

export default function OwnerDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [period, setPeriod] = useState<'today' | 'week' | 'month'>('today');

  useEffect(() => {
    loadDashboardStats();
  }, [period]);

  const loadDashboardStats = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/dashboard?storeId=demo-store&period=${period}`);
      const data: DashboardStats = await res.json();
      console.log('Dashboard data:', data);
      setStats(data);
    } catch (error) {
      console.error('Error loading dashboard:', error);
      // Set empty stats on error
      setStats({
        todayRevenue: 0,
        todayTransactions: 0,
        todayProfit: 0,
        lowStockProducts: 0,
        topProducts: [],
        revenueChart: [],
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const todayRevenue = stats?.todayRevenue || 0;
  const todayTransactions = stats?.todayTransactions || 0;
  const todayProfit = stats?.todayProfit || 0;
  const lowStockProducts = stats?.lowStockProducts || 0;
  const topProducts = stats?.topProducts || [];
  const revenueChart = stats?.revenueChart || [];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">Dashboard Owner</h1>
        <div className="flex gap-2">
          {(['today', 'week', 'month'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                period === p
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {p === 'today' && 'Hari Ini'}
              {p === 'week' && 'Minggu Ini'}
              {p === 'month' && 'Bulan Ini'}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <DollarSign className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <span className="flex items-center text-green-600 text-sm font-semibold">
              <TrendingUp className="w-4 h-4 mr-1" />
              +12%
            </span>
          </div>
          <h3 className="text-gray-500 dark:text-gray-400 text-sm mb-1">Pendapatan</h3>
          <p className="text-2xl font-bold dark:text-white">{formatCurrency(todayRevenue)}</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-green-100 dark:bg-green-900 rounded-lg">
              <ShoppingBag className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <span className="flex items-center text-green-600 text-sm font-semibold">
              <TrendingUp className="w-4 h-4 mr-1" />
              +8%
            </span>
          </div>
          <h3 className="text-gray-500 dark:text-gray-400 text-sm mb-1">Transaksi</h3>
          <p className="text-2xl font-bold dark:text-white">{todayTransactions}</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-lg">
              <TrendingUp className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <span className="flex items-center text-green-600 text-sm font-semibold">
              <TrendingUp className="w-4 h-4 mr-1" />
              +15%
            </span>
          </div>
          <h3 className="text-gray-500 dark:text-gray-400 text-sm mb-1">Profit</h3>
          <p className="text-2xl font-bold dark:text-white">{formatCurrency(todayProfit)}</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-red-100 dark:bg-red-900 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
          </div>
          <h3 className="text-gray-500 dark:text-gray-400 text-sm mb-1">Stok Menipis</h3>
          <p className="text-2xl font-bold text-red-600 dark:text-red-400">{lowStockProducts}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Produk perlu restock</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Revenue Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4 dark:text-white">Grafik Pendapatan</h3>
          {revenueChart.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={revenueChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={formatDate}
                  stroke="#9CA3AF"
                />
                <YAxis 
                  tickFormatter={(value: number) => `${(value / 1000).toFixed(0)}K`}
                  stroke="#9CA3AF"
                />
                <Tooltip 
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{ 
                    backgroundColor: '#1F2937', 
                    border: 'none', 
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#3B82F6" 
                  strokeWidth={3}
                  dot={{ fill: '#3B82F6', r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-gray-400">
              <div className="text-center">
                <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Belum ada data transaksi</p>
              </div>
            </div>
          )}
        </div>

        {/* Top Products */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4 dark:text-white">Produk Terlaris</h3>
          {topProducts.length > 0 ? (
            <div className="space-y-4">
              {topProducts.slice(0, 5).map((product: TopProduct, index: number) => (
                <div key={product.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center font-bold text-blue-600 dark:text-blue-400">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-semibold dark:text-white">{product.name}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{product.totalSold} terjual</p>
                    </div>
                  </div>
                  <p className="font-bold text-green-600 dark:text-green-400">{formatCurrency(product.revenue)}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-[260px] flex items-center justify-center text-gray-400">
              <div className="text-center">
                <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Belum ada data penjualan</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="p-6 border-b dark:border-gray-700">
          <h3 className="text-lg font-semibold dark:text-white">Transaksi Terakhir</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Invoice</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Tanggal</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Pelanggan</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Metode</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {[1, 2, 3, 4, 5].map((i) => (
                <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 text-sm font-medium dark:text-white">INV-20250103-000{i}</td>
                  <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                    {new Date().toLocaleDateString('id-ID')}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">-</td>
                  <td className="px-6 py-4 text-sm">
                    <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-xs">
                      CASH
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm font-semibold text-right dark:text-white">
                    {formatCurrency(50000 * i)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}