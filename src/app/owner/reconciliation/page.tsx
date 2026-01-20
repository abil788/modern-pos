// src/app/owner/reconciliation/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { TrendingUp, Download, Calendar, DollarSign, CheckCircle, Wallet, Building2, CreditCard, Smartphone } from 'lucide-react';
import { PAYMENT_METHODS, calculatePaymentSummary } from '@/lib/payment-config';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import toast from 'react-hot-toast';

// Icon mapping helper
const getIconComponent = (methodId: string) => {
  const icons: Record<string, any> = {
    CASH: Wallet,
    TRANSFER: Building2,
    CARD: CreditCard,
    QRIS: Smartphone
  };
  return icons[methodId] || Wallet;
};

export default function ReconciliationPage() {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadReconciliation();
  }, [date]);

  const loadReconciliation = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/reconciliation?storeId=demo-store&date=${date}`);
      const result = await res.json();
      setData(result);
    } catch (error) {
      toast.error('Gagal memuat data rekonsilasi');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    // TODO: Implement Excel export
    toast.success('Export Excel akan segera tersedia');
  };

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">
            Rekonsilasi Pembayaran
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            Tracking detail pendapatan per channel pembayaran
          </p>
        </div>
        <button
          onClick={handleExport}
          className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold flex items-center gap-2"
        >
          <Download className="w-5 h-5" />
          Export Excel
        </button>
      </div>

      {/* Date Filter */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-6">
        <div className="flex items-center gap-4">
          <Calendar className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="p-2 border dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
          />
          <div className="flex-1"></div>
          <div className="text-right">
            <div className="text-sm text-gray-500 dark:text-gray-400">Total Pendapatan</div>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {formatCurrency(data.totalRevenue)}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {data.totalTransactions} transaksi
            </div>
          </div>
        </div>
      </div>

      {/* Payment Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {data.paymentSummary.map((summary: any) => {
          const IconComponent = getIconComponent(summary.methodId);
          const percentage = ((summary.total / data.totalRevenue) * 100).toFixed(1);

          return (
            <div
              key={summary.channelId}
              className="bg-white dark:bg-gray-800 rounded-lg border-2 border-gray-200 dark:border-gray-700 p-5 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div className={`${summary.color} text-white p-3 rounded-lg`}>
                  <IconComponent className="w-6 h-6" />
                </div>
                <div className="text-right">
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {summary.methodName}
                  </div>
                  <div className="text-sm font-semibold text-gray-600 dark:text-gray-300">
                    {summary.count}x
                  </div>
                </div>
              </div>

              <h3 className="font-bold text-gray-800 dark:text-white mb-1">
                {summary.channelName}
              </h3>
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-2">
                {formatCurrency(summary.total)}
              </div>

              <div className="flex items-center gap-2">
                <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className={`${summary.color} h-2 rounded-full transition-all`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">
                  {percentage}%
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Transactions Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="bg-gray-50 dark:bg-gray-700 px-6 py-4 border-b dark:border-gray-600">
          <h3 className="font-bold text-lg dark:text-white">
            Rincian Transaksi per Channel
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700 border-b dark:border-gray-600">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">
                  Invoice
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">
                  Waktu
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">
                  Channel
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">
                  Kasir
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">
                  Reference
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">
                  Jumlah
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {data.transactions.map((trx: any) => {
                const channelName = trx.paymentChannel
                  ? PAYMENT_METHODS[trx.paymentMethod]?.channels.find(
                      (c) => c.id === trx.paymentChannel
                    )?.name || trx.paymentChannel
                  : trx.paymentMethod;

                return (
                  <tr key={trx.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 text-sm font-medium text-blue-600 dark:text-blue-400">
                      {trx.invoiceNumber}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                      {new Date(trx.createdAt).toLocaleTimeString('id-ID', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-xs font-semibold">
                        {channelName}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                      {trx.cashier?.fullName}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300 font-mono">
                      {trx.paymentReference || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-right text-gray-800 dark:text-white">
                      {formatCurrency(trx.total)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
