/* 
 * Kode di atas merupakan komponen React TypeScript
 * untuk mengelola promo dan diskon pada sebuah toko.
 * Komponen ini mencakup fitur mengambil dan menampilkan
 * data promo, menambah promo baru, mengedit dan menghapus promo,
 * mengaktifkan atau menonaktifkan promo, serta mengatur
 * konfigurasi promo seperti tipe, nilai, rentang tanggal,
 * kategori yang berlaku, batas penggunaan, dan pengaturan lainnya.
 */
'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Tag, Percent, DollarSign, Clock, Users, Calendar, TrendingUp, Gift } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Promo } from '@/types';
import toast from 'react-hot-toast';
import { getClientStoreId } from '@/lib/store-config';

const PROMO_TYPES = [
  { value: 'PERCENTAGE', label: 'Persentase (%)', icon: Percent },
  { value: 'FIXED', label: 'Nominal (Rp)', icon: DollarSign },
  { value: 'BUY_X_GET_Y', label: 'Beli X Gratis Y', icon: Gift },
];

const DAYS = [
  { value: 'MONDAY', label: 'Senin' },
  { value: 'TUESDAY', label: 'Selasa' },
  { value: 'WEDNESDAY', label: 'Rabu' },
  { value: 'THURSDAY', label: 'Kamis' },
  { value: 'FRIDAY', label: 'Jumat' },
  { value: 'SATURDAY', label: 'Sabtu' },
  { value: 'SUNDAY', label: 'Minggu' },
];

