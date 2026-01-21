// src/app/owner/reconciliation/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { Download, Calendar, Wallet, Building2, CreditCard, Smartphone, CheckCircle, AlertCircle, FileSpreadsheet } from 'lucide-react';
import { PAYMENT_METHODS, calculatePaymentSummary } from '@/lib/payment-config';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import toast from 'react-hot-toast';

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
  
  // Cash verification state
  const [showCashVerification, setShowCashVerification] = useState(false);
  const [actualCash, setActualCash] = useState('');
  const [verificationNotes, setVerificationNotes] = useState('');
  const [submittingVerification, setSubmittingVerification] = useState(false);

  useEffect(() => {
    loadReconciliation();
  }, [date]);

  const loadReconciliation = async () => {
    try {
      setLoading(true);
      // Only load summary, don't load transactions (remove transactions from response)
      const res = await fetch(`/api/reconciliation?storeId=demo-store&date=${date}&summary=true`);
      const result = await res.json();
      setData(result);
    } catch (error) {
      toast.error('Gagal memuat data rekonsilasi');
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
      
      // Load full transactions for export (separate request)
      const res = await fetch(`/api/reconciliation?storeId=demo-store&date=${date}&summary=false`);
      const fullData = await res.json();
      
      toast.loading('Membuat file Excel...', { id: 'export' });

      // Load XLSX from CDN dynamically
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
      
      // Create workbook
      const wb = XLSX.utils.book_new();
      
      // Sheet 1: Summary
      const summaryData = [
        ['LAPORAN REKONSILASI PEMBAYARAN'],
        ['Tanggal', date],
        ['Total Pendapatan', data.totalRevenue],
        ['Total Transaksi', data.totalTransactions],
        [],
        ['RINGKASAN PER METODE PEMBAYARAN'],
        ['Metode', 'Total', 'Jumlah Transaksi']
      ];
      
      Object.entries(data.byMethod).forEach(([method, amount]: [string, any]) => {
        const count = data.paymentSummary
          .filter((s: any) => s.methodId === method)
          .reduce((sum: number, s: any) => sum + s.count, 0);
        summaryData.push([method, amount, count]);
      });
      
      summaryData.push([]);
      summaryData.push(['RINGKASAN PER CHANNEL']);
      summaryData.push(['Channel', 'Metode', 'Jumlah Transaksi', 'Total']);
      
      data.paymentSummary.forEach((summary: any) => {
        summaryData.push([
          summary.channelName,
          summary.methodName,
          summary.count,
          summary.total
        ]);
      });
      
      const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, wsSummary, 'Ringkasan');
      
      // Sheet 2: Transactions Detail (from fullData)
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
      
      // Generate Excel file
      XLSX.writeFile(wb, `Reconciliation_${date}.xlsx`);
      
      toast.success('File Excel berhasil diunduh!', { id: 'export' });
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Gagal export data. Pastikan koneksi internet aktif.', { id: 'export' });
    }
  };

  const handleCashVerification = async () => {
    if (!actualCash) {
      toast.error('Masukkan jumlah uang fisik di laci kasir');
      return;
    }

    const expectedCash = data.byMethod.CASH || 0;
    const difference = parseFloat(actualCash) - expectedCash;
    
    if (Math.abs(difference) > 10000) {
      if (!confirm(`Terdapat selisih ${formatCurrency(Math.abs(difference))}. Yakin ingin lanjut verifikasi?`)) {
        return;
      }
    }

    try {
      setSubmittingVerification(true);

      // TODO: Save verification to database via API
      const verificationData = {
        date,
        expectedCash,
        actualCash: parseFloat(actualCash),
        difference,
        notes: verificationNotes,
        verifiedAt: new Date().toISOString(),
        verifiedBy: 'demo-user' // TODO: Get from session
      };

      console.log('Cash verification:', verificationData);
      
      toast.success('Verifikasi kas berhasil disimpan!');
      setShowCashVerification(false);
      setActualCash('');
      setVerificationNotes('');
      
    } catch (error) {
      toast.error('Gagal menyimpan verifikasi');
    } finally {
      setSubmittingVerification(false);
    }
  };

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const expectedCash = data.byMethod.CASH || 0;
  const cashDifference = actualCash ? parseFloat(actualCash) - expectedCash : 0;

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
          onClick={handleExportExcel}
          className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold flex items-center gap-2"
        >
          <FileSpreadsheet className="w-5 h-5" />
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

      {/* Payment Summary Cards - All Channels */}
      <div className="mb-6">
        <h2 className="text-xl font-bold dark:text-white mb-4">💰 Saldo per Channel Pembayaran</h2>
        
        {/* Only show sections that have data */}
        {data.paymentSummary.filter((s: any) => s.methodId === 'CASH').length > 0 && (
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-3 flex items-center gap-2">
              <Wallet className="w-4 h-4" />
              TUNAI (CASH)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {data.paymentSummary
                .filter((s: any) => s.methodId === 'CASH')
                .map((summary: any) => {
                  const percentage = ((summary.total / data.totalRevenue) * 100).toFixed(1);
                  return (
                    <div
                      key={summary.channelId}
                      className="bg-white dark:bg-gray-800 rounded-lg border-2 border-gray-200 dark:border-gray-700 p-5 hover:shadow-lg transition-shadow"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="bg-green-500 text-white p-3 rounded-lg">
                          <Wallet className="w-6 h-6" />
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
                      <h4 className="font-bold text-gray-800 dark:text-white mb-1">
                        {summary.channelName}
                      </h4>
                      <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-2">
                        {formatCurrency(summary.total)}
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div
                            className="bg-green-500 h-2 rounded-full transition-all"
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
          </div>
        )}

        {/* Transfer Bank */}
        {data.paymentSummary.filter((s: any) => s.methodId === 'TRANSFER').length > 0 && (
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-3 flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              TRANSFER BANK
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {data.paymentSummary
                .filter((s: any) => s.methodId === 'TRANSFER')
                .map((summary: any) => {
                  const percentage = ((summary.total / data.totalRevenue) * 100).toFixed(1);
                  return (
                    <div
                      key={summary.channelId}
                      className="bg-white dark:bg-gray-800 rounded-lg border-2 border-gray-200 dark:border-gray-700 p-5 hover:shadow-lg transition-shadow"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="bg-blue-500 text-white p-3 rounded-lg">
                          <Building2 className="w-6 h-6" />
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
                      <h4 className="font-bold text-gray-800 dark:text-white mb-1">
                        {summary.channelName}
                      </h4>
                      <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-2">
                        {formatCurrency(summary.total)}
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div
                            className="bg-blue-500 h-2 rounded-full transition-all"
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
          </div>
        )}

        {/* Debit/Credit Card */}
        {data.paymentSummary.filter((s: any) => s.methodId === 'CARD').length > 0 && (
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-3 flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              KARTU DEBIT/KREDIT
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {data.paymentSummary
                .filter((s: any) => s.methodId === 'CARD')
                .map((summary: any) => {
                  const percentage = ((summary.total / data.totalRevenue) * 100).toFixed(1);
                  return (
                    <div
                      key={summary.channelId}
                      className="bg-white dark:bg-gray-800 rounded-lg border-2 border-gray-200 dark:border-gray-700 p-5 hover:shadow-lg transition-shadow"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="bg-purple-500 text-white p-3 rounded-lg">
                          <CreditCard className="w-6 h-6" />
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
                      <h4 className="font-bold text-gray-800 dark:text-white mb-1">
                        {summary.channelName}
                      </h4>
                      <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-2">
                        {formatCurrency(summary.total)}
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div
                            className="bg-purple-500 h-2 rounded-full transition-all"
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
          </div>
        )}

        {/* QRIS */}
        {data.paymentSummary.filter((s: any) => s.methodId === 'QRIS').length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-3 flex items-center gap-2">
              <Smartphone className="w-4 h-4" />
              QRIS
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {data.paymentSummary
                .filter((s: any) => s.methodId === 'QRIS')
                .map((summary: any) => {
                  const percentage = ((summary.total / data.totalRevenue) * 100).toFixed(1);
                  return (
                    <div
                      key={summary.channelId}
                      className="bg-white dark:bg-gray-800 rounded-lg border-2 border-gray-200 dark:border-gray-700 p-5 hover:shadow-lg transition-shadow"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="bg-red-500 text-white p-3 rounded-lg">
                          <Smartphone className="w-6 h-6" />
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
                      <h4 className="font-bold text-gray-800 dark:text-white mb-1">
                        {summary.channelName}
                      </h4>
                      <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-2">
                        {formatCurrency(summary.total)}
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div
                            className="bg-red-500 h-2 rounded-full transition-all"
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
          </div>
        )}
      </div>

      {/* Cash Verification Section */}
      <div className="bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 rounded-lg border-2 border-yellow-300 dark:border-yellow-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="bg-yellow-500 text-white p-3 rounded-lg">
              <Wallet className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-gray-800 dark:text-white">
                Verifikasi Uang di Laci Kasir
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Cek apakah uang fisik sesuai dengan sistem
              </p>
            </div>
          </div>
          {!showCashVerification && (
            <button
              onClick={() => setShowCashVerification(true)}
              className="px-6 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 font-semibold"
            >
              Verifikasi Sekarang
            </button>
          )}
        </div>

        {showCashVerification ? (
          <div className="mt-4 space-y-4">
            <div className="bg-blue-50 dark:bg-blue-900/30 border-2 border-blue-200 dark:border-blue-700 rounded-lg p-4">
              <div className="text-sm text-blue-700 dark:text-blue-300 mb-1">
                💰 Uang Cash (Sistem)
              </div>
              <div className="text-3xl font-bold text-blue-900 dark:text-blue-100">
                {formatCurrency(expectedCash)}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2 dark:text-white">
                🔢 Uang Cash (Aktual di Laci) <span className="text-red-600">*</span>
              </label>
              <input
                type="number"
                value={actualCash}
                onChange={(e) => setActualCash(e.target.value)}
                placeholder="Masukkan jumlah uang fisik di laci"
                className="w-full p-4 border-2 border-gray-300 dark:border-gray-600 rounded-lg text-2xl font-bold text-center focus:border-blue-500 focus:outline-none dark:bg-gray-700 dark:text-white"
              />
            </div>

            {actualCash && (
              <div
                className={`rounded-lg p-4 ${
                  Math.abs(cashDifference) < 1000
                    ? 'bg-green-50 dark:bg-green-900/30 border-2 border-green-300 dark:border-green-700'
                    : cashDifference > 0
                    ? 'bg-blue-50 dark:bg-blue-900/30 border-2 border-blue-300 dark:border-blue-700'
                    : 'bg-red-50 dark:bg-red-900/30 border-2 border-red-300 dark:border-red-700'
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  {Math.abs(cashDifference) < 1000 ? (
                    <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
                  ) : (
                    <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
                  )}
                  <span
                    className={`font-bold text-lg ${
                      Math.abs(cashDifference) < 1000
                        ? 'text-green-900 dark:text-green-100'
                        : cashDifference > 0
                        ? 'text-blue-900 dark:text-blue-100'
                        : 'text-red-900 dark:text-red-100'
                    }`}
                  >
                    {Math.abs(cashDifference) < 1000
                      ? '✓ Sesuai!'
                      : cashDifference > 0
                      ? '↑ Lebih'
                      : '↓ Kurang'}
                  </span>
                </div>
                <div
                  className={`text-3xl font-bold mb-1 ${
                    Math.abs(cashDifference) < 1000
                      ? 'text-green-900 dark:text-green-100'
                      : cashDifference > 0
                      ? 'text-blue-900 dark:text-blue-100'
                      : 'text-red-900 dark:text-red-100'
                  }`}
                >
                  {cashDifference > 0 ? '+' : ''}
                  {formatCurrency(cashDifference)}
                </div>
                <div
                  className={`text-sm ${
                    Math.abs(cashDifference) < 1000
                      ? 'text-green-700 dark:text-green-300'
                      : cashDifference > 0
                      ? 'text-blue-700 dark:text-blue-300'
                      : 'text-red-700 dark:text-red-300'
                  }`}
                >
                  {Math.abs(cashDifference) < 1000
                    ? 'Perhitungan akurat, tidak ada selisih signifikan'
                    : cashDifference > 0
                    ? 'Ada kelebihan uang, mohon dicek kembali'
                    : 'Ada kekurangan uang, mohon dicek kembali'}
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold mb-2 dark:text-white">
                Catatan Verifikasi
              </label>
              <textarea
                value={verificationNotes}
                onChange={(e) => setVerificationNotes(e.target.value)}
                placeholder="Catatan tambahan (opsional)..."
                className="w-full p-3 border dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                rows={2}
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowCashVerification(false);
                  setActualCash('');
                  setVerificationNotes('');
                }}
                className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 font-semibold"
              >
                Batal
              </button>
              <button
                onClick={handleCashVerification}
                disabled={!actualCash || submittingVerification}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <CheckCircle className="w-5 h-5" />
                {submittingVerification ? 'Menyimpan...' : 'Simpan Verifikasi'}
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
            Klik "Verifikasi Sekarang" untuk mencocokkan uang fisik di laci kasir dengan sistem
          </div>
        )}
      </div>
    </div>
  );
}