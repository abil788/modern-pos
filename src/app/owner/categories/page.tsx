'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Tag } from 'lucide-react';
import { Category } from '@/types';
import toast from 'react-hot-toast';

const EMOJI_OPTIONS = ['🍔', '🥤', '🍿', '✏️', '📱', '👕', '🎮', '📚', '🏠', '🎨'];
const COLOR_OPTIONS = [
  '#FF6B6B', '#4ECDC4', '#FFE66D', '#A8E6CF', '#FF8B94',
  '#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981',
];

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    icon: '🏷️',
    color: '#3B82F6',
  });

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/categories?storeId=demo-store');
      const data = await res.json();
      setCategories(data);
    } catch (error) {
      toast.error('Gagal memuat kategori');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name) {
      toast.error('Nama kategori harus diisi!');
      return;
    }

    try {
      const endpoint = editingCategory
        ? `/api/categories?id=${editingCategory.id}`
        : '/api/categories';
      const method = editingCategory ? 'PUT' : 'POST';

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          storeId: 'demo-store',
        }),
      });

      if (!res.ok) throw new Error('Failed to save');

      toast.success(
        editingCategory
          ? 'Kategori berhasil diupdate!'
          : 'Kategori berhasil ditambahkan!'
      );

      loadCategories();
      handleCloseForm();
    } catch (error) {
      toast.error('Gagal menyimpan kategori');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Yakin ingin menghapus kategori ini?')) return;

    try {
      const res = await fetch(`/api/categories?id=${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error('Failed to delete');

      toast.success('Kategori berhasil dihapus');
      loadCategories();
    } catch (error) {
      toast.error('Gagal menghapus kategori');
    }
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      icon: category.icon || '🏷️',
      color: category.color || '#3B82F6',
    });
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingCategory(null);
    setFormData({
      name: '',
      icon: '🏷️',
      color: '#3B82F6',
    });
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Manajemen Kategori</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Kelola kategori produk toko Anda</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Tambah Kategori
        </button>
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : categories.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <Tag className="w-12 h-12 mx-auto mb-2 text-gray-300" />
            <p className="text-gray-500 dark:text-gray-400">Belum ada kategori</p>
          </div>
        ) : (
          categories.map((category) => (
            <div
              key={category.id}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow"
              style={{ borderTop: `4px solid ${category.color}` }}
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div
                    className="w-16 h-16 rounded-lg flex items-center justify-center text-3xl"
                    style={{ backgroundColor: `${category.color}20` }}
                  >
                    {category.icon}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(category)}
                      className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900 rounded"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(category.id)}
                      className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">
                  {category.name}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  ID: {category.id.slice(0, 8)}...
                </p>
              </div>
              <div
                className="px-6 py-3 text-sm font-semibold text-center"
                style={{
                  backgroundColor: `${category.color}10`,
                  color: category.color,
                }}
              >
                Kategori Aktif
              </div>
            </div>
          ))
        )}
      </div>

      {/* Form Modal - SCROLLABLE */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full max-h-[90vh] flex flex-col">
            {/* Header - Fixed */}
            <div className="p-6 border-b dark:border-gray-700 flex items-center justify-between flex-shrink-0">
              <h2 className="text-2xl font-bold dark:text-white">
                {editingCategory ? 'Edit Kategori' : 'Tambah Kategori'}
              </h2>
              <button onClick={handleCloseForm} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
                ✕
              </button>
            </div>

            {/* Form Content - Scrollable */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-semibold mb-1 dark:text-white">
                    Nama Kategori <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="w-full p-2 border dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                    placeholder="Contoh: Makanan"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2 dark:text-white">
                    Pilih Icon
                  </label>
                  <div className="grid grid-cols-5 gap-2">
                    {EMOJI_OPTIONS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => setFormData({ ...formData, icon: emoji })}
                        className={`p-3 text-2xl border-2 rounded-lg hover:border-blue-500 ${
                          formData.icon === emoji
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900'
                            : 'border-gray-200 dark:border-gray-600'
                        }`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                  <div className="mt-2">
                    <input
                      type="text"
                      value={formData.icon}
                      onChange={(e) =>
                        setFormData({ ...formData, icon: e.target.value })
                      }
                      className="w-full p-2 border dark:border-gray-600 rounded-lg text-center text-2xl dark:bg-gray-700 dark:text-white"
                      placeholder="Atau ketik emoji"
                      maxLength={2}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2 dark:text-white">
                    Pilih Warna
                  </label>
                  <div className="grid grid-cols-5 gap-2">
                    {COLOR_OPTIONS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setFormData({ ...formData, color })}
                        className={`w-full h-10 rounded-lg border-2 ${
                          formData.color === color
                            ? 'border-gray-800 scale-110'
                            : 'border-gray-200'
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                  <div className="mt-2">
                    <input
                      type="color"
                      value={formData.color}
                      onChange={(e) =>
                        setFormData({ ...formData, color: e.target.value })
                      }
                      className="w-full h-10 border dark:border-gray-600 rounded-lg cursor-pointer"
                    />
                  </div>
                </div>

                {/* Preview */}
                <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <p className="text-sm font-semibold mb-2 dark:text-white">Preview:</p>
                  <div
                    className="p-4 bg-white dark:bg-gray-800 rounded-lg border-2"
                    style={{ borderColor: formData.color }}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl"
                        style={{ backgroundColor: `${formData.color}20` }}
                      >
                        {formData.icon}
                      </div>
                      <div>
                        <p className="font-bold" style={{ color: formData.color }}>
                          {formData.name || 'Nama Kategori'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer - Fixed */}
              <div className="p-6 border-t dark:border-gray-700 flex gap-3 flex-shrink-0">
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