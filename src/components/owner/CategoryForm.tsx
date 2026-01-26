/**
 * Komponen `CategoryForm` pada React TypeScript digunakan untuk menangani proses
 * pembuatan dan pengeditan data kategori. Komponen ini menyediakan input form
 * untuk nama kategori, ikon, dan warna, serta dilengkapi dengan validasi dan
 * logika pengiriman data.
 *
 * @param {CategoryFormProps}
 * Komponen `CategoryForm` merupakan komponen form yang digunakan untuk menambah
 * atau mengedit informasi kategori. Parameter yang diterima menentukan perilaku
 * form, seperti kondisi terbuka/tutup modal dan data kategori yang akan diedit.
 *
 * @returns
 * Komponen `CategoryForm` akan mengembalikan sebuah form yang memungkinkan
 * pengguna untuk menambah atau mengedit kategori. Form ini berisi field untuk
 * mengisi nama kategori, ikon, dan warna, serta tombol untuk membatalkan atau
 * menyimpan data kategori. Selain itu, komponen juga menampilkan status loading
 * saat proses penyimpanan berlangsung. Form ditampilkan dalam bentuk modal
 * ketika properti `isOpen` bernilai true.
 */

'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { Category } from '@/types';
import toast from 'react-hot-toast';

interface CategoryFormProps {
  category?: Category | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CategoryForm({ category, isOpen, onClose, onSuccess }: CategoryFormProps) {
  const [formData, setFormData] = useState({
    name: category?.name || '',
    icon: category?.icon || '🏷️',
    color: category?.color || '#3B82F6',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return toast.error('Nama kategori harus diisi!');

    try {
      setLoading(true);
      const endpoint = category ? `/api/categories?id=${category.id}` : '/api/categories';
      const method = category ? 'PUT' : 'POST';

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, storeId: 'demo-store' }),
      });

      if (!res.ok) throw new Error('Failed to save');
      toast.success(category ? 'Kategori diupdate!' : 'Kategori ditambahkan!');
      onSuccess();
      onClose();
    } catch (error) {
      toast.error('Gagal menyimpan kategori');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full">
        <div className="p-6 border-b dark:border-gray-700 flex items-center justify-between">
          <h2 className="text-2xl font-bold dark:text-white">
            {category ? 'Edit' : 'Tambah'} Kategori
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-1 dark:text-white">
              Nama Kategori <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full p-2 border dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1 dark:text-white">Icon</label>
            <input
              type="text"
              value={formData.icon}
              onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
              className="w-full p-2 border dark:border-gray-600 rounded-lg text-center text-2xl dark:bg-gray-700"
              maxLength={2}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1 dark:text-white">Warna</label>
            <input
              type="color"
              value={formData.color}
              onChange={(e) => setFormData({ ...formData, color: e.target.value })}
              className="w-full h-10 border dark:border-gray-600 rounded-lg cursor-pointer"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 font-semibold"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold disabled:bg-gray-300"
            >
              {loading ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

