"use client";

import { useState, useEffect } from "react";
import { Search, Scan, ShoppingCart, Trash2, User, LogOut, Tag, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCartStore } from "@/store/cartStore";
import { useSettingsStore } from "@/store/settingsStore";
import { Product, Category, Transaction } from "@/types";
import { formatCurrency } from "@/lib/utils";
import { BarcodeScanner } from "@/components/kasir/BarcodeScanner";
import { Receipt } from "@/components/shared/Receipt";
import { NotificationBanner } from "@/components/shared/NotificationBanner";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import toast, { Toaster } from "react-hot-toast";
import { Package } from "lucide-react";

export default function KasirPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showScanner, setShowScanner] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [completedTransaction, setCompletedTransaction] = useState<Transaction | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [loading, setLoading] = useState(false);

  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "CARD" | "QRIS" | "TRANSFER">("CASH");
  const [amountPaid, setAmountPaid] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [notes, setNotes] = useState("");

  // 🆕 PROMO STATE
  const [promoCode, setPromoCode] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<any>(null);
  const [promoDiscount, setPromoDiscount] = useState(0);
  const [validatingPromo, setValidatingPromo] = useState(false);

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
        `/api/products?storeId=${store?.id || "demo-store"}&limit=1000`
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
        `/api/categories?storeId=${store?.id || "demo-store"}`
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
    
    // 🆕 Clear promo when cart changes
    if (appliedPromo) {
      setAppliedPromo(null);
      setPromoDiscount(0);
      setPromoCode("");
      toast.info("Promo dibatalkan karena keranjang berubah");
    }
  };

  const handleScanBarcode = async (barcode: string) => {
    try {
      const res = await fetch(
        `/api/products?storeId=${store?.id || "demo-store"}&barcode=${barcode}`
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
    currentQuantity: number
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
    
    // 🆕 Clear promo when quantity changes
    if (appliedPromo) {
      setAppliedPromo(null);
      setPromoDiscount(0);
      setPromoCode("");
      toast.info("Promo dibatalkan karena keranjang berubah");
    }
  };

  const handleQuantityInputBlur = (productId: string, maxStock: number) => {
    if (quantityInput) {
      handleQuantityInputSubmit(productId, maxStock);
    } else {
      setEditingQuantity(null);
    }
  };

  // 🆕🆕🆕 APPLY PROMO FUNCTION
  const handleApplyPromo = async () => {
    if (!promoCode.trim()) {
      toast.error("Masukkan kode promo");
      return;
    }

    if (items.length === 0) {
      toast.error("Keranjang masih kosong");
      return;
    }

    try {
      setValidatingPromo(true);
      
      const subtotal = getSubtotal();
      
      const res = await fetch('/api/promos/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: promoCode.toUpperCase(),
          storeId: store?.id || 'demo-store',
          subtotal,
          items: items.map(item => {
            const product = products.find(p => p.id === item.productId);
            return {
              productId: item.productId,
              categoryId: product?.categoryId,
              quantity: item.quantity,
              price: item.price,
            };
          }),
          customerPhone: customerPhone || undefined,
        }),
      });

      const result = await res.json();

      if (result.valid) {
        setAppliedPromo(result.promo);
        setPromoDiscount(result.discount);
        toast.success(result.message, { duration: 4000 });
      } else {
        setAppliedPromo(null);
        setPromoDiscount(0);
        toast.error(result.error);
      }
    } catch (error) {
      console.error('Promo validation error:', error);
      toast.error('Gagal validasi promo');
      setAppliedPromo(null);
      setPromoDiscount(0);
    } finally {
      setValidatingPromo(false);
    }
  };

  // 🆕 REMOVE PROMO
  const handleRemovePromo = () => {
    setAppliedPromo(null);
    setPromoDiscount(0);
    setPromoCode("");
    toast.success("Promo dihapus");
  };

  const handleCheckout = async () => {
    if (items.length === 0) {
      toast.error("Keranjang kosong!");
      return;
    }

    if (!currentCashier || !currentCashier.id) {
      toast.error("Session expired. Silakan login kembali.");
      router.push("/login");
      return;
    }

    const subtotal = getSubtotal();
    const taxRate = store?.taxRate || 0;
    const tax = taxRate > 0 ? (subtotal * taxRate) / 100 : 0;
    const total = subtotal + tax - promoDiscount; // 🆕 Kurangi promo discount
    const paid = parseFloat(amountPaid) || 0;
    const change = paid - total;

    if (paymentMethod === "CASH" && paid < total) {
      toast.error("Jumlah bayar kurang!");
      return;
    }

    try {
      setLoading(true);

      const transactionData = {
        items: items.map((item) => ({
          productId: item.productId,
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          subtotal: item.subtotal,
          discount: item.discount || 0,
        })),
        subtotal,
        tax,
        discount: promoDiscount, // 🆕 Include promo discount
        total,
        paymentMethod,
        amountPaid: paid,
        change: Math.max(0, change),
        customerName: customerName || undefined,
        customerPhone: customerPhone || undefined,
        notes: notes || undefined,
        promoCode: appliedPromo ? appliedPromo.code : undefined, // 🆕 NEW
        promoDiscount, // 🆕 NEW
        storeId: store?.id || "demo-store",
        cashierId: currentCashier.id,
      };

      console.log("🔄 Creating transaction with promo:", {
        promoCode: transactionData.promoCode,
        promoDiscount: transactionData.promoDiscount,
      });

      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(transactionData),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to create transaction");
      }

      const transaction = await res.json();

      console.log("✅ Transaction created:", {
        invoiceNumber: transaction.invoiceNumber,
        promoApplied: !!transaction.promoCode,
      });

      toast.success("Transaksi berhasil!");

      setCompletedTransaction(transaction);
      setShowCheckout(false);
      setShowReceipt(true);
      clearCart();

      // Reset form
      setAmountPaid("");
      setCustomerName("");
      setCustomerPhone("");
      setNotes("");
      setPaymentMethod("CASH");
      setPromoCode("");
      setAppliedPromo(null);
      setPromoDiscount(0);

      loadProducts();
    } catch (error: any) {
      console.error("❌ Transaction error:", error);
      toast.error(error.message || "Gagal memproses transaksi");
    } finally {
      setLoading(false);
    }
  };

  const quickCashAmounts = [10000, 20000, 50000, 100000, 200000, 500000];

  const handleQuickCash = (amount: number) => {
    setAmountPaid(amount.toString());
  };

  const subtotal = getSubtotal();
  const taxRate = store?.taxRate || 0;
  const tax = taxRate > 0 ? (subtotal * taxRate) / 100 : 0;
  const total = subtotal + tax - promoDiscount; // 🆕 Include promo discount
  const paid = parseFloat(amountPaid) || 0;
  const change = paid - total;

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
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {filteredProducts.map((product) => {
                  const isOutOfStock = product.stock <= 0;

                  return (
                    <button
                      key={product.id}
                      onClick={() => handleAddToCart(product)}
                      disabled={isOutOfStock}
                      className={`bg-white dark:bg-gray-800 rounded-lg p-4 hover:shadow-lg transition-shadow border dark:border-gray-700 ${
                        isOutOfStock
                          ? "opacity-50 cursor-not-allowed"
                          : "hover:border-blue-500 dark:hover:border-blue-500"
                      }`}
                    >
                      <div className="relative">
                        {product.image ? (
                          <img
                            src={product.image}
                            alt={product.name}
                            className={`w-full h-32 object-cover rounded-lg mb-2 ${
                              isOutOfStock ? "grayscale" : ""
                            }`}
                          />
                        ) : (
                          <div
                            className={`w-full h-32 bg-gray-200 dark:bg-gray-700 rounded-lg mb-2 flex items-center justify-center ${
                              isOutOfStock ? "grayscale" : ""
                            }`}
                          >
                            <span className="text-4xl">📦</span>
                          </div>
                        )}

                        {isOutOfStock && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-60 rounded-lg">
                            <span className="bg-red-600 text-white px-3 py-1 rounded-full text-xs font-bold">
                              HABIS
                            </span>
                          </div>
                        )}
                      </div>

                      <h3 className="font-semibold text-sm mb-1 truncate dark:text-white">
                        {product.name}
                      </h3>
                      <p className="text-blue-600 dark:text-blue-400 font-bold">
                        {formatCurrency(product.price)}
                      </p>
                      <p
                        className={`text-xs mt-1 font-semibold ${
                          isOutOfStock
                            ? "text-red-600 dark:text-red-400"
                            : product.stock <= product.minStock
                            ? "text-orange-600 dark:text-orange-400"
                            : "text-gray-500 dark:text-gray-400"
                        }`}
                      >
                        Stok: {product.stock}
                        {isOutOfStock && " - HABIS"}
                      </p>
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
                          onClick={() => {
                            removeItem(item.productId);
                            // Clear promo when item removed
                            if (appliedPromo) {
                              setAppliedPromo(null);
                              setPromoDiscount(0);
                              setPromoCode("");
                              toast.info("Promo dibatalkan");
                            }
                          }}
                          className="text-red-600 hover:text-red-700 ml-2 p-1 rounded hover:bg-red-50 dark:hover:bg-red-900"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              updateQuantity(item.productId, item.quantity - 1);
                              if (appliedPromo) {
                                setAppliedPromo(null);
                                setPromoDiscount(0);
                                setPromoCode("");
                                toast.info("Promo dibatalkan");
                              }
                            }}
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
                                  maxStock
                                )
                              }
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  handleQuantityInputSubmit(
                                    item.productId,
                                    maxStock
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
                                  item.quantity
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
                              if (appliedPromo) {
                                setAppliedPromo(null);
                                setPromoDiscount(0);
                                setPromoCode("");
                                toast.info("Promo dibatalkan");
                              }
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

          {/* 🆕🆕🆕 PROMO SECTION */}
          {items.length > 0 && (
            <div className="border-t dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-700/50">
              <label className="block text-sm font-semibold mb-2 dark:text-white flex items-center gap-2">
                <Tag className="w-4 h-4" />
                Kode Promo
              </label>
              
              {appliedPromo ? (
                <div className="bg-green-50 dark:bg-green-900/20 border-2 border-green-500 rounded-lg p-3">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <p className="text-sm font-bold text-green-800 dark:text-green-200">
                        ✓ {appliedPromo.name}
                      </p>
                      <p className="text-xs text-green-700 dark:text-green-300">
                        Kode: {appliedPromo.code}
                      </p>
                    </div>
                    <button
                      onClick={handleRemovePromo}
                      className="p-1 hover:bg-green-100 dark:hover:bg-green-800 rounded"
                    >
                      <X className="w-4 h-4 text-green-700 dark:text-green-300" />
                    </button>
                  </div>
                  <p className="text-lg font-bold text-green-600 dark:text-green-400">
                    Hemat: {formatCurrency(promoDiscount)}
                  </p>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') handleApplyPromo();
                    }}
                    placeholder="Masukkan kode promo"
                    className="flex-1 p-2 border dark:border-gray-600 rounded-lg uppercase dark:bg-gray-700 dark:text-white"
                    disabled={validatingPromo}
                  />
                  <button
                    onClick={handleApplyPromo}
                    disabled={validatingPromo || !promoCode.trim()}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    {validatingPromo ? '...' : 'Pakai'}
                  </button>
                </div>
              )}
            </div>
          )}

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
              {/* 🆕 PROMO DISCOUNT LINE */}
              {promoDiscount > 0 && (
                <div className="flex justify-between text-sm text-green-600 dark:text-green-400 font-semibold">
                  <span>Diskon Promo:</span>
                  <span>-{formatCurrency(promoDiscount)}</span>
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

      {showCheckout && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-2xl font-bold dark:text-white">Checkout</h2>
              <button
                onClick={() => setShowCheckout(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span className="text-sm text-blue-800 dark:text-blue-200">
                    Kasir: <strong>{currentCashier.fullName}</strong>
                  </span>
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <h3 className="font-semibold mb-3 dark:text-white">
                  Ringkasan Pesanan
                </h3>
                <div className="space-y-2 text-sm">
                  {items.map((item) => (
                    <div
                      key={item.productId}
                      className="flex justify-between dark:text-gray-300"
                    >
                      <span>
                        {item.name} x{item.quantity}
                      </span>
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
                        <span>Pajak ({taxRate}%):</span>
                        <span>{formatCurrency(tax)}</span>
                      </div>
                    )}
                    {/* 🆕 SHOW PROMO IN CHECKOUT */}
                    {promoDiscount > 0 && appliedPromo && (
                      <div className="flex justify-between text-green-600 dark:text-green-400 font-semibold">
                        <span>Promo ({appliedPromo.code}):</span>
                        <span>-{formatCurrency(promoDiscount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold text-lg mt-2 pt-2 border-t dark:border-gray-600 text-blue-600 dark:text-blue-400">
                      <span>Total:</span>
                      <span>{formatCurrency(total)}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-2 dark:text-white">
                  Metode Pembayaran
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {(["CASH", "CARD", "QRIS", "TRANSFER"] as const).map(
                    (method) => (
                      <button
                        key={method}
                        type="button"
                        onClick={() => setPaymentMethod(method)}
                        className={`p-4 border-2 rounded-lg transition-colors ${
                          paymentMethod === method
                            ? "border-blue-600 bg-blue-50 dark:bg-blue-900 dark:text-white"
                            : "border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:text-white"
                        }`}
                      >
                        <span className="font-semibold">{method}</span>
                      </button>
                    )
                  )}
                </div>
              </div>

              {paymentMethod === "CASH" && (
                <div>
                  <label className="block font-semibold mb-2 dark:text-white">
                    Jumlah Bayar
                  </label>

                  <div className="grid grid-cols-3 gap-2 mb-3">
                    {quickCashAmounts.map((amount) => (
                      <button
                        key={amount}
                        type="button"
                        onClick={() => handleQuickCash(amount)}
                        className="px-3 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg text-sm font-semibold dark:text-white"
                      >
                        {formatCurrency(amount)}
                      </button>
                    ))}
                  </div>

                  <input
                    type="number"
                    value={amountPaid}
                    onChange={(e) => setAmountPaid(e.target.value)}
                    placeholder="0"
                    className="w-full p-3 border dark:border-gray-600 rounded-lg text-lg font-semibold dark:bg-gray-700 dark:text-white"
                    autoFocus
                  />
                  {change >= 0 && amountPaid && (
                    <div className="mt-2 p-3 bg-green-50 dark:bg-green-900 rounded-lg">
                      <div className="flex justify-between text-green-800 dark:text-green-200">
                        <span>Kembalian:</span>
                        <span className="font-bold text-xl">
                          {formatCurrency(change)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {paymentMethod !== "CASH" && (
                <div className="bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700 rounded-lg p-3">
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    ✓ Pembayaran {paymentMethod}:{" "}
                    <strong>{formatCurrency(total)}</strong>
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold mb-1 dark:text-white">
                  Nama Pelanggan (Opsional)
                </label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Nama pelanggan"
                  className="w-full p-2 border dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1 dark:text-white">
                  No. HP Pelanggan (Opsional)
                </label>
                <input
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="08123456789"
                  className="w-full p-2 border dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Diperlukan untuk promo dengan limit per customer
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1 dark:text-white">
                  Catatan
                </label>
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
                type="button"
                onClick={() => setShowCheckout(false)}
                className="flex-1 px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 font-semibold"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleCheckout}
                disabled={
                  loading ||
                  (paymentMethod === "CASH" && (!amountPaid || paid < total))
                }
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                {loading ? "Memproses..." : "Bayar Sekarang"}
              </button>
            </div>
          </div>
        </div>
      )}

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