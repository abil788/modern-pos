/**
 * Komponen `ExpenseForm` pada React TypeScript digunakan untuk menangani proses
 * pembuatan dan pengeditan data pengeluaran. Komponen ini menyediakan input form
 * untuk kategori, jumlah, tanggal, dan deskripsi pengeluaran, serta dilengkapi
 * dengan validasi dan logika pengiriman data.
 *
 * @param {ExpenseFormProps}
 * Komponen `ExpenseForm` adalah form yang digunakan untuk menambah atau mengedit
 * data pengeluaran. Properti yang diterima mengatur perilaku form dan data
 * pengeluaran yang sedang diproses.
 *
 * @returns
 * Komponen `ExpenseForm` akan mengembalikan sebuah form yang memungkinkan pengguna
 * untuk menambah atau mengedit pengeluaran. Form ini berisi field untuk memilih
 * kategori, memasukkan jumlah, tanggal, dan deskripsi pengeluaran, serta tombol
 * untuk membatalkan atau mengirim form. Proses submit ditangani oleh fungsi
 * `handleSubmit` yang akan melakukan request POST untuk membuat pengeluaran baru
 * atau PUT untuk memperbarui data pengeluaran yang sudah ada.
 */

'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { Expense } from '@/types';
import toast from 'react-hot-toast';

const CATEGORIES = ['Sewa', 'Listrik', 'Air', 'Gaji', 'Transportasi', 'Pembelian Stok', 'Marketing', 'Lain-lain'];

interface ExpenseFormProps {
  expense?: Expense | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function ExpenseForm({ expense, isOpen, onClose, onSuccess }: ExpenseFormProps) {
  const [formData, setFormData] = useState({
    category: expense?.category || '',
    amount: expense?.amount.toString() || '',
    description: expense?.description || '',
    date: expense?.date ? new Date(expense.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.category || !formData.amount) return toast.error('Kategori dan jumlah harus diisi!');

    try {
      setLoading(true);
      const endpoint = expense ? `/api/expenses/${expense.id}` : '/api/expenses';
      const method = expense ? 'PUT' : 'POST';

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, storeId: 'demo-store' }),
      });

      if (!res.ok) throw new Error('Failed');
      toast.success(expense ? 'Pengeluaran diupdate!' : 'Pengeluaran ditambahkan!');
      onSuccess();
      onClose();
    } catch (error) {
      toast.error('Gagal menyimpan');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full">
        <div className="p-6 border-b dark:border-gray-700 flex items-center justify-between">
          <h2 className="text-2xl font-bold dark:text-white">{expense ? 'Edit' : 'Tambah'} Pengeluaran</h2>
          <button onClick={onClose}><X className="w-5 h-5" /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-1 dark:text-white">Kategori *</label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full p-2 border dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
              required
            >
              <option value="">Pilih Kategori</option>
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1 dark:text-white">Jumlah *</label>
            <input
              type="number"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              className="w-full p-2 border dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
              required
              min="0"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1 dark:text-white">Tanggal</label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="w-full p-2 border dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1 dark:text-white">Deskripsi</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full p-2 border dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
              rows={3}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="flex-1 px-6 py-3 bg-gray-200 dark:bg-gray-700 rounded-lg">
              Batal
            </button>
            <button type="submit" disabled={loading} className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg">
              {loading ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}



