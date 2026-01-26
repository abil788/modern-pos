/* 
 * Kode di atas merupakan komponen React TypeScript
 * untuk halaman Pengaturan (Settings Page) pada aplikasi web.
 * Komponen ini mencakup fitur pengelolaan pengaturan toko,
 * penggantian kata sandi, mengaktifkan/mematikan Kitchen Display System (KDS),
 * serta melakukan backup dan restore data.
 */

'use client';

import { useState, useEffect } from 'react';
import { Store, Save, Lock, Eye, EyeOff, Shield, Download, Upload } from 'lucide-react';
import { useSettingsStore } from '@/store/settingsStore';
import toast from 'react-hot-toast';

export default function SettingsPage() {
  const { store, setStore } = useSettingsStore();
  const [loading, setLoading] = useState(false);
  const [backupLoading, setBackupLoading] = useState(false);
  const [restoreLoading, setRestoreLoading] = useState(false);
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  
  // ✅ KDS State
  const [kdsEnabled, setKdsEnabled] = useState(false);
  
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
      
      // ✅ Load KDS setting when store is loaded
      loadKDSSetting();
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

  // ✅ Load KDS Setting
  const loadKDSSetting = async () => {
    try {
      const res = await fetch('/api/settings/kds?storeId=demo-store');
      if (res.ok) {
        const data = await res.json();
        setKdsEnabled(data.enabled || false);
      }
    } catch (error) {
      console.error('Failed to load KDS setting:', error);
      setKdsEnabled(false);
    }
  };

  // ✅ Toggle KDS
  const handleKDSToggle = async (enabled: boolean) => {
    try {
      const res = await fetch('/api/settings/kds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeId: store?.id || 'demo-store',
          enabled,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to update KDS setting');
      }

      const data = await res.json();
      setKdsEnabled(data.enabled);
      
      toast.success(
        enabled 
          ? '✅ Kitchen Display System diaktifkan!' 
          : '⚠️ Kitchen Display System dinonaktifkan!'
      );
    } catch (error) {
      console.error('KDS toggle error:', error);
      toast.error('Gagal mengubah pengaturan KDS');
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
      
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      setShowPasswordSection(false);

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

  const handleBackup = async () => {
    try {
      setBackupLoading(true);
      toast.loading('Sedang membuat backup...', { id: 'backup' });
      
      const res = await fetch('/api/backup?storeId=demo-store');
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to create backup');
      }
      
      const backup = await res.json();
      
      if (!backup || !backup.store) {
        throw new Error('Invalid backup data received');
      }
      
      const dataStr = JSON.stringify(backup, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      const date = new Date().toISOString().split('T')[0];
      const storeName = backup.store?.name?.replace(/\s+/g, '-') || 'toko';
      link.download = `backup-${storeName}-${date}.json`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success(`Backup berhasil! ${backup.summary?.productsCount || 0} produk, ${backup.summary?.transactionsCount || 0} transaksi`, { id: 'backup' });
    } catch (error) {
      console.error('Backup error:', error);
      toast.error(error instanceof Error ? error.message : 'Gagal membuat backup', { id: 'backup' });
    } finally {
      setBackupLoading(false);
    }
  };

  const handleRestore = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.json')) {
      toast.error('File harus berformat JSON');
      return;
    }

    const confirmed = window.confirm(
      '⚠️ PERHATIAN!\n\n' +
      'Restore akan menimpa data yang ada dengan data dari backup.\n' +
      'Data seperti produk, kategori, dan settings akan di-update.\n\n' +
      'Apakah Anda yakin ingin melanjutkan?'
    );

    if (!confirmed) {
      event.target.value = '';
      return;
    }

    try {
      setRestoreLoading(true);
      toast.loading('Sedang restore backup...', { id: 'restore' });

      const fileContent = await file.text();
      const backupData = JSON.parse(fileContent);

      if (!backupData.version || !backupData.store) {
        throw new Error('File backup tidak valid');
      }

      const res = await fetch('/api/backup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(backupData),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to restore backup');
      }

      const result = await res.json();

      toast.success(
        `✅ Restore berhasil!\n` +
        `• ${result.restored?.categories || 0} kategori\n` +
        `• ${result.restored?.products || 0} produk\n` +
        `• ${result.restored?.settings || 0} settings\n` +
        `• ${result.restored?.users || 0} kasir`,
        { id: 'restore', duration: 5000 }
      );

      setTimeout(() => {
        window.location.reload();
      }, 2000);

    } catch (error) {
      console.error('Restore error:', error);
      toast.error(
        error instanceof Error ? error.message : 'Gagal restore backup',
        { id: 'restore' }
      );
    } finally {
      setRestoreLoading(false);
      event.target.value = '';
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

        {/* ✅ Kitchen Display System Section */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-6 dark:text-white flex items-center gap-2">
            <svg className="w-6 h-6 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
            Kitchen Display System
          </h2>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="flex-1">
                <p className="font-semibold dark:text-white">
                  Aktifkan Kitchen Display System (KDS)
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Tampilkan pesanan secara real-time di layar dapur untuk meningkatkan efisiensi
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleKDSToggle(!kdsEnabled)}
                className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                  kdsEnabled ? 'bg-green-600' : 'bg-gray-300 dark:bg-gray-600'
                }`}
              >
                <span
                  className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                    kdsEnabled ? 'translate-x-7' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {kdsEnabled && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 dark:text-blue-200 mb-2">
                  ℹ️ Informasi KDS:
                </h3>
                <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1 ml-4 list-disc">
                  <li>Button "Kitchen Display System" akan muncul di halaman login</li>
                  <li>Pesanan dari kasir akan otomatis terkirim ke KDS</li>
                  <li>Dapur dapat melihat pesanan secara real-time</li>
                  <li>Akses KDS: <a href="/kitchen" className="font-mono underline">/kitchen</a></li>
                </ul>
              </div>
            )}

            {!kdsEnabled && (
              <div className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  💡 Saat dinonaktifkan, button Kitchen Display tidak akan muncul di halaman login dan pesanan tidak akan dikirim ke KDS.
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-6 dark:text-white">Backup & Restore</h2>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div>
                <p className="font-semibold dark:text-white">Backup Data</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Export semua data toko (produk, transaksi, kategori, dll)
                </p>
              </div>
              <button
                type="button"
                onClick={handleBackup}
                disabled={backupLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                {backupLoading ? 'Memproses...' : 'Backup'}
              </button>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border-2 border-orange-300 dark:border-orange-700">
              <div>
                <p className="font-semibold dark:text-white flex items-center gap-2">
                  <Upload className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                  Restore Data
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Import data dari file backup (.json)
                </p>
                <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                  ⚠️ Akan menimpa data yang ada
                </p>
              </div>
              <div>
                <input
                  type="file"
                  id="restore-file"
                  accept=".json"
                  onChange={handleRestore}
                  disabled={restoreLoading}
                  className="hidden"
                />
                <label
                  htmlFor="restore-file"
                  className={`px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 cursor-pointer flex items-center gap-2 ${
                    restoreLoading ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  <Upload className="w-4 h-4" />
                  {restoreLoading ? 'Restoring...' : 'Restore'}
                </label>
              </div>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 dark:text-blue-200 mb-2">
                📋 Cara Menggunakan Backup & Restore:
              </h3>
              <ol className="text-sm text-blue-800 dark:text-blue-300 space-y-1 ml-4 list-decimal">
                <li><strong>Backup:</strong> Klik tombol "Backup" untuk download file JSON berisi semua data toko</li>
                <li><strong>Restore:</strong> Klik tombol "Restore" dan pilih file backup (.json) yang ingin di-import</li>
                <li><strong>Perhatian:</strong> Restore akan menimpa data yang ada dengan data dari backup</li>
                <li><strong>Rekomendasi:</strong> Lakukan backup berkala sebelum melakukan perubahan besar</li>
              </ol>
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