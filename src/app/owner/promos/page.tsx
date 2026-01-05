'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Tag, Percent, DollarSign } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';

interface Promo {
  id: string;
  name: string;
  type: 'PERCENTAGE' | 'FIXED';
  value: number;
  minPurchase: number;
  startDate: Date;
  endDate: Date;
  isActive: boolean;
  productId?: string;
}

interface Product {
  id: string;
  name: string;
}

export default function PromosPage() {
  const [promos, setPromos] = useState<Promo[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingPromo, setEditingPromo] = useState<Promo | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    type: 'PERCENTAGE' as 'PERCENTAGE' | 'FIXED',
    value: '',
    minPurchase: '0',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    productId: '',
    isActive: true,
  });

  useEffect(() => {
    loadPromos();
    loadProducts();
  }, []);

  const loadPromos = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/promos?storeId=demo-store');
      const data = await res.json();
      setPromos(data);
    } catch (error) {
      toast.error('Gagal memuat promo');
    } finally {
      setLoading(false);
    }
  };

  const loadProducts = async () => {
    try {
      const res = await fetch('/api/products?storeId=demo-store&limit=1000');
      const data = await res.json();
      setProducts(data.products || data);
    } catch (error) {
      console.error('Error loading products:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.value) {
      toast.error('Nama dan nilai promo harus diisi!');
      return;
    }

    try {
      const endpoint = editingPromo
        ? `/api/promos/${editingPromo.id}`
        : '/api/promos';
      const method = editingPromo ? 'PUT' : 'POST';

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          value: parseFloat(formData.value),
          minPurchase: parseFloat(formData.minPurchase),
          storeId: 'demo-store',
        }),
      });

      if (!res.ok) throw new Error('Failed to save');

      toast.success(
        editingPromo
          ? 'Promo berhasil diupdate!'
          : 'Promo berhasil ditambahkan!'
      );

      loadPromos();
      handleCloseForm();
    } catch (error) {
      toast.error('Gagal menyimpan promo');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Yakin ingin menghapus promo ini?')) return;

    try {
      const res = await fetch(`/api/promos/${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error('Failed to delete');

      toast.success('Promo berhasil dihapus');
      loadPromos();
    } catch (error) {
      toast.error('Gagal menghapus promo');
    }
  };

  const handleEdit = (promo: Promo) => {
    setEditingPromo(promo);
    setFormData({
      name: promo.name,
      type: promo.type,
      value: promo.value.toString(),
      minPurchase: promo.minPurchase.toString(),
      startDate: new Date(promo.startDate).toISOString().split('T')[0],
      endDate: new Date(promo.endDate).toISOString().split('T')[0],
      productId: promo.productId || '',
      isActive: promo.isActive,
    });
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingPromo(null);
    setFormData({
      name: '',
      type: 'PERCENTAGE',
      value: '',
      minPurchase: '0',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      productId: '',
      isActive: true,
    });
  };

  const toggleActive = async (promo: Promo) => {
    try {
      const res = await fetch(`/api/promos/${promo.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...promo,
          isActive: !promo.isActive,
        }),
      });

      if (!res.ok) throw new Error('Failed to update');

      toast.success(`Promo ${!promo.isActive ? 'diaktifkan' : 'dinonaktifkan'}`);
      loadPromos();
    } catch (error) {
      toast.error('Gagal mengubah status promo');
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Manajemen Promo & Diskon</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Kelola promo dan diskon toko Anda</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Tambah Promo
        </button>
      </div>

      {/* Promos Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : promos.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <Tag className="w-12 h-12 mx-auto mb-2 text-gray-300" />
            <p className="text-gray-500 dark:text-gray-400">Belum ada promo</p>
          </div>
        ) : (
          promos.map((promo) => (
            <div
              key={promo.id}
              className={`bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow ${
                !promo.isActive ? 'opacity-60' : ''
              }`}
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                      promo.type === 'PERCENTAGE' ? 'bg-purple-100 dark:bg-purple-900' : 'bg-green-100 dark:bg-green-900'
                    }`}>
                      {promo.type === 'PERCENTAGE' ? (
                        <Percent className={`w-6 h-6 ${promo.type === 'PERCENTAGE' ? 'text-purple-600 dark:text-purple-400' : 'text-green-600 dark:text-green-400'}`} />
                      ) : (
                        <DollarSign className="w-6 h-6 text-green-600 dark:text-green-400" />
                      )}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-800 dark:text-white">
                        {promo.name}
                      </h3>
                      <span className={`text-sm px-2 py-1 rounded ${
                        promo.isActive ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                      }`}>
                        {promo.isActive ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                    {promo.type === 'PERCENTAGE' 
                      ? `${promo.value}%`
                      : formatCurrency(promo.value)
                    }
                  </div>
                  
                  {promo.minPurchase > 0 && (
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Min. pembelian: {formatCurrency(promo.minPurchase)}
                    </p>
                  )}
                  
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    <p>Mulai: {formatDate(promo.startDate, 'long')}</p>
                    <p>Berakhir: {formatDate(promo.endDate, 'long')}</p>
                  </div>
                </div>

                <div className="flex gap-2 pt-4 border-t dark:border-gray-700">
                  <button
                    onClick={() => toggleActive(promo)}
                    className={`flex-1 px-3 py-2 rounded-lg font-semibold ${
                      promo.isActive 
                        ? 'bg-orange-100 text-orange-700 hover:bg-orange-200 dark:bg-orange-900 dark:text-orange-300' 
                        : 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900 dark:text-green-300'
                    }`}
                  >
                    {promo.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                  </button>
                  <button
                    onClick={() => handleEdit(promo)}
                    className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900 rounded"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(promo.id)}
                    className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900 rounded"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-2xl font-bold dark:text-white">
                {editingPromo ? 'Edit Promo' : 'Tambah Promo'}
              </h2>
              <button onClick={handleCloseForm} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-1 dark:text-white">
                  Nama Promo <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full p-2 border dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                  placeholder="Contoh: Diskon Akhir Tahun"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-1 dark:text-white">
                    Tipe Diskon <span className="text-red-600">*</span>
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                    className="w-full p-2 border dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                  >
                    <option value="PERCENTAGE">Persentase (%)</option>
                    <option value="FIXED">Nominal (Rp)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-1 dark:text-white">
                    Nilai Diskon <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="number"
                    value={formData.value}
                    onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                    className="w-full p-2 border dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                    placeholder={formData.type === 'PERCENTAGE' ? '10' : '10000'}
                    min="0"
                    step={formData.type === 'PERCENTAGE' ? '0.1' : '1000'}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1 dark:text-white">
                  Minimum Pembelian
                </label>
                <input
                  type="number"
                  value={formData.minPurchase}
                  onChange={(e) => setFormData({ ...formData, minPurchase: e.target.value })}
                  className="w-full p-2 border dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                  placeholder="0"
                  min="0"
                  step="1000"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-1 dark:text-white">
                    Tanggal Mulai <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full p-2 border dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-1 dark:text-white">
                    Tanggal Berakhir <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="w-full p-2 border dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1 dark:text-white">
                  Produk Spesifik (Opsional)
                </label>
                <select
                  value={formData.productId}
                  onChange={(e) => setFormData({ ...formData, productId: e.target.value })}
                  className="w-full p-2 border dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                >
                  <option value="">Semua Produk</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-4 h-4"
                />
                <label htmlFor="isActive" className="text-sm font-semibold dark:text-white">
                  Aktifkan promo sekarang
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleCloseForm}
                  className="flex-1 px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
                >
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}