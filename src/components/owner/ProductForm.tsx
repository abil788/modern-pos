'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Product, Category } from '@/types';
import { generateSKU } from '@/lib/utils';
import toast from 'react-hot-toast';

interface ProductFormProps {
  product?: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function ProductForm({ product, isOpen, onClose, onSuccess }: ProductFormProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    barcode: '',
    description: '',
    price: '',
    cost: '',
    stock: '',
    minStock: '5',
    categoryId: '',
    image: '',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadCategories();
      if (product) {
        setFormData({
          name: product.name,
          sku: product.sku || '',
          barcode: product.barcode || '',
          description: product.description || '',
          price: product.price.toString(),
          cost: product.cost.toString(),
          stock: product.stock.toString(),
          minStock: product.minStock.toString(),
          categoryId: product.categoryId || '',
          image: product.image || '',
        });
      } else {
        // Reset form for new product
        setFormData({
          name: '',
          sku: '',
          barcode: '',
          description: '',
          price: '',
          cost: '0',
          stock: '0',
          minStock: '5',
          categoryId: '',
          image: '',
        });
      }
    }
  }, [isOpen, product]);

  const loadCategories = async () => {
    try {
      const res = await fetch('/api/categories?storeId=demo-store');
      const data = await res.json();
      setCategories(data);
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleGenerateSKU = () => {
    if (formData.name) {
      const sku = generateSKU(formData.name);
      setFormData(prev => ({ ...prev, sku }));
      toast.success('SKU generated!');
    } else {
      toast.error('Masukkan nama produk terlebih dahulu');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.price) {
      toast.error('Nama dan harga harus diisi!');
      return;
    }

    try {
      setLoading(true);
      
      const endpoint = product ? `/api/products/${product.id}` : '/api/products';
      const method = product ? 'PUT' : 'POST';
      
      const body = {
        ...formData,
        price: parseFloat(formData.price),
        cost: parseFloat(formData.cost || '0'),
        stock: parseInt(formData.stock || '0'),
        minStock: parseInt(formData.minStock || '5'),
        storeId: 'demo-store',
      };

      console.log('Submitting product:', body);

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to save product');
      }

      toast.success(product ? 'Produk berhasil diupdate!' : 'Produk berhasil ditambahkan!');
      onSuccess();
      onClose();
      
    } catch (error: any) {
      console.error('Save product error:', error);
      toast.error(error.message || 'Gagal menyimpan produk');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b dark:border-gray-700 flex items-center justify-between sticky top-0 bg-white dark:bg-gray-800 z-10">
          <h2 className="text-2xl font-bold dark:text-white">
            {product ? 'Edit Produk' : 'Tambah Produk'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
            <X className="w-6 h-6 dark:text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-1 dark:text-white">
              Nama Produk <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="w-full p-2 border dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
              required
              placeholder="Contoh: Nasi Goreng"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-1 dark:text-white">SKU</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  name="sku"
                  value={formData.sku}
                  onChange={handleChange}
                  className="flex-1 p-2 border dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                  placeholder="AUTO-001"
                />
                <button
                  type="button"
                  onClick={handleGenerateSKU}
                  className="px-3 py-2 bg-gray-200 dark:bg-gray-600 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 text-sm whitespace-nowrap"
                >
                  Generate
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1 dark:text-white">Barcode</label>
              <input
                type="text"
                name="barcode"
                value={formData.barcode}
                onChange={handleChange}
                className="w-full p-2 border dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                placeholder="1234567890123"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1 dark:text-white">Deskripsi</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              className="w-full p-2 border dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
              rows={3}
              placeholder="Deskripsi produk (opsional)"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-1 dark:text-white">
                Harga Jual <span className="text-red-600">*</span>
              </label>
              <input
                type="number"
                name="price"
                value={formData.price}
                onChange={handleChange}
                className="w-full p-2 border dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                required
                min="0"
                step="100"
                placeholder="25000"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1 dark:text-white">Harga Modal</label>
              <input
                type="number"
                name="cost"
                value={formData.cost}
                onChange={handleChange}
                className="w-full p-2 border dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                min="0"
                step="100"
                placeholder="15000"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-1 dark:text-white">Stok Awal</label>
              <input
                type="number"
                name="stock"
                value={formData.stock}
                onChange={handleChange}
                className="w-full p-2 border dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                min="0"
                placeholder="100"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1 dark:text-white">Stok Minimum</label>
              <input
                type="number"
                name="minStock"
                value={formData.minStock}
                onChange={handleChange}
                className="w-full p-2 border dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                min="0"
                placeholder="5"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1 dark:text-white">Kategori</label>
            <select
              name="categoryId"
              value={formData.categoryId}
              onChange={handleChange}
              className="w-full p-2 border dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
            >
              <option value="">Pilih Kategori (Opsional)</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.icon} {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1 dark:text-white">URL Gambar</label>
            <input
              type="text"
              name="image"
              value={formData.image}
              onChange={handleChange}
              className="w-full p-2 border dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
              placeholder="https://example.com/image.jpg (opsional)"
            />
          </div>

          <div className="flex gap-3 pt-4 sticky bottom-0 bg-white dark:bg-gray-800 border-t dark:border-gray-700 -mx-6 -mb-6 px-6 py-4">
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
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {loading ? 'Menyimpan...' : 'Simpan Produk'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}