export default function PromosPage() {
  const [promos, setPromos] = useState<Promo[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingPromo, setEditingPromo] = useState<Promo | null>(null);
  
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    type: 'PERCENTAGE' as 'PERCENTAGE' | 'FIXED' | 'BUY_X_GET_Y',
    value: '',
    minPurchase: '0',
    maxDiscount: '',
    applicableCategories: [] as string[],
    applicableProducts: [] as string[],
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    validDays: [] as string[],
    validHours: '',
    usageLimit: '',
    perCustomerLimit: '',
    buyQuantity: '',
    getQuantity: '',
    getProductId: '',
    isActive: true,
  });

  useEffect(() => {
    loadPromos();
    loadProducts();
    loadCategories();
  }, []);

  const loadPromos = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/promos?storeId=${getClientStoreId()}`);
      const data = await res.json();
      setPromos(Array.isArray(data) ? data : []);
    } catch (error) {
      toast.error('Gagal memuat promo');
      setPromos([]);
    } finally {
      setLoading(false);
    }
  };

  const loadProducts = async () => {
    try {
      const res = await fetch(`/api/products?storeId=${getClientStoreId()}&limit=1000`);
      const data = await res.json();
      setProducts(data.products || data || []);
    } catch (error) {
      console.error('Error loading products:', error);
    }
  };

  const loadCategories = async () => {
    try {
      const res = await fetch(`/api/categories?storeId=${getClientStoreId()}`);
      const data = await res.json();
      setCategories(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.code || !formData.name || !formData.value) {
      toast.error('Kode, nama, dan nilai promo harus diisi!');
      return;
    }

    if (formData.type === 'BUY_X_GET_Y' && (!formData.buyQuantity || !formData.getQuantity)) {
      toast.error('Buy quantity dan Get quantity harus diisi untuk tipe Beli X Gratis Y!');
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
          storeId: getClientStoreId(),
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to save');
      }

      toast.success(
        editingPromo
          ? 'Promo berhasil diupdate!'
          : 'Promo berhasil ditambahkan!'
      );

      loadPromos();
      handleCloseForm();
    } catch (error: any) {
      toast.error(error.message || 'Gagal menyimpan promo');
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
      code: promo.code,
      name: promo.name,
      description: promo.description || '',
      type: promo.type,
      value: promo.value.toString(),
      minPurchase: promo.minPurchase.toString(),
      maxDiscount: promo.maxDiscount?.toString() || '',
      applicableCategories: promo.applicableCategories || [],
      applicableProducts: promo.applicableProducts || [],
      startDate: new Date(promo.startDate).toISOString().split('T')[0],
      endDate: new Date(promo.endDate).toISOString().split('T')[0],
      validDays: promo.validDays || [],
      validHours: promo.validHours || '',
      usageLimit: promo.usageLimit?.toString() || '',
      perCustomerLimit: promo.perCustomerLimit?.toString() || '',
      buyQuantity: promo.buyQuantity?.toString() || '',
      getQuantity: promo.getQuantity?.toString() || '',
      getProductId: promo.getProductId || '',
      isActive: promo.isActive,
    });
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingPromo(null);
    setFormData({
      code: '',
      name: '',
      description: '',
      type: 'PERCENTAGE',
      value: '',
      minPurchase: '0',
      maxDiscount: '',
      applicableCategories: [],
      applicableProducts: [],
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      validDays: [],
      validHours: '',
      usageLimit: '',
      perCustomerLimit: '',
      buyQuantity: '',
      getQuantity: '',
      getProductId: '',
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

  const getPromoIcon = (type: string) => {
    switch (type) {
      case 'PERCENTAGE': return <Percent className="w-6 h-6" />;
      case 'FIXED': return <DollarSign className="w-6 h-6" />;
      case 'BUY_X_GET_Y': return <Gift className="w-6 h-6" />;
      default: return <Tag className="w-6 h-6" />;
    }
  };

  const getPromoColor = (type: string) => {
    switch (type) {
      case 'PERCENTAGE': return 'bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-400';
      case 'FIXED': return 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400';
      case 'BUY_X_GET_Y': return 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400';
      default: return 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400';
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
          onClick={() => {
            setEditingPromo(null);
            setShowForm(true);
          }}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 flex items-center gap-2 font-semibold"
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
          promos.map((promo) => {
            const isExpired = new Date(promo.endDate) < new Date();
            const isUpcoming = new Date(promo.startDate) > new Date();
            
            return (
              <div
                key={promo.id}
                className={`bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow ${
                  !promo.isActive || isExpired ? 'opacity-60' : ''
                }`}
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${getPromoColor(promo.type)}`}>
                        {getPromoIcon(promo.type)}
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-gray-800 dark:text-white">
                          {promo.name}
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {promo.code}
                        </p>
                      </div>
                    </div>
                  </div>

                  {promo.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                      {promo.description}
                    </p>
                  )}

                  <div className="space-y-2 mb-4">
                    <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                      {promo.type === 'PERCENTAGE' 
                        ? `${promo.value}%`
                        : promo.type === 'FIXED'
                        ? formatCurrency(promo.value)
                        : `Beli ${promo.buyQuantity} Gratis ${promo.getQuantity}`
                      }
                    </div>
                    
                    {promo.minPurchase > 0 && (
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Min. pembelian: {formatCurrency(promo.minPurchase)}
                      </p>
                    )}

                    {promo.maxDiscount && (
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Max. diskon: {formatCurrency(promo.maxDiscount)}
                      </p>
                    )}
                    
                    <div className="text-sm text-gray-500 dark:text-gray-400 space-y-1">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <span>{formatDate(promo.startDate)} - {formatDate(promo.endDate)}</span>
                      </div>
                      
                      {promo.validHours && (
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          <span>Jam {promo.validHours}</span>
                        </div>
                      )}

                      {promo.usageLimit && (
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4" />
                          <span>{promo.usageCount}/{promo.usageLimit} digunakan</span>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2 mt-3">
                      {promo.isActive && !isExpired && !isUpcoming && (
                        <span className="px-2 py-1 bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 rounded-full text-xs font-semibold">
                          ✓ Aktif
                        </span>
                      )}
                      {!promo.isActive && (
                        <span className="px-2 py-1 bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 rounded-full text-xs font-semibold">
                          Nonaktif
                        </span>
                      )}
                      {isExpired && (
                        <span className="px-2 py-1 bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300 rounded-full text-xs font-semibold">
                          Kedaluwarsa
                        </span>
                      )}
                      {isUpcoming && (
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300 rounded-full text-xs font-semibold">
                          Akan Datang
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="border-t dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-700/50 flex gap-2">
                  <button
                    onClick={() => toggleActive(promo)}
                    className={`flex-1 px-3 py-2 rounded-lg font-semibold text-sm ${
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
            );
          })
        )}
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full my-8">
            <div className="p-6 border-b dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-2xl font-bold dark:text-white">
                {editingPromo ? 'Edit Promo' : 'Tambah Promo Baru'}
              </h2>
              <button onClick={handleCloseForm} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-1 dark:text-white">
                    Kode Promo <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    className="w-full p-2 border dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white uppercase"
                    placeholder="HEMAT10"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-1 dark:text-white">
                    Nama Promo <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full p-2 border dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                    placeholder="Diskon Akhir Tahun"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1 dark:text-white">Deskripsi</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full p-2 border dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                  rows={2}
                  placeholder="Deskripsi promo untuk customer..."
                />
              </div>

              {/* Type & Value */}
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
                    {PROMO_TYPES.map(type => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-1 dark:text-white">
                    Nilai <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="number"
                    value={formData.value}
                    onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                    className="w-full p-2 border dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                    placeholder={formData.type === 'PERCENTAGE' ? '10' : '50000'}
                    min="0"
                    step={formData.type === 'PERCENTAGE' ? '0.1' : '1000'}
                    required
                  />
                </div>
              </div>

              {/* Buy X Get Y Fields */}
              {formData.type === 'BUY_X_GET_Y' && (
                <div className="border dark:border-gray-700 rounded-lg p-4 bg-blue-50 dark:bg-blue-900/20">
                  <h3 className="font-semibold mb-3 dark:text-white">Konfigurasi Beli X Gratis Y</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-semibold mb-1 dark:text-white">
                        Beli <span className="text-red-600">*</span>
                      </label>
                      <input
                        type="number"
                        value={formData.buyQuantity}
                        onChange={(e) => setFormData({ ...formData, buyQuantity: e.target.value })}
                        className="w-full p-2 border dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                        placeholder="2"
                        min="1"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-1 dark:text-white">
                        Gratis <span className="text-red-600">*</span>
                      </label>
                      <input
                        type="number"
                        value={formData.getQuantity}
                        onChange={(e) => setFormData({ ...formData, getQuantity: e.target.value })}
                        className="w-full p-2 border dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                        placeholder="1"
                        min="1"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-1 dark:text-white">
                        Produk Gratis
                      </label>
                      <select
                        value={formData.getProductId}
                        onChange={(e) => setFormData({ ...formData, getProductId: e.target.value })}
                        className="w-full p-2 border dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                      >
                        <option value="">Pilih Produk</option>
                        {products.map(product => (
                          <option key={product.id} value={product.id}>{product.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Min Purchase & Max Discount */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-1 dark:text-white">
                    Minimum Pembelian
                  </label>
                  <input
                    type="number"
                    value={formData.minPurchase}
                    onChange={(e) => setFormData({ ...formData, minPurchase: e.target.value })}
                    className="w-full p-2 border dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                    placeholder="100000"
                    min="0"
                    step="1000"
                  />
                </div>

                {formData.type === 'PERCENTAGE' && (
                  <div>
                    <label className="block text-sm font-semibold mb-1 dark:text-white">
                      Maksimum Diskon
                    </label>
                    <input
                      type="number"
                      value={formData.maxDiscount}
                      onChange={(e) => setFormData({ ...formData, maxDiscount: e.target.value })}
                      className="w-full p-2 border dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                      placeholder="50000"
                      min="0"
                      step="1000"
                    />
                  </div>
                )}
              </div>

              {/* Date Range */}
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

              {/* Valid Days */}
              <div>
                <label className="block text-sm font-semibold mb-2 dark:text-white">
                  Hari Berlaku (kosongkan jika semua hari)
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {DAYS.map(day => (
                    <label key={day.value} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.validDays.includes(day.value)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({ 
                              ...formData, 
                              validDays: [...formData.validDays, day.value] 
                            });
                          } else {
                            setFormData({ 
                              ...formData, 
                              validDays: formData.validDays.filter(d => d !== day.value) 
                            });
                          }
                        }}
                        className="w-4 h-4"
                      />
                      <span className="text-sm dark:text-white">{day.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Valid Hours (Happy Hour) */}
              <div>
                <label className="block text-sm font-semibold mb-1 dark:text-white">
                  Jam Berlaku (Happy Hour)
                </label>
                <input
                  type="text"
                  value={formData.validHours}
                  onChange={(e) => setFormData({ ...formData, validHours: e.target.value })}
                  className="w-full p-2 border dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                  placeholder="14:00-16:00"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Format: HH:MM-HH:MM (contoh: 14:00-16:00)
                </p>
              </div>

              {/* Usage Limits */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-1 dark:text-white">
                    Total Usage Limit
                  </label>
                  <input
                    type="number"
                    value={formData.usageLimit}
                    onChange={(e) => setFormData({ ...formData, usageLimit: e.target.value })}
                    className="w-full p-2 border dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                    placeholder="100 (kosongkan jika unlimited)"
                    min="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-1 dark:text-white">
                    Per Customer Limit
                  </label>
                  <input
                    type="number"
                    value={formData.perCustomerLimit}
                    onChange={(e) => setFormData({ ...formData, perCustomerLimit: e.target.value })}
                    className="w-full p-2 border dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                    placeholder="1 (kosongkan jika unlimited)"
                    min="0"
                  />
                </div>
              </div>

              {/* Applicable Categories */}
              <div>
                <label className="block text-sm font-semibold mb-2 dark:text-white">
                  Berlaku untuk Kategori (kosongkan jika semua kategori)
                </label>
                <div className="grid grid-cols-3 gap-2 max-h-32 overflow-y-auto border dark:border-gray-600 rounded-lg p-2">
                  {categories.map(category => (
                    <label key={category.id} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.applicableCategories.includes(category.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({ 
                              ...formData, 
                              applicableCategories: [...formData.applicableCategories, category.id] 
                            });
                          } else {
                            setFormData({ 
                              ...formData, 
                              applicableCategories: formData.applicableCategories.filter(c => c !== category.id) 
                            });
                          }
                        }}
                        className="w-4 h-4"
                      />
                      <span className="text-sm dark:text-white">{category.icon} {category.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Active Toggle */}
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

              {/* Info Box */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 dark:text-blue-200 mb-2">
                  💡 Preview Promo:
                </h3>
                <div className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
                  <p><strong>Kode:</strong> {formData.code || '(belum diisi)'}</p>
                  <p><strong>Diskon:</strong> {
                    formData.type === 'PERCENTAGE' 
                      ? `${formData.value}%${formData.maxDiscount ? ` (max ${formatCurrency(Number(formData.maxDiscount))})` : ''}`
                      : formData.type === 'FIXED'
                      ? formatCurrency(Number(formData.value || 0))
                      : `Beli ${formData.buyQuantity} Gratis ${formData.getQuantity}`
                  }</p>
                  {formData.minPurchase !== '0' && (
                    <p><strong>Min. Belanja:</strong> {formatCurrency(Number(formData.minPurchase))}</p>
                  )}
                  <p><strong>Periode:</strong> {formData.startDate} s/d {formData.endDate}</p>
                  {formData.validDays.length > 0 && (
                    <p><strong>Hari:</strong> {formData.validDays.map(d => DAYS.find(day => day.value === d)?.label).join(', ')}</p>
                  )}
                  {formData.validHours && (
                    <p><strong>Jam:</strong> {formData.validHours}</p>
                  )}
                </div>
              </div>
            </form>

            <div className="p-6 border-t dark:border-gray-700 flex gap-3">
              <button
                type="button"
                onClick={handleCloseForm}
                className="flex-1 px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 font-semibold"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
              >
                Simpan Promo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}