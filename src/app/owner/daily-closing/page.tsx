
// ===================================================
// src/app/owner/daily-closing/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { Clock, CheckCircle, Wallet, AlertCircle, Download } from 'lucide-react';
import { calculatePaymentSummary } from '@/lib/payment-config';
import { formatCurrency, formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';

export default function DailyClosingPage() {
  const [date] = useState(new Date().toISOString().split('T')[0]);
  const [data, setData] = useState<any>(null);
  const [actualCash, setActualCash] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/reconciliation?storeId=demo-store&date=${date}`);
      const result = await res.json();
      setData(result);
    } catch (error) {
      toast.error('Gagal memuat data');
    } finally {
      setLoading(false);
    }
  };

  const handleClosing = async () => {
    if (!actualCash) {
      toast.error('Masukkan jumlah uang fisik di laci kasir');
      return;
    }

    const difference = parseFloat(actualCash) - data.byMethod.CASH;
    
    if (Math.abs(difference) > 10000) {
      if (!confirm(`Terdapat selisih ${formatCurrency(Math.abs(difference))}. Yakin ingin tutup kasir?`)) {
        return;
      }
    }

    try {
      setSubmitting(true);

      const res = await fetch('/api/daily-closing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeId: 'demo-store',
          cashierId: 'demo-cashier', // TODO: Get from session
          closingDate: date,
          actualCash: parseFloat(actualCash),
          paymentBreakdown: data.paymentSummary,
          notes
        })
      });

      if (!res.ok) throw new Error('Failed');

      toast.success('Kasir berhasil ditutup!');
      
      // Reload or redirect
      setTimeout(() => {
        window.location.href = '/owner/daily-closing/history';
      }, 1500);

    } catch (error) {
      toast.error('Gagal tutup kasir');
    } finally {
      setSubmitting(false);
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
  const difference = actualCash ? parseFloat(actualCash) - expectedCash : 0;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">
          Tutup Kasir Harian
        </h1>
        <p className="text-gray-500 dark:text-gray-400">
          {formatDate(date)} • Rekonsiliasi dan tutup kasir untuk hari ini
        </p>
      </div>

      {/* Summary */}
      <div className="bg-gradient-to-r from-purple-500 to-pink-600 rounded-lg p-6 text-white mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold mb-2">Ringkasan Penjualan Hari Ini</h2>
          </div>
          <div className="text-right">
            <div className="text-sm text-purple-100 mb-1">Total Pendapatan</div>
            <div className="text-3xl font-bold">{formatCurrency(data.totalRevenue)}</div>
            <div className="text-sm text-purple-100 mt-1">
              {data.totalTransactions} transaksi
            </div>
          </div>
        </div>
      </div>

      {/* Payment Breakdown */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
        <h3 className="font-bold text-lg mb-4 dark:text-white">
          📊 Breakdown per Metode Pembayaran
        </h3>
        <div className="space-y-3">
          {Object.entries(data.byMethod).map(([method, amount]: [string, any]) => (
            <div
              key={method}
              className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
            >
              <div>
                <div className="font-semibold dark:text-white">{method}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {data.paymentSummary.filter((s: any) => s.methodId === method).length} channel
                </div>
              </div>
              <div className="text-right">
                <div className="font-bold text-lg dark:text-white">
                  {formatCurrency(amount)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Cash Reconciliation */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border-2 border-yellow-300 dark:border-yellow-700 shadow p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-yellow-100 dark:bg-yellow-900 p-3 rounded-lg">
            <Wallet className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
          </div>
          <div>
            <h3 className="font-bold text-lg dark:text-white">Hitung Uang Fisik (Cash)</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Hitung uang di laci kasir
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-blue-50 dark:bg-blue-900 border-2 border-blue-200 dark:border-blue-700 rounded-lg p-4">
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
                Math.abs(difference) < 1000
                  ? 'bg-green-50 dark:bg-green-900 border-2 border-green-300 dark:border-green-700'
                  : difference > 0
                  ? 'bg-blue-50 dark:bg-blue-900 border-2 border-blue-300 dark:border-blue-700'
                  : 'bg-red-50 dark:bg-red-900 border-2 border-red-300 dark:border-red-700'
              }`}
            >
              <div className="flex items-center gap-3 mb-2">
                {Math.abs(difference) < 1000 ? (
                  <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
                ) : (
                  <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
                )}
                <span
                  className={`font-bold text-lg ${
                    Math.abs(difference) < 1000
                      ? 'text-green-900 dark:text-green-100'
                      : difference > 0
                      ? 'text-blue-900 dark:text-blue-100'
                      : 'text-red-900 dark:text-red-100'
                  }`}
                >
                  {Math.abs(difference) < 1000
                    ? '✓ Sesuai!'
                    : difference > 0
                    ? '↑ Lebih'
                    : '↓ Kurang'}
                </span>
              </div>
              <div
                className={`text-3xl font-bold mb-1 ${
                  Math.abs(difference) < 1000
                    ? 'text-green-900 dark:text-green-100'
                    : difference > 0
                    ? 'text-blue-900 dark:text-blue-100'
                    : 'text-red-900 dark:text-red-100'
                }`}
              >
                {difference > 0 ? '+' : ''}
                {formatCurrency(difference)}
              </div>
              <div
                className={`text-sm ${
                  Math.abs(difference) < 1000
                    ? 'text-green-700 dark:text-green-300'
                    : difference > 0
                    ? 'text-blue-700 dark:text-blue-300'
                    : 'text-red-700 dark:text-red-300'
                }`}
              >
                {Math.abs(difference) < 1000
                  ? 'Perhitungan akurat, tidak ada selisih signifikan'
                  : difference > 0
                  ? 'Ada kelebihan uang, mohon dicek kembali'
                  : 'Ada kekurangan uang, mohon dicek kembali'}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Notes */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
        <label className="block text-sm font-semibold mb-2 dark:text-white">
          Catatan (Opsional)
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Catatan tambahan untuk closing hari ini..."
          className="w-full p-3 border dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
          rows={3}
        />
      </div>

      {/* Warning */}
      <div className="bg-red-50 dark:bg-red-900 border-2 border-red-200 dark:border-red-700 rounded-lg p-4 mb-6">
        <div className="flex gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-red-800 dark:text-red-200">
            <p className="font-semibold mb-2">⚠️ Penting Sebelum Tutup Kasir:</p>
            <ul className="space-y-1 ml-4 list-disc">
              <li>Pastikan semua transaksi sudah tercatat</li>
              <li>Hitung ulang uang fisik di laci kasir</li>
              <li>Cek kembali jika ada selisih</li>
              <li>Setelah ditutup, data tidak bisa diubah</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Submit Button */}
      <button
        onClick={handleClosing}
        disabled={!actualCash || submitting}
        className="w-full px-6 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 font-bold text-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <CheckCircle className="w-6 h-6" />
        {submitting ? 'Memproses...' : 'Tutup Kasir & Simpan Laporan'}
      </button>
    </div>
  );
}