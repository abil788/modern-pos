'use client';

import { useState, useEffect } from 'react';
import { Search, Scan, ShoppingCart, Menu } from 'lucide-react';
import { useCartStore } from '@/store/cartStore';
import { useSettingsStore } from '@/store/settingsStore';
import { Product, Category, Transaction } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { BarcodeScanner } from '@/components/kasir/BarcodeScanner';
import { Receipt } from '@/components/shared/Receipt';
import { NotificationBanner } from '@/components/shared/NotificationBanner';
import { ThemeToggle } from '@/components/shared/ThemeToggle';
import toast, { Toaster } from 'react-hot-toast';

export default function KasirPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [completedTransaction, setCompletedTransaction] = useState<Transaction | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);
  
  // Checkout state
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'CARD' | 'QRIS' | 'TRANSFER'>('CASH');
  const [amountPaid, setAmountPaid] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { items, addItem, removeItem, updateQuantity, getTotal, getSubtotal, clearCart, loadCart } = useCartStore();
  const { store } = useSettingsStore();

  useEffect(() => {
    loadCart();
    loadProducts();
    loadCategories();
  }, []);

  const loadProducts = async () => {
    try {
      const res = await fetch(`/api/products?storeId=${store?.id || 'demo-store'}`);
      const data = await res.json();
      setProducts(data);
    } catch (error) {
      toast.error('Gagal memuat produk');
    }
  };

  const loadCategories = async () => {
    try {
      const res = await fetch(`/api/categories?storeId=${store?.id || 'demo-store'}`);
      const data = await res.json();
      setCategories(data);
    } catch (error) {
      toast.error('Gagal memuat kategori');
    }
  };

  const filteredProducts = products.filter((product) => {
    const matchCategory = selectedCategory === 'all' || product.categoryId === selectedCategory;
    const matchSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                       product.sku?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCategory && matchSearch && product.isActive;
  });

  const handleAddToCart = (product: Product) => {
    if (product.stock <= 0) {
      toast.error('Stok habis!');
      return;
    }
    addItem({
      productId: product.id,
      name: product.name,
      price: product.price,
      image: product.image,
      discount: 0,
    });
    toast.success(`${product.name} ditambahkan`);
  };

  const handleScanBarcode = async (barcode: string) => {
    try {
      const res = await fetch(`/api/products?storeId=${store?.id || 'demo-store'}&barcode=${barcode}`);
      const data = await res.json();
      
      if (data.length > 0) {
        const product = data[0];
        handleAddToCart(product);
      } else {
        toast.error('Produk tidak ditemukan');
      }
    } catch (error) {
      toast.error('Gagal mencari produk');
    }
  };

  const handleCheckout = async () => {
    if (items.length === 0) {
      toast.error('Keranjang kosong!');
      return;
    }

    const subtotal = getSubtotal();
    const tax = store?.taxRate ? (subtotal * store.taxRate) / 100 : 0;
    const total = subtotal + tax;
    const paid = parseFloat(amountPaid) || 0;
    const change = paid - total;

    if (paymentMethod === 'CASH' && paid < total) {
      toast.error('Jumlah bayar kurang!');
      return;
    }

    try {
      setLoading(true);
      
      const transactionData = {
        items: items.map(item => ({
          productId: item.productId,
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          subtotal: item.subtotal,
          discount: item.discount || 0,
        })),
        subtotal,
        tax,
        discount: 0,
        total,
        paymentMethod,
        amountPaid: paid,
        change: Math.max(0, change),
        customerName: customerName || undefined,
        notes: notes || undefined,
        storeId: store?.id || 'demo-store',
      };

      console.log('Sending transaction:', transactionData);

      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(transactionData),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to create transaction');
      }

      const transaction = await res.json();
      
      toast.success('Transaksi berhasil!');
      
      setCompletedTransaction(transaction);
      setShowCheckout(false);
      setShowReceipt(true);
      clearCart();
      
      // Reset checkout form
      setAmountPaid('');
      setCustomerName('');
      setNotes('');
      setPaymentMethod('CASH');
      
    } catch (error: any) {
      console.error('Transaction error:', error);
      toast.error(error.message || 'Gagal memproses transaksi');
    } finally {
      setLoading(false);
    }
  };

  const subtotal = getSubtotal();
  const tax = store?.taxRate ? (subtotal * store.taxRate) / 100 : 0;
  const total = subtotal + tax;
  const paid = parseFloat(amountPaid) || 0;
  const change = paid - total;

  return (
    <>
      <NotificationBanner />
      <Toaster position="top-right" />
      
      <div className="flex h-full bg-gray-50 dark:bg-gray-900">
        {/* Product Grid */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <header className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 px-6 py-4">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Kasir POS</h1>
              <ThemeToggle />
            </div>

            {/* Search & Scanner */}
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Cari produk atau SKU..."
                  className="w-full pl-10 pr-4 py-2 border dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <button
                onClick={() => setShowScanner(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                <Scan className="w-5 h-5" />
                Scan
              </button>
            </div>

            {/* Categories */}
            <div className="flex gap-2 mt-4 overflow-x-auto">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`px-4 py-2 rounded-lg whitespace-nowrap ${
                  selectedCategory === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                Semua
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-4 py-2 rounded-lg whitespace-nowrap ${
                    selectedCategory === cat.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {cat.icon} {cat.name}
                </button>
              ))}
            </div>
          </header>

          {/* Products Grid */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {filteredProducts.map((product) => (
                <button
                  key={product.id}
                  onClick={() => handleAddToCart(product)}
                  className="bg-white dark:bg-gray-800 rounded-lg p-4 hover:shadow-lg transition-shadow border dark:border-gray-700"
                  disabled={product.stock <= 0}
                >
                  {product.image ? (
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-full h-32 object-cover rounded-lg mb-2"
                    />
                  ) : (
                    <div className="w-full h-32 bg-gray-200 dark:bg-gray-700 rounded-lg mb-2 flex items-center justify-center">
                      <span className="text-4xl">📦</span>
                    </div>
                  )}
                  <h3 className="font-semibold text-sm mb-1 truncate dark:text-white">{product.name}</h3>
                  <p className="text-blue-600 dark:text-blue-400 font-bold">{formatCurrency(product.price)}</p>
                  <p className={`text-xs mt-1 ${product.stock <= product.minStock ? 'text-red-600' : 'text-gray-500 dark:text-gray-400'}`}>
                    Stok: {product.stock}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Cart Sidebar */}
        <div className="w-96 bg-white dark:bg-gray-800 border-l dark:border-gray-700 flex flex-col">
          <div className="p-4 border-b dark:border-gray-700">
            <h2 className="text-xl font-bold flex items-center gap-2 dark:text-white">
              <ShoppingCart className="w-6 h-6" />
              Keranjang ({items.length})
            </h2>
          </div>

          {/* Cart Items */}
          <div className="flex-1 overflow-y-auto p-4">
            {items.length === 0 ? (
              <div className="text-center text-gray-400 mt-20">
                <ShoppingCart className="w-16 h-16 mx-auto mb-2" />
                <p>Keranjang kosong</p>
              </div>
            ) : (
              <div className="space-y-3">
                {items.map((item) => (
                  <div key={item.productId} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-semibold text-sm flex-1 dark:text-white">{item.name}</h4>
                      <button
                        onClick={() => removeItem(item.productId)}
                        className="text-red-600 hover:text-red-700 ml-2"
                      >
                        ✕
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                          className="w-8 h-8 bg-gray-200 dark:bg-gray-600 rounded hover:bg-gray-300 dark:hover:bg-gray-500"
                        >
                          -
                        </button>
                        <span className="w-12 text-center font-semibold dark:text-white">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                          className="w-8 h-8 bg-gray-200 dark:bg-gray-600 rounded hover:bg-gray-300 dark:hover:bg-gray-500"
                        >
                          +
                        </button>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-500 dark:text-gray-400">{formatCurrency(item.price)}</p>
                        <p className="font-bold dark:text-white">{formatCurrency(item.subtotal)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Total & Checkout */}
          <div className="border-t dark:border-gray-700 p-4">
            <div className="space-y-2 mb-4">
              <div className="flex justify-between">
                <span className="dark:text-gray-300">Subtotal:</span>
                <span className="font-semibold dark:text-white">{formatCurrency(subtotal)}</span>
              </div>
              {tax > 0 && (
                <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                  <span>Pajak ({store?.taxRate}%):</span>
                  <span>{formatCurrency(tax)}</span>
                </div>
              )}
              <div className="flex justify-between text-2xl font-bold text-blue-600 dark:text-blue-400">
                <span>Total:</span>
                <span>{formatCurrency(total)}</span>
              </div>
            </div>
            <button
              onClick={() => setShowCheckout(true)}
              disabled={items.length === 0}
              className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-semibold text-lg"
            >
              Bayar
            </button>
          </div>
        </div>
      </div>

      {/* Barcode Scanner Modal */}
      <BarcodeScanner
        isOpen={showScanner}
        onClose={() => setShowScanner(false)}
        onScan={handleScanBarcode}
      />

      {/* Checkout Modal */}
      {showCheckout && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-2xl font-bold dark:text-white">Checkout</h2>
              <button onClick={() => setShowCheckout(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
                ✕
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Order Summary */}
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <h3 className="font-semibold mb-3 dark:text-white">Ringkasan Pesanan</h3>
                <div className="space-y-2 text-sm">
                  {items.map((item) => (
                    <div key={item.productId} className="flex justify-between dark:text-gray-300">
                      <span>{item.name} x{item.quantity}</span>
                      <span>{formatCurrency(item.subtotal)}</span>
                    </div>
                  ))}
                  <div className="border-t dark:border-gray-600 pt-2 mt-2">
                    <div className="flex justify-between dark:text-gray-300">
                      <span>Subtotal:</span>
                      <span>{formatCurrency(subtotal)}</span>
                    </div>
                    {tax > 0 && (
                      <div className="flex justify-between text-gray-600 dark:text-gray-400">
                        <span>Pajak ({store?.taxRate}%):</span>
                        <span>{formatCurrency(tax)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold text-lg mt-2 pt-2 border-t dark:border-gray-600 text-blue-600 dark:text-blue-400">
                      <span>Total:</span>
                      <span>{formatCurrency(total)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment Method */}
              <div>
                <label className="block font-semibold mb-2 dark:text-white">Metode Pembayaran</label>
                <div className="grid grid-cols-2 gap-3">
                  {(['CASH', 'CARD', 'QRIS', 'TRANSFER'] as const).map((method) => (
                    <button
                      key={method}
                      onClick={() => setPaymentMethod(method)}
                      className={`p-4 border-2 rounded-lg transition-colors ${
                        paymentMethod === method
                          ? 'border-blue-600 bg-blue-50 dark:bg-blue-900'
                          : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'
                      }`}
                    >
                      <span className="font-semibold dark:text-white">{method}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Amount Paid */}
              {paymentMethod === 'CASH' && (
                <div>
                  <label className="block font-semibold mb-2 dark:text-white">Jumlah Bayar</label>
                  <input
                    type="number"
                    value={amountPaid}
                    onChange={(e) => setAmountPaid(e.target.value)}
                    placeholder="0"
                    className="w-full p-3 border dark:border-gray-600 rounded-lg text-lg font-semibold dark:bg-gray-700 dark:text-white"
                  />
                  {change >= 0 && amountPaid && (
                    <div className="mt-2 p-3 bg-green-50 dark:bg-green-900 rounded-lg">
                      <div className="flex justify-between text-green-800 dark:text-green-200">
                        <span>Kembalian:</span>
                        <span className="font-bold text-xl">{formatCurrency(change)}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Customer Info */}
              <div>
                <label className="block text-sm font-semibold mb-1 dark:text-white">Nama Pelanggan (Opsional)</label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Nama pelanggan"
                  className="w-full p-2 border dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-semibold mb-1 dark:text-white">Catatan</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Catatan tambahan..."
                  className="w-full p-2 border dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                  rows={2}
                />
              </div>
            </div>

            <div className="p-6 border-t dark:border-gray-700 flex gap-3">
              <button
                onClick={() => setShowCheckout(false)}
                className="flex-1 px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 font-semibold"
              >
                Batal
              </button>
              <button
                onClick={handleCheckout}
                disabled={loading || (paymentMethod === 'CASH' && paid < total)}
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                {loading ? 'Memproses...' : 'Bayar Sekarang'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Receipt Modal */}
      {completedTransaction && (
        <Receipt
          transaction={completedTransaction}
          storeName={store?.name || 'Toko Modern'}
          storeAddress={store?.address}
          storePhone={store?.phone}
          receiptFooter={store?.receiptFooter}
          isOpen={showReceipt}
          onClose={() => {
            setShowReceipt(false);
            setCompletedTransaction(null);
          }}
        />
      )}
    </>
  );
}