'use client';

import { useState, useEffect } from 'react';
import { Store, Save, Lock, Eye, EyeOff } from 'lucide-react';
import { useSettingsStore } from '@/store/settingsStore';
import toast from 'react-hot-toast';

export default function SettingsPage() {
  const { store, setStore } = useSettingsStore();
  const [loading, setLoading] = useState(false);
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    phone: '',
    email: '',
    currency: 'IDR',
    taxRate: '10',
    receiptFooter: '',
    primaryColor: '#3B82F6',
  });

  useEffect(() => {
    loadSettings();
  }, []);

  useEffect(() => {
    if (store) {
      setFormData({
        name: store.name,
        address: store.address || '',
        phone: store.phone || '',
        email: store.email || '',
        currency: store.currency,
        taxRate: store.taxRate.toString(),
        receiptFooter: store.receiptFooter || '',
        primaryColor: store.primaryColor,
      });
    }
  }, [store]);

  const loadSettings = async () => {
    try {
      const res = await fetch('/api/settings?storeId=demo-store');
      const data = await res.json();
      setStore(data);
    } catch (error) {
      toast.error('Gagal memuat pengaturan');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setLoading(true);

      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: store?.id || 'demo-store',
          ...formData,
          taxRate: parseFloat(formData.taxRate),
        }),
      });

      if (!res.ok) throw new Error('Failed to save');

      const updatedStore = await res.json();
      setStore(updatedStore);

      toast.success('Pengaturan berhasil disimpan!');
    } catch (error) {
      toast.error('Gagal menyimpan pengaturan');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault();

    const currentPassword = localStorage.getItem('owner_password') || 'admin123';

    if (passwordData.currentPassword !== currentPassword) {
      toast.error('Password saat ini salah!');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast.error('Password baru minimal 6 karakter!');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('Konfirmasi password tidak cocok!');
      return;
    }

    localStorage.setItem('owner_password', passwordData.newPassword);
    toast.success('Password berhasil diubah!');
    
    setPasswordData({
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    });
    setShowPasswordSection(false);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">Pengaturan Toko</h1>
        <p className="text-gray-500 dark:text-gray-400">Kelola informasi dan konfigurasi toko Anda</p>
      </div>

      {/* Owner Password Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 dark:bg-red-900 rounded-lg">
              <Lock className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold dark:text-white">Password Owner</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Ubah password untuk akses mode owner</p>
            </div>
          </div>
          <button
            onClick={() => setShowPasswordSection(!showPasswordSection)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            {showPasswordSection ? 'Tutup' : 'Ubah Password'}
          </button>
        </div>

        {showPasswordSection && (
          <form onSubmit={handlePasswordChange} className="space-y-4 border-t dark:border-gray-700 pt-4">
            <div>
              <label className="block text-sm font-semibold mb-1 dark:text-white">
                Password Saat Ini <span className="text-red-600">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                  className="w-full p-2 border dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Password default: admin123
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1 dark:text-white">
                Password Baru <span className="text-red-600">*</span>
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                className="w-full p-2 border dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                required
                minLength={6}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1 dark:text-white">
                Konfirmasi Password Baru <span className="text-red-600">*</span>
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={passwordData.confirmPassword}
                onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                className="w-full p-2 border dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                required
                minLength={6}
              />
            </div>

            <button
              type="submit"
              className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold"
            >
              Simpan Password Baru
            </button>
          </form>
        )}
      </div>

      {/* Store Settings Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <Store className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <h2 className="text-xl font-bold dark:text-white">Informasi Toko</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-1 dark:text-white">
                Nama Toko <span className="text-red-600">*</span>
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
              <label className="block text-sm font-semibold mb-1 dark:text-white">Alamat</label>
              <textarea
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full p-2 border dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-1 dark:text-white">Telepon</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full p-2 border dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1 dark:text-white">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full p-2 border dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-6 dark:text-white">Pengaturan Bisnis</h2>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-1 dark:text-white">Mata Uang</label>
                <select
                  value={formData.currency}
                  onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                  className="w-full p-2 border dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                >
                  <option value="IDR">IDR - Rupiah</option>
                  <option value="USD">USD - Dollar</option>
                  <option value="EUR">EUR - Euro</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1 dark:text-white">Pajak/PPN (%)</label>
                <input
                  type="number"
                  value={formData.taxRate}
                  onChange={(e) => setFormData({ ...formData, taxRate: e.target.value })}
                  className="w-full p-2 border dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                  min="0"
                  max="100"
                  step="0.1"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1 dark:text-white">Footer Struk</label>
              <textarea
                value={formData.receiptFooter}
                onChange={(e) => setFormData({ ...formData, receiptFooter: e.target.value })}
                className="w-full p-2 border dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                rows={3}
                placeholder="Terima kasih atas kunjungan Anda!"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold disabled:bg-gray-300 flex items-center gap-2"
          >
            <Save className="w-5 h-5" />
            {loading ? 'Menyimpan...' : 'Simpan Pengaturan'}
          </button>
        </div>
      </form>
    </div>
  );
}