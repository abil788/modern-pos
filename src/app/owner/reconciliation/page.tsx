// src/app/owner/reconciliation/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { Calendar, Wallet, Building2, CreditCard, Smartphone, FileSpreadsheet, TrendingUp, DollarSign, AlertCircle } from 'lucide-react';
import { PAYMENT_METHODS, calculatePaymentSummary } from '@/lib/payment-config';
import { formatCurrency } from '@/lib/utils';
import toast from 'react-hot-toast';

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
      const res = await fetch(`/api/reconciliation?storeId=demo-store&date=${date}&summary=true`);
      const result = await res.json();
      setData(result);
    } catch (error) {
      toast.error('Gagal memuat data rekonsiliasi');
    } finally {
      setLoading(false);
    }
  };

  const handleExportExcel = async () => {
    if (!data) {
      toast.error('Tidak ada data untuk diekspor');
      return;
    }

    try {
      toast.loading('Memuat data transaksi...', { id: 'export' });
      
      const res = await fetch(`/api/reconciliation?storeId=demo-store&date=${date}&summary=false`);
      const fullData = await res.json();
      
      toast.loading('Membuat file Excel...', { id: 'export' });

      const loadXLSX = () => {
        return new Promise((resolve, reject) => {
          if ((window as any).XLSX) {
            resolve((window as any).XLSX);
            return;
          }
          
          const script = document.createElement('script');
          script.src = 'https://cdn.sheetjs.com/xlsx-0.20.1/package/dist/xlsx.full.min.js';
          script.onload = () => resolve((window as any).XLSX);
          script.onerror = reject;
          document.head.appendChild(script);
        });
      };

      const XLSX: any = await loadXLSX();
      
      const wb = XLSX.utils.book_new();
      
      // Sheet 1: Summary per Bank/Channel
      const summaryData = [
        ['LAPORAN REKONSILIASI PEMBAYARAN'],
        ['Tanggal', date],
        ['Total Pendapatan', data.totalRevenue],
        ['Total Transaksi', data.totalTransactions],
        [],
        ['DETAIL PER CHANNEL PEMBAYARAN'],
        ['Metode', 'Channel/Bank', 'Jumlah Transaksi', 'Total (Rp)']
      ];
      
      data.paymentSummary.forEach((summary: any) => {
        summaryData.push([
          summary.methodName,
          summary.channelName,
          summary.count,
          summary.total
        ]);
      });
      
      summaryData.push([]);
      summaryData.push(['RINGKASAN PER METODE']);
      summaryData.push(['Metode', 'Total', 'Jumlah Transaksi']);
      
      Object.entries(data.byMethod).forEach(([method, amount]: [string, any]) => {
        const count = data.paymentSummary
          .filter((s: any) => s.methodId === method)
          .reduce((sum: number, s: any) => sum + s.count, 0);
        summaryData.push([method, amount, count]);
      });
      
      const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, wsSummary, 'Ringkasan');
      
      // Sheet 2: Transactions Detail
      if (fullData.transactions && fullData.transactions.length > 0) {
        const transactionsData = [
          ['DETAIL TRANSAKSI'],
          ['Invoice', 'Tanggal', 'Waktu', 'Metode', 'Channel', 'Kasir', 'Pelanggan', 'Jumlah']
        ];
        
        fullData.transactions.forEach((trx: any) => {
          const channelName = trx.paymentChannel
            ? PAYMENT_METHODS[trx.paymentMethod]?.channels.find(
                (c) => c.id === trx.paymentChannel
              )?.name || trx.paymentChannel
            : PAYMENT_METHODS[trx.paymentMethod]?.name || trx.paymentMethod;
          
          const transDate = new Date(trx.createdAt).toLocaleDateString('id-ID');
          const time = new Date(trx.createdAt).toLocaleTimeString('id-ID', {
            hour: '2-digit',
            minute: '2-digit'
          });
          
          transactionsData.push([
            trx.invoiceNumber,
            transDate,
            time,
            trx.paymentMethod,
            channelName,
            trx.cashier?.fullName || '-',
            trx.customerName || '-',
            trx.total
          ]);
        });
        
        const wsTransactions = XLSX.utils.aoa_to_sheet(transactionsData);
        XLSX.utils.book_append_sheet(wb, wsTransactions, 'Detail Transaksi');
      }
      
      XLSX.writeFile(wb, `Reconciliation_${date}.xlsx`);
      
      toast.success('File Excel berhasil diunduh!', { id: 'export' });
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Gagal export data. Pastikan koneksi internet aktif.', { id: 'export' });
    }
  };

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Group payment summary by method and create complete bank list
  const groupedByMethod: Record<string, any[]> = {};
  
  // Initialize with all available channels from config
  Object.values(PAYMENT_METHODS).forEach(method => {
    groupedByMethod[method.id] = method.channels.map(channel => {
      // Find existing data for this channel
      const existingData = data.paymentSummary.find(
        (s: any) => s.channelId === channel.id
      );
      
      return existingData || {
        channelId: channel.id,
        channelName: channel.name,
        methodId: method.id,
        methodName: method.name,
        count: 0,
        total: 0,
        color: method.bgColor
      };
    });
  });

  // Helper function to get icon
  const getMethodIcon = (methodId: string) => {
    const icons: Record<string, any> = {
      CASH: Wallet,
      TRANSFER: Building2,
      CARD: CreditCard,
      QRIS: Smartphone
    };
    return icons[methodId] || Wallet;
  };

  // Helper function to get color
  const getMethodColor = (methodId: string) => {
    const colors: Record<string, { bg: string; text: string; border: string }> = {
      CASH: { bg: 'from-green-500 to-green-600', text: 'text-green-700', border: 'border-green-200' },
      TRANSFER: { bg: 'from-blue-500 to-blue-600', text: 'text-blue-700', border: 'border-blue-200' },
      CARD: { bg: 'from-purple-500 to-purple-600', text: 'text-purple-700', border: 'border-purple-200' },
      QRIS: { bg: 'from-red-500 to-red-600', text: 'text-red-700', border: 'border-red-200' }
    };
    return colors[methodId] || colors.CASH;
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">
            Rekonsiliasi Pembayaran
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            Tracking detail pendapatan per channel pembayaran & bank
          </p>
        </div>
        <button
          onClick={handleExportExcel}
          className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold flex items-center gap-2 shadow-lg"
        >
          <FileSpreadsheet className="w-5 h-5" />
          Export Excel
        </button>
      </div>

      {/* Date Filter & Summary Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Date Picker */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center gap-3 mb-3">
            <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <label className="font-semibold dark:text-white">Pilih Tanggal</label>
          </div>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full p-3 border dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white font-semibold"
          />
        </div>

        {/* Total Revenue */}
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow p-6 text-white">
          <div className="flex items-center gap-3 mb-2">
            <DollarSign className="w-8 h-8" />
            <div className="flex-1">
              <div className="text-sm opacity-90">Total Pendapatan</div>
              <div className="text-3xl font-bold">
                {formatCurrency(data.totalRevenue)}
              </div>
            </div>
          </div>
        </div>

        {/* Total Transactions */}
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow p-6 text-white">
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className="w-8 h-8" />
            <div className="flex-1">
              <div className="text-sm opacity-90">Total Transaksi</div>
              <div className="text-3xl font-bold">
                {data.totalTransactions}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 p-4 mb-6 rounded">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
          <div className="text-sm text-blue-800 dark:text-blue-200">
            <p className="font-semibold mb-1">💡 Tips Rekonsiliasi</p>
            <p>Setiap bank/channel ditampilkan terpisah untuk memudahkan pengecekan saldo di masing-masing rekening. Channel dengan saldo Rp 0 juga ditampilkan untuk transparansi.</p>
          </div>
        </div>
      </div>

      {/* Payment Details by Method */}
      <div className="space-y-6">
        <h2 className="text-2xl font-bold dark:text-white flex items-center gap-2">
          💰 Detail Saldo per Bank & Channel Pembayaran
        </h2>

        {/* Render each payment method */}
        {Object.entries(groupedByMethod).map(([methodId, channels]) => {
          const Icon = getMethodIcon(methodId);
          const colors = getMethodColor(methodId);
          const totalAmount = channels.reduce((sum, ch) => sum + ch.total, 0);
          const totalCount = channels.reduce((sum, ch) => sum + ch.count, 0);
          
          // Skip if no transactions for this method
          if (totalCount === 0) return null;

          return (
            <div key={methodId} className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
              {/* Header */}
              <div className={`bg-gradient-to-r ${colors.bg} px-6 py-4`}>
                <div className="flex items-center gap-3 text-white">
                  <Icon className="w-6 h-6" />
                  <div className="flex-1">
                    <h3 className="text-xl font-bold">{PAYMENT_METHODS[methodId].name.toUpperCase()}</h3>
                    <p className="text-sm opacity-90">
                      {totalCount} transaksi dari {channels.filter(ch => ch.count > 0).length} channel
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-sm opacity-90">Total {PAYMENT_METHODS[methodId].name}</div>
                    <div className="text-3xl font-bold">
                      {formatCurrency(totalAmount)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Channels Grid */}
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {channels.map((channel) => {
                    const percentage = totalAmount > 0 
                      ? ((channel.total / totalAmount) * 100).toFixed(1)
                      : '0.0';
                    const hasData = channel.count > 0;

                    return (
                      <div
                        key={channel.channelId}
                        className={`border-2 rounded-lg p-4 transition-all ${
                          hasData 
                            ? `${colors.border} dark:border-gray-600 hover:shadow-md bg-white dark:bg-gray-800` 
                            : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 opacity-60'
                        }`}
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex-1">
                            <div className={`text-sm font-semibold ${
                              hasData 
                                ? 'text-gray-800 dark:text-gray-200' 
                                : 'text-gray-500 dark:text-gray-500'
                            }`}>
                              {channel.channelName.replace(/^(Transfer - |Debit - |Credit Card - )/, '')}
                            </div>
                          </div>
                          {hasData ? (
                            <div className={`px-2 py-1 rounded text-xs font-bold ${colors.text} bg-opacity-20`}
                                 style={{ backgroundColor: `${colors.text.replace('text-', 'rgb(var(--')}15)` }}>
                              {channel.count}x
                            </div>
                          ) : (
                            <div className="px-2 py-1 rounded text-xs font-bold text-gray-400 bg-gray-200 dark:bg-gray-800">
                              0x
                            </div>
                          )}
                        </div>
                        
                        <div className={`text-2xl font-bold mb-2 ${
                          hasData 
                            ? 'text-gray-800 dark:text-white' 
                            : 'text-gray-400 dark:text-gray-600'
                        }`}>
                          {formatCurrency(channel.total)}
                        </div>
                        
                        {hasData && (
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full ${colors.bg.includes('green') ? 'bg-green-500' : colors.bg.includes('blue') ? 'bg-blue-500' : colors.bg.includes('purple') ? 'bg-purple-500' : 'bg-red-500'}`}
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                            <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">
                              {percentage}%
                            </span>
                          </div>
                        )}
                        
                        {!hasData && (
                          <div className="text-xs text-gray-400 dark:text-gray-600 italic">
                            Tidak ada transaksi
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* No data message */}
      {data.totalTransactions === 0 && (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-12 text-center">
          <div className="text-gray-400 dark:text-gray-600 mb-4">
            <DollarSign className="w-16 h-16 mx-auto mb-3" />
            <p className="text-xl font-semibold">Tidak ada transaksi</p>
            <p className="text-sm mt-2">Belum ada transaksi pada tanggal {date}</p>
          </div>
        </div>
      )}
    </div>
  );
}