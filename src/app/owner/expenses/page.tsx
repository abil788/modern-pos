/**
 * Komponen ExpensesPage digunakan untuk mengelola pengeluaran operasional toko.
 * Komponen ini memungkinkan pengguna untuk menambah, mengedit, dan menghapus data
 * pengeluaran, serta melihat detail pengeluaran dengan fitur pagination dan filter.
 *
 * Komponen ini menampilkan elemen UI seperti header halaman, kartu ringkasan,
 * filter data, tabel pengeluaran, pagination, dan modal form untuk menambah
 * atau mengedit pengeluaran. Data pengeluaran diambil dari API, mendukung
 * pencarian dan penyaringan, serta menyediakan fungsi CRUD pengeluaran.
 */
'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Search, DollarSign, Calendar, TrendingDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { Expense } from '@/types';
import { formatCurrency, formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';
import { getClientStoreId } from '@/lib/store-config';

const EXPENSE_CATEGORIES = [
  'Sewa',
  'Listrik',
  'Air',
  'Gaji',
  'Transportasi',
  'Pembelian Stok',
  'Marketing',
  'Perbaikan',
  'Internet',
  'Telepon',
  'Pajak',
  'Asuransi',
  'Perlengkapan',
  'Lain-lain',
];

const ITEMS_PER_PAGE = 5;

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMonth, setFilterMonth] = useState(new Date().toISOString().slice(0, 7));
  const [filterCategory, setFilterCategory] = useState('');
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  
  const [formData, setFormData] = useState({
    category: '',
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    loadExpenses();
  }, [currentPage, searchQuery, filterMonth, filterCategory]);

  const loadExpenses = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        storeId: getClientStoreId(),
        page: currentPage.toString(),
        limit: ITEMS_PER_PAGE.toString(),
      });

      if (searchQuery) {
        params.append('search', searchQuery);
      }

      if (filterMonth) {
        params.append('month', filterMonth);
      }

      if (filterCategory) {
        params.append('category', filterCategory);
      }

      const res = await fetch(`/api/expenses?${params}`);
      const data = await res.json();
      
      if (data.expenses && Array.isArray(data.expenses)) {
        setExpenses(data.expenses);
        setTotalPages(data.pagination?.totalPages || 1);
        setTotalCount(data.pagination?.totalCount || 0);
      } else if (Array.isArray(data)) {
        // Fallback for old API format
        setExpenses(data);
      } else {
        setExpenses([]);
      }
    } catch (error) {
      toast.error('Gagal memuat data pengeluaran');
      setExpenses([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.category || !formData.amount) {
      toast.error('Kategori dan jumlah harus diisi!');
      return;
    }

    try {
      const endpoint = editingExpense
        ? `/api/expenses/${editingExpense.id}`
        : '/api/expenses';
      const method = editingExpense ? 'PUT' : 'POST';

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          storeId: getClientStoreId(),
        }),
      });

      if (!res.ok) throw new Error('Failed to save');

      toast.success(
        editingExpense
          ? 'Pengeluaran berhasil diupdate!'
          : 'Pengeluaran berhasil ditambahkan!'
      );

      loadExpenses();
      handleCloseForm();
    } catch (error) {
      toast.error('Gagal menyimpan pengeluaran');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Yakin ingin menghapus pengeluaran ini?')) return;

    try {
      const res = await fetch(`/api/expenses/${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error('Failed to delete');

      toast.success('Pengeluaran berhasil dihapus');
      loadExpenses();
    } catch (error) {
      toast.error('Gagal menghapus pengeluaran');
    }
  };

  const handleEdit = (expense: Expense) => {
    setEditingExpense(expense);
    setFormData({
      category: expense.category,
      amount: expense.amount.toString(),
      description: expense.description || '',
      date: new Date(expense.date).toISOString().split('T')[0],
    });
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingExpense(null);
    setFormData({
      category: '',
      amount: '',
      description: '',
      date: new Date().toISOString().split('T')[0],
    });
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  const handleFilterChange = (month: string, category: string) => {
    setFilterMonth(month);
    setFilterCategory(category);
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

  // Group by category
  const byCategory = expenses.reduce((acc, expense) => {
    if (!acc[expense.category]) {
      acc[expense.category] = 0;
    }
    acc[expense.category] += expense.amount;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Manajemen Pengeluaran</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Kelola pengeluaran operasional toko • Total: {totalCount} pengeluaran
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Tambah Pengeluaran
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-gradient-to-r from-red-500 to-red-600 rounded-lg shadow p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-red-100 mb-1">Total Pengeluaran</p>
              <p className="text-3xl font-bold">{formatCurrency(totalExpenses)}</p>
              <p className="text-red-100 text-sm mt-2">
                {expenses.length} transaksi (halaman ini)
              </p>
            </div>
            <div className="p-4 bg-white bg-opacity-20 rounded-lg">
              <DollarSign className="w-12 h-12" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center gap-3 mb-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            <p className="text-gray-500 dark:text-gray-400 text-sm">Rata-rata per Hari</p>
          </div>
          <p className="text-2xl font-bold dark:text-white">
            {formatCurrency(
              expenses.length > 0
                ? totalExpenses / 30
                : 0
            )}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center gap-3 mb-2">
            <TrendingDown className="w-5 h-5 text-orange-600" />
            <p className="text-gray-500 dark:text-gray-400 text-sm">Kategori Terbanyak</p>
          </div>
          <p className="text-xl font-bold dark:text-white">
            {Object.entries(byCategory).sort((a, b) => b[1] - a[1])[0]?.[0] || '-'}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Cari pengeluaran..."
              className="w-full pl-10 pr-4 py-2 border dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
            />
          </div>

          <div>
            <input
              type="month"
              value={filterMonth}
              onChange={(e) => handleFilterChange(e.target.value, filterCategory)}
              className="w-full p-2 border dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
            />
          </div>

          <div>
            <select
              value={filterCategory}
              onChange={(e) => handleFilterChange(filterMonth, e.target.value)}
              className="w-full p-2 border dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
            >
              <option value="">Semua Kategori</option>
              {EXPENSE_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                  Tanggal
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                  Kategori
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                  Deskripsi
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                  Jumlah
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center">
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                  </td>
                </tr>
              ) : expenses.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                    <DollarSign className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                    <p>Belum ada pengeluaran</p>
                  </td>
                </tr>
              ) : (
                expenses.map((expense) => (
                  <tr key={expense.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        {formatDate(expense.date)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-3 py-1 bg-gray-100 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-full text-sm font-semibold">
                        {expense.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                      {expense.description || '-'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-red-600 dark:text-red-400 font-bold">
                        -{formatCurrency(expense.amount)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEdit(expense)}
                          className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900 rounded"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(expense.id)}
                          className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-gray-50 dark:bg-gray-700 px-6 py-4 border-t dark:border-gray-600">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Halaman {currentPage} dari {totalPages} • Total {totalCount} pengeluaran
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="px-3 py-2 border dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed dark:text-white"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                
                {/* Page numbers */}
                <div className="flex gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    
                    return (
                      <button
                        key={pageNum}
                        onClick={() => handlePageChange(pageNum)}
                        className={`px-3 py-2 border dark:border-gray-600 rounded-lg ${
                          currentPage === pageNum
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'hover:bg-gray-100 dark:hover:bg-gray-600 dark:text-white'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="px-3 py-2 border dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed dark:text-white"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full">
            <div className="p-6 border-b dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-2xl font-bold dark:text-white">
                {editingExpense ? 'Edit Pengeluaran' : 'Tambah Pengeluaran'}
              </h2>
              <button onClick={handleCloseForm} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-1 dark:text-white">
                  Kategori <span className="text-red-600">*</span>
                </label>
                <select
                  value={formData.category}
                  onChange={(e) =>
                    setFormData({ ...formData, category: e.target.value })
                  }
                  className="w-full p-2 border dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                  required
                >
                  <option value="">Pilih Kategori</option>
                  {EXPENSE_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1 dark:text-white">
                  Jumlah <span className="text-red-600">*</span>
                </label>
                <input
                  type="number"
                  value={formData.amount}
                  onChange={(e) =>
                    setFormData({ ...formData, amount: e.target.value })
                  }
                  className="w-full p-2 border dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                  required
                  min="0"
                  step="1000"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1 dark:text-white">Tanggal</label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) =>
                    setFormData({ ...formData, date: e.target.value })
                  }
                  className="w-full p-2 border dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1 dark:text-white">Deskripsi</label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className="w-full p-2 border dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                  rows={3}
                  placeholder="Keterangan tambahan..."
                />
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