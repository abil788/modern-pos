'use client';

import { useState, useEffect } from 'react';
import { Store, Save, Lock, Eye, EyeOff, Shield } from 'lucide-react';
import { useSettingsStore } from '@/store/settingsStore';
import toast from 'react-hot-toast';

export default function SettingsPage() {
  const { store, setStore } = useSettingsStore();
  const [loading, setLoading] = useState(false);
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  
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
    logo: '',
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
        logo: store.logo || '',
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

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      toast.error('Semua field password harus diisi!');
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

    try {
      setLoading(true);

      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
          storeId: 'demo-store',
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to change password');
      }

      toast.success('Password berhasil diubah!');
      
      // Reset form
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      setShowPasswordSection(false);

      // Logout after password change
      setTimeout(() => {
        localStorage.removeItem('owner_session');
        window.location.href = '/login';
      }, 2000);

    } catch (error: any) {
      toast.error(error.message || 'Gagal mengubah password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">Pengaturan Toko</h1>
        <p className="text-gray-500 dark:text-gray-400">Kelola informasi dan konfigurasi toko Anda</p>
      </div>

      {/* Password Change Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 dark:bg-red-900 rounded-lg">
              <Shield className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold dark:text-white">Keamanan Password</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Ubah password untuk akses mode owner</p>
            </div>
          </div>
          <button
            onClick={() => setShowPasswordSection(!showPasswordSection)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
          >
            {showPasswordSection ? 'Tutup' : 'Ubah Password'}
          </button>
        </div>

        {showPasswordSection && (
          <form onSubmit={handlePasswordChange} className="space-y-4 border-t dark:border-gray-700 pt-4">
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <div className="flex gap-3">
                <Lock className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-yellow-800 dark:text-yellow-200">
                  <p className="font-semibold mb-1">Perhatian!</p>
                  <p>Setelah password berhasil diubah, Anda akan otomatis logout dan harus login ulang dengan password baru.</p>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1 dark:text-white">
                Password Saat Ini <span className="text-red-600">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPasswords.current ? 'text' : 'password'}
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                  className="w-full p-3 border dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white pr-12"
                  placeholder="Masukkan password saat ini"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400"
                >
                  {showPasswords.current ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Password default: <span className="font-mono font-semibold">admin123</span>
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1 dark:text-white">
                Password Baru <span className="text-red-600">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPasswords.new ? 'text' : 'password'}
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  className="w-full p-3 border dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white pr-12"
                  placeholder="Minimal 6 karakter"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400"
                >
                  {showPasswords.new ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1 dark:text-white">
                Konfirmasi Password Baru <span className="text-red-600">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPasswords.confirm ? 'text' : 'password'}
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  className="w-full p-3 border dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white pr-12"
                  placeholder="Ketik ulang password baru"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400"
                >
                  {showPasswords.confirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Lock className="w-5 h-5" />
              {loading ? 'Mengubah Password...' : 'Simpan Password Baru'}
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