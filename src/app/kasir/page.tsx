/*
 * Kode di atas merupakan komponen React TypeScript
 * untuk antarmuka sistem Point of Sale (POS).
 * Komponen ini mengatur tampilan dan interaksi
 * dalam proses transaksi penjualan.
 */

"use client";

import { useState, useEffect } from "react";
import {
  Search,
  Scan,
  ShoppingCart,
  Trash2,
  User,
  Package,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCartStore } from "@/store/cartStore";
import { useSettingsStore } from "@/store/settingsStore";
import { Product, Category, Transaction } from "@/types";
import { formatCurrency } from "@/lib/utils";
import { BarcodeScanner } from "@/components/kasir/BarcodeScanner";
import { Receipt } from "@/components/shared/Receipt";
import { EnhancedCheckout } from "@/components/kasir/EnhancedCheckout";
import { NotificationBanner } from "@/components/shared/NotificationBanner";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import toast, { Toaster } from "react-hot-toast";

export default function KasirPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showScanner, setShowScanner] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [completedTransaction, setCompletedTransaction] =
    useState<Transaction | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);

  const [currentCashier, setCurrentCashier] = useState<{
    id: string;
    fullName: string;
    username: string;
    role: string;
  } | null>(null);

  const [editingQuantity, setEditingQuantity] = useState<string | null>(null);
  const [quantityInput, setQuantityInput] = useState<string>("");

  const {
    items,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    loadCart,
    getSubtotal,
  } = useCartStore();
  const { store, setStore } = useSettingsStore();

  useEffect(() => {
    verifyAndLoadSession();
    loadCart();
    loadProducts();
    loadCategories();
    loadStoreSettings();
  }, []);

  const verifyAndLoadSession = () => {
    const sessionData = localStorage.getItem("cashier_session");

    if (!sessionData) {
      toast.error("Session tidak ditemukan. Silakan login kembali.");
      router.push("/login");
      return;
    }

    try {
      const session = JSON.parse(sessionData);

      if (!session.userId || !session.fullName) {
        throw new Error("Invalid session data");
      }

      setCurrentCashier({
        id: session.userId,
        fullName: session.fullName,
        username: session.username || session.fullName,
        role: session.role || "CASHIER",
      });

      console.log("✅ Cashier logged in:", {
        id: session.userId,
        name: session.fullName,
        timestamp: new Date().toISOString(),
      });
    } catch (e) {
      console.error("Failed to parse session:", e);
      toast.error("Session tidak valid. Silakan login kembali.");
      router.push("/login");
    }
  };

  const handleLogout = () => {
    if (items.length > 0) {
      if (!confirm("Keranjang masih ada item. Yakin ingin logout?")) {
        return;
      }
    }

    localStorage.removeItem("cashier_session");
    clearCart();
    router.push("/login");
  };

  const loadStoreSettings = async () => {
    try {
      const res = await fetch("/api/settings?storeId=demo-store");
      if (res.ok) {
        const data = await res.json();
        setStore(data);
      }
    } catch (error) {
      console.error("Failed to load store settings:", error);
    }
  };

  const loadProducts = async () => {
    try {
      const res = await fetch(
        `/api/products?storeId=${store?.id || "demo-store"}&limit=1000`,
      );
      const data = await res.json();

      if (data.products && Array.isArray(data.products)) {
        setProducts(data.products);
      } else if (Array.isArray(data)) {
        setProducts(data);
      } else {
        setProducts([]);
      }
    } catch (error) {
      console.error("Error loading products:", error);
      toast.error("Gagal memuat produk");
      setProducts([]);
    }
  };

  const loadCategories = async () => {
    try {
      const res = await fetch(
        `/api/categories?storeId=${store?.id || "demo-store"}`,
      );
      const data = await res.json();
      setCategories(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error loading categories:", error);
      setCategories([]);
    }
  };

  const filteredProducts = products.filter((product) => {
    const matchCategory =
      selectedCategory === "all" || product.categoryId === selectedCategory;
    const matchSearch =
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.sku?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCategory && matchSearch && product.isActive;
  });

  const handleAddToCart = (product: Product) => {
    if (product.stock <= 0) {
      toast.error("Stok habis!");
      return;
    }
    addItem({
      productId: product.id,
      name: product.name,
      price: product.price,
      image: product.image,
      discount: 0,
      maxStock: product.stock,
    });
    toast.success(`${product.name} ditambahkan`);
  };

  const handleScanBarcode = async (barcode: string) => {
    try {
      const res = await fetch(
        `/api/products?storeId=${store?.id || "demo-store"}&barcode=${barcode}`,
      );
      const data = await res.json();

      let productList = [];
      if (data.products && Array.isArray(data.products)) {
        productList = data.products;
      } else if (Array.isArray(data)) {
        productList = data;
      }

      if (productList.length > 0) {
        handleAddToCart(productList[0]);
      } else {
        toast.error("Produk tidak ditemukan");
      }
    } catch (error) {
      toast.error("Gagal mencari produk");
    }
  };

  const handleQuantityInputStart = (
    productId: string,
    currentQuantity: number,
  ) => {
    setEditingQuantity(productId);
    setQuantityInput(currentQuantity.toString());
  };

  const handleQuantityInputChange = (value: string) => {
    if (value === "" || /^\d+$/.test(value)) {
      setQuantityInput(value);
    }
  };

  const handleQuantityInputSubmit = (productId: string, maxStock: number) => {
    const newQuantity = parseInt(quantityInput) || 0;

    if (newQuantity <= 0) {
      toast.error("Quantity harus lebih dari 0!");
      setEditingQuantity(null);
      return;
    }

    if (newQuantity > maxStock) {
      toast.error(`Stok tidak cukup! Maksimal: ${maxStock}`);
      setQuantityInput(maxStock.toString());
      return;
    }

    updateQuantity(productId, newQuantity);
    setEditingQuantity(null);
    toast.success("Quantity diupdate");
  };

  const handleQuantityInputBlur = (productId: string, maxStock: number) => {
    if (quantityInput) {
      handleQuantityInputSubmit(productId, maxStock);
    } else {
      setEditingQuantity(null);
    }
  };

  const subtotal = getSubtotal();
  const taxRate = store?.taxRate || 0;
  const tax = taxRate > 0 ? (subtotal * taxRate) / 100 : 0;
  const total = subtotal + tax;

  if (!currentCashier) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Memuat session...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <NotificationBanner />
      <Toaster position="top-right" />

      <div className="flex h-full bg-gray-50 dark:bg-gray-900">
        <div className="flex-1 flex flex-col overflow-hidden">
          <header className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 px-6 py-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <ThemeToggle />
                <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 dark:bg-blue-900 rounded-lg">
                  <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span className="text-sm font-semibold text-blue-800 dark:text-blue-200">
                    {currentCashier.fullName}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-4">
                {taxRate > 0 && (
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Pajak: {taxRate}%
                  </div>
                )}
              </div>
            </div>

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

            <div className="flex gap-2 mt-4 overflow-x-auto">
              <button
                onClick={() => setSelectedCategory("all")}
                className={`px-4 py-2 rounded-lg whitespace-nowrap ${
                  selectedCategory === "all"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
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
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                  }`}
                >
                  {cat.icon} {cat.name}
                </button>
              ))}
            </div>
          </header>

          <div className="flex-1 overflow-y-auto p-6">
            {filteredProducts.length === 0 ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-center text-gray-400">
                  <Package className="w-16 h-16 mx-auto mb-2 opacity-50" />
                  <p>Tidak ada produk ditemukan</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 pt-20 px-4">
                {filteredProducts.map((product) => {
                  const isOutOfStock = product.stock <= 0;
                  const isLowStock =
                    product.stock <= product.minStock && !isOutOfStock;

                  return (
                    <button
                      key={product.id}
                      onClick={() => handleAddToCart(product)}
                      disabled={isOutOfStock}
                      className="group relative disabled:opacity-60 disabled:cursor-not-allowed mb-16"
                    >
                      {/* Card Container */}
                      <div className="relative bg-white dark:bg-gray-800 rounded-2xl overflow-visible pt-16 pb-4 px-4 hover:shadow-xl transition-all duration-300 border-2 border-gray-400 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500">
                        {/* Floating Image */}
                        <div className="absolute -top-16 left-1/2 transform -translate-x-1/2 z-10">
                          <div className="relative w-32 h-32 group-hover:scale-105 transition-transform duration-300">
                            {/* Shadow di bawah gambar */}
                            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/20 rounded-full blur-xl transform translate-y-2" />

                            {/* Image Bulat - TETAP JELAS! */}
                            <div className="relative w-32 h-32 rounded-full overflow-hidden bg-white shadow-2xl ring-3 ring-gray-400 dark:ring-gray-600">
                              {product.image ? (
                                <img
                                  src={product.image}
                                  alt={product.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800">
                                  <span className="text-6xl">🍽️</span>
                                </div>
                              )}

                              {/* Out of Stock Overlay - GAMBAR TETAP JELAS! */}
                              {isOutOfStock && (
                                <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center">
                                  {/* Icon X Merah */}
                                  <div className="w-20 h-20 rounded- flex items-center justify-center shadow-2xl">
                                    <svg
                                      className="w-12 h-12 text-white"
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                      strokeWidth={3}
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M6 18L18 6M6 6l12 12"
                                      />
                                    </svg>
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Stock Badge */}
                            {!isOutOfStock && (
                              <div
                                className={`absolute -top-1 -right-1 ${
                                  isLowStock
                                    ? "bg-orange-500"
                                    : "bg-emerald-500"
                                } text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-lg`}
                              >
                                {product.stock}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Product Info */}
                        <div className="text-center mt-6 space-y-1">
                          <h3 className="font-semibold text-gray-900 dark:text-white leading-snug line-clamp-2 min-h-[44px] text-lg tracking-tight">
                            {product.name}
                          </h3>

                          <p className="text-sm text-gray-500 dark:text-gray-400 font-medium tracking-wide">
                            {formatCurrency(product.price)}
                          </p>

                          {/* Stock Status */}
                          <p
                            className={`text-xs font-medium ${
                              isOutOfStock
                                ? "text-red-600 dark:text-red-400"
                                : isLowStock
                                  ? "text-orange-600 dark:text-orange-400"
                                  : "text-emerald-600 dark:text-emerald-400"
                            }`}
                          >
                            {isOutOfStock
                              ? "Habis"
                              : `${product.stock} tersedia`}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* CART PANEL */}
        <div className="w-96 bg-white dark:bg-gray-800 border-l dark:border-gray-700 flex flex-col">
          <div className="p-4 border-b dark:border-gray-700">
            <h2 className="text-xl font-bold flex items-center gap-2 dark:text-white">
              <ShoppingCart className="w-6 h-6" />
              Keranjang ({items.length})
            </h2>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {items.length === 0 ? (
              <div className="text-center text-gray-400 mt-20">
                <ShoppingCart className="w-16 h-16 mx-auto mb-2" />
                <p>Keranjang kosong</p>
              </div>
            ) : (
              <div className="space-y-3">
                {items.map((item) => {
                  const maxStock = item.maxStock || 999;

                  return (
                    <div
                      key={item.productId}
                      className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-semibold text-sm flex-1 dark:text-white">
                          {item.name}
                        </h4>
                        <button
                          onClick={() => removeItem(item.productId)}
                          className="text-red-600 hover:text-red-700 ml-2 p-1 rounded hover:bg-red-50 dark:hover:bg-red-900"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() =>
                              updateQuantity(item.productId, item.quantity - 1)
                            }
                            className="w-8 h-8 bg-gray-200 dark:bg-gray-600 rounded hover:bg-gray-300 dark:hover:bg-gray-500 flex items-center justify-center font-bold"
                          >
                            -
                          </button>

                          {editingQuantity === item.productId ? (
                            <input
                              type="text"
                              value={quantityInput}
                              onChange={(e) =>
                                handleQuantityInputChange(e.target.value)
                              }
                              onBlur={() =>
                                handleQuantityInputBlur(
                                  item.productId,
                                  maxStock,
                                )
                              }
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  handleQuantityInputSubmit(
                                    item.productId,
                                    maxStock,
                                  );
                                } else if (e.key === "Escape") {
                                  setEditingQuantity(null);
                                }
                              }}
                              className="w-16 text-center font-semibold border-2 border-blue-500 rounded px-1 py-1 dark:bg-gray-600 dark:text-white"
                              autoFocus
                            />
                          ) : (
                            <button
                              onClick={() =>
                                handleQuantityInputStart(
                                  item.productId,
                                  item.quantity,
                                )
                              }
                              className="w-16 text-center font-semibold dark:text-white hover:bg-gray-200 dark:hover:bg-gray-600 rounded py-1"
                              title="Klik untuk input manual"
                            >
                              {item.quantity}
                            </button>
                          )}

                          <button
                            onClick={() => {
                              if (item.quantity >= maxStock) {
                                toast.error(`Stok maksimal: ${maxStock}`);
                                return;
                              }
                              updateQuantity(item.productId, item.quantity + 1);
                            }}
                            className="w-8 h-8 bg-gray-200 dark:bg-gray-600 rounded hover:bg-gray-300 dark:hover:bg-gray-500 flex items-center justify-center font-bold"
                          >
                            +
                          </button>
                        </div>

                        <div className="text-right">
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {formatCurrency(item.price)}
                          </p>
                          <p className="font-bold dark:text-white">
                            {formatCurrency(item.subtotal)}
                          </p>
                        </div>
                      </div>

                      <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                        Stok tersedia: {maxStock}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="border-t dark:border-gray-700 p-4">
            <div className="space-y-2 mb-4">
              <div className="flex justify-between">
                <span className="dark:text-gray-300">Subtotal:</span>
                <span className="font-semibold dark:text-white">
                  {formatCurrency(subtotal)}
                </span>
              </div>
              {tax > 0 && (
                <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                  <span>Pajak ({taxRate}%):</span>
                  <span>{formatCurrency(tax)}</span>
                </div>
              )}
              <div className="flex justify-between text-2xl font-bold text-blue-600 dark:text-blue-400 pt-2 border-t dark:border-gray-600">
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

      <BarcodeScanner
        isOpen={showScanner}
        onClose={() => setShowScanner(false)}
        onScan={handleScanBarcode}
      />
      <EnhancedCheckout
        isOpen={showCheckout}
        onClose={() => setShowCheckout(false)}
        subtotal={subtotal}
        tax={tax}
        total={total}
        items={items}
        currentCashier={currentCashier}
        products={products}
        storeId={store?.id || "demo-store"}
        onComplete={async (paymentData) => {
          const transactionData = {
            items: items.map((item) => {
              const product = products.find((p) => p.id === item.productId);
              return {
                productId: item.productId,
                name: item.name,
                quantity: item.quantity,
                price: item.price,
                subtotal: item.subtotal,
                discount: item.discount || 0,
                // ✅ Include item notes from checkout
                notes: paymentData.itemNotes?.[item.productId] || undefined,
              };
            }),
            subtotal,
            tax,
            discount: paymentData.promoDiscount || 0,
            total: total - (paymentData.promoDiscount || 0),
            paymentMethod: paymentData.paymentMethod,
            paymentChannel: paymentData.paymentChannel,
            amountPaid: paymentData.amountPaid,
            change: paymentData.change,
            customerName: paymentData.customerName,
            customerPhone: paymentData.customerPhone,
            notes: paymentData.notes,
            promoCode: paymentData.promoCode,
            promoDiscount: paymentData.promoDiscount || 0,
            storeId: store?.id || "demo-store",
            cashierId: currentCashier.id,

            // Kitchen Display System fields
            orderType: paymentData.orderType,
            tableNumber: paymentData.tableNumber,
          };

          const res = await fetch("/api/transactions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(transactionData),
          });

          if (!res.ok) throw new Error("Failed to create transaction");

          const transaction = await res.json();
          toast.success("Transaksi berhasil!");

          setCompletedTransaction(transaction);
          setShowCheckout(false);
          setShowReceipt(true);
          clearCart();
          loadProducts();
        }}
      />

      {completedTransaction && (
        <Receipt
          transaction={completedTransaction}
          storeName={store?.name || "Toko Modern"}
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
