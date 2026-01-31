/* 
 * Kode di atas merupakan komponen React TypeScript
 * untuk halaman manajemen staf pada aplikasi web.
 * Komponen ini memungkinkan pengguna untuk mengelola kasir,
 * termasuk menambah kasir baru, mengedit kasir yang ada,
 * menghapus kasir, dan mengubah status aktif/non-aktif kasir.
 */

'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, User, Lock, Unlock, Camera, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import { getClientStoreId } from '@/lib/store-config';

interface Cashier {
  id: string;
  fullName: string;
  username: string;
  photo?: string;
  pin?: string;
  isActive: boolean;
  lastLogin?: Date;
  createdAt: Date;
}

export default function StaffManagementPage() {
  const [cashiers, setCashiers] = useState<Cashier[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingCashier, setEditingCashier] = useState<Cashier | null>(null);
  const [showPin, setShowPin] = useState(false);

  const [formData, setFormData] = useState({
    fullName: '',
    username: '',
    pin: '',
    photo: '',
  });

  useEffect(() => {
    loadCashiers();
  }, []);

  const loadCashiers = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/staff?storeId=${getClientStoreId()}`);
      const data = await res.json();
      setCashiers(data);
    } catch (error) {
      toast.error('Gagal memuat data kasir');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validasi
    if (!formData.fullName || !formData.username) {
      toast.error('Nama lengkap dan username harus diisi!');
      return;
    }

    if (!editingCashier && !formData.pin) {
      toast.error('PIN harus diisi untuk kasir baru!');
      return;
    }

    if (formData.pin && !/^\d{4}$/.test(formData.pin)) {
      toast.error('PIN harus 4 digit angka!');
      return;
    }

    try {
      const endpoint = editingCashier
        ? `/api/staff/${editingCashier.id}`
        : '/api/staff';
      const method = editingCashier ? 'PUT' : 'POST';

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
        throw new Error(error.error || 'Gagal menyimpan data');
      }

      toast.success(
        editingCashier
          ? 'Data kasir berhasil diupdate!'
          : 'Kasir baru berhasil ditambahkan!'
      );

      loadCashiers();
      handleCloseForm();
    } catch (error: any) {
      toast.error(error.message || 'Gagal menyimpan data kasir');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Yakin ingin menghapus kasir "${name}"?`)) return;

    try {
      const res = await fetch(`/api/staff/${id}?storeId=${getClientStoreId()}`, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error('Gagal menghapus');

      toast.success('Kasir berhasil dihapus');
      loadCashiers();
    } catch (error) {
      toast.error('Gagal menghapus kasir');
    }
  };

  const handleToggleActive = async (cashier: Cashier) => {
    try {
      const res = await fetch(`/api/staff/${cashier.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isActive: !cashier.isActive,
          storeId: getClientStoreId(),
        }),
      });

      if (!res.ok) throw new Error('Gagal update status');

      toast.success(
        `Kasir ${!cashier.isActive ? 'diaktifkan' : 'dinonaktifkan'}`
      );
      loadCashiers();
    } catch (error) {
      toast.error('Gagal mengubah status kasir');
    }
  };

  const handleEdit = (cashier: Cashier) => {
    setEditingCashier(cashier);
    setFormData({
      fullName: cashier.fullName,
      username: cashier.username,
      pin: '', // Kosongkan PIN untuk keamanan
      photo: cashier.photo || '',
    });
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingCashier(null);
    setFormData({
      fullName: '',
      username: '',
      pin: '',
      photo: '',
    });
  };

  const generateRandomPin = () => {
    const pin = Math.floor(1000 + Math.random() * 9000).toString();
    setFormData({ ...formData, pin });
    toast.success(`PIN random: ${pin}`);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white">
            Manajemen Staff Kasir
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Kelola kasir dan atur akses mereka
          </p>
        </div>
        <button
          onClick={() => {
            setEditingCashier(null);
            setShowForm(true);
          }}
          className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-xl hover:from-purple-700 hover:to-pink-700 flex items-center gap-2 font-semibold shadow-lg"
        >
          <Plus className="w-5 h-5" />
          Tambah Kasir
        </button>
      </div>

      {/* Cashiers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
          </div>
        ) : cashiers.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <User className="w-12 h-12 mx-auto mb-2 text-gray-300" />
            <p className="text-gray-500">Belum ada kasir terdaftar</p>
          </div>
        ) : (
          cashiers.map((cashier) => (
            <div
              key={cashier.id}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden border-2 border-gray-100 dark:border-gray-700 hover:shadow-xl transition-all"
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full overflow-hidden border-4 border-purple-200">
                      {cashier.photo ? (
                        <img
                          src={cashier.photo}
                          alt={cashier.fullName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center">
                          <User className="w-8 h-8 text-white" />
                        </div>
                      )}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-800 dark:text-white">
                        {cashier.fullName}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        @{cashier.username}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleToggleActive(cashier)}
                    className={`p-2 rounded-lg transition-colors ${
                      cashier.isActive
                        ? 'bg-green-100 text-green-600 hover:bg-green-200'
                        : 'bg-red-100 text-red-600 hover:bg-red-200'
                    }`}
                  >
                    {cashier.isActive ? (
                      <Unlock className="w-5 h-5" />
                    ) : (
                      <Lock className="w-5 h-5" />
                    )}
                  </button>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Status:</span>
                    <span
                      className={`px-2 py-1 rounded-lg font-semibold ${
                        cashier.isActive
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {cashier.isActive ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </div>
                  {cashier.lastLogin && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500 dark:text-gray-400">
                        Login Terakhir:
                      </span>
                      <span className="text-gray-700 dark:text-gray-300">
                        {new Date(cashier.lastLogin).toLocaleString('id-ID')}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="border-t dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-700/50 flex gap-2">
                <button
                  onClick={() => handleEdit(cashier)}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2 font-semibold"
                >
                  <Edit className="w-4 h-4" />
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(cashier.id, cashier.fullName)}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center justify-center gap-2 font-semibold"
                >
                  <Trash2 className="w-4 h-4" />
                  Hapus
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b dark:border-gray-700">
              <h2 className="text-2xl font-bold dark:text-white">
                {editingCashier ? 'Edit Kasir' : 'Tambah Kasir Baru'}
              </h2>
            </div>

            <div className="p-6">
              <div className="space-y-6">
                {/* Photo Preview */}
                <div className="flex justify-center">
                  <div className="relative">
                    <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-purple-200">
                      {formData.photo ? (
                        <img
                          src={formData.photo}
                          alt="Preview"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center">
                          <User className="w-16 h-16 text-white" />
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      className="absolute bottom-0 right-0 p-2 bg-purple-600 text-white rounded-full hover:bg-purple-700"
                    >
                      <Camera className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Form Fields */}
                <div>
                  <label className="block text-sm font-semibold mb-2 dark:text-white">
                    URL Foto Profil
                  </label>
                  <input
                    type="text"
                    value={formData.photo}
                    onChange={(e) =>
                      setFormData({ ...formData, photo: e.target.value })
                    }
                    placeholder="https://example.com/photo.jpg"
                    className="w-full p-3 border dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Gunakan layanan seperti Imgur, Cloudinary, atau upload ke server
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold mb-2 dark:text-white">
                      Nama Lengkap <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.fullName}
                      onChange={(e) =>
                        setFormData({ ...formData, fullName: e.target.value })
                      }
                      placeholder="John Doe"
                      className="w-full p-3 border dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-2 dark:text-white">
                      Username <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.username}
                      onChange={(e) =>
                        setFormData({ ...formData, username: e.target.value })
                      }
                      placeholder="johndoe"
                      className="w-full p-3 border dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2 dark:text-white">
                    PIN (4 Digit) {!editingCashier && <span className="text-red-600">*</span>}
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input
                        type={showPin ? 'text' : 'password'}
                        value={formData.pin}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, '').slice(0, 4);
                          setFormData({ ...formData, pin: value });
                        }}
                        placeholder="1234"
                        maxLength={4}
                        className="w-full p-3 border dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white font-mono text-2xl tracking-widest text-center pr-12"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPin(!showPin)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                      >
                        {showPin ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={generateRandomPin}
                      className="px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-semibold whitespace-nowrap"
                    >
                      Random
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {editingCashier
                      ? 'Kosongkan jika tidak ingin mengubah PIN'
                      : 'PIN untuk login kasir'}
                  </p>
                </div>

                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    <strong>⚠️ Penting:</strong> Simpan PIN dengan aman. Kasir memerlukan
                    PIN ini untuk login ke sistem.
                  </p>
                </div>
              </div>
            </div>

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
                className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 font-semibold"
              >
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}