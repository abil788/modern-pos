/**
 * Komponen `EnhancedCheckout` adalah komponen React TypeScript yang menangani
 * proses checkout dengan fitur yang lebih lengkap. Komponen ini mendukung
 * berbagai metode pembayaran, pemilihan tipe pesanan, catatan per item,
 * pemilihan promo dari dropdown, serta input informasi pelanggan.
 *
 * @param {EnhancedCheckoutProps}
 * - isOpen: Menentukan apakah modal checkout dalam keadaan terbuka atau tertutup.
 *
 * @returns
 * Komponen `EnhancedCheckout` akan menampilkan form checkout yang berisi
 * pengaturan metode pembayaran, tipe pesanan, catatan item, dropdown promo,
 * data pelanggan, dan catatan tambahan. Komponen ini juga menangani logika
 * penerapan dan penghapusan promo, perhitungan total pembayaran, serta
 * pengiriman data transaksi ke sistem.
 */

"use client";

import { useState, useEffect } from "react";
import { X, Tag, UtensilsCrossed, MessageSquare, Loader2 } from "lucide-react";
import { PAYMENT_METHODS } from "@/lib/payment-config";
import { formatCurrency } from "@/lib/utils";
import toast from "react-hot-toast";

interface EnhancedCheckoutProps {
  isOpen: boolean;
  onClose: () => void;
  subtotal: number;
  tax: number;
  total: number;
  items: any[];
  onComplete: (paymentData: any) => void;
  currentCashier: any;
  products: any[];
  storeId: string;
}

export function EnhancedCheckout({
  isOpen,
  onClose,
  subtotal,
  tax,
  total,
  items,
  onComplete,
  currentCashier,
  products,
  storeId,
}: EnhancedCheckoutProps) {
  const [selectedMethod, setSelectedMethod] = useState<string>("CASH");
  const [selectedChannel, setSelectedChannel] = useState<string>("CASH_IDR");
  const [amountPaid, setAmountPaid] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [notes, setNotes] = useState("");

  // Kitchen Display System fields
  const [orderType, setOrderType] = useState<
    "dine-in" | "takeaway" | "delivery"
  >("dine-in");
  const [tableNumber, setTableNumber] = useState("");

  // ✅ Item notes for customization
  const [itemNotes, setItemNotes] = useState<Record<string, string>>({});
  const [editingItemNote, setEditingItemNote] = useState<string | null>(null);

  // ✅ NEW: Promo state with dropdown
  const [availablePromos, setAvailablePromos] = useState<any[]>([]);
  const [loadingPromos, setLoadingPromos] = useState(false);
  const [selectedPromoId, setSelectedPromoId] = useState<string>("");
  const [appliedPromo, setAppliedPromo] = useState<any>(null);
  const [promoDiscount, setPromoDiscount] = useState(0);
  const [validatingPromo, setValidatingPromo] = useState(false);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setSelectedMethod("CASH");
      setSelectedChannel("CASH_IDR");
      setAmountPaid("");
      setCustomerName("");
      setCustomerPhone("");
      setNotes("");
      setOrderType("dine-in");
      setTableNumber("");
      setSelectedPromoId("");
      setAppliedPromo(null);
      setPromoDiscount(0);
      setValidatingPromo(false);
      setItemNotes({});
      setEditingItemNote(null);

      // ✅ Load available promos
      loadAvailablePromos();
    }
  }, [isOpen]);

  // ✅ NEW: Load available active promos
  const loadAvailablePromos = async () => {
    try {
      setLoadingPromos(true);
      const res = await fetch(`/api/promos?storeId=${storeId}&activeOnly=true`);
      const data = await res.json();

      // Filter only currently valid promos
      const now = new Date();
      const validPromos = (Array.isArray(data) ? data : []).filter(
        (promo: any) => {
          const startDate = new Date(promo.startDate);
          const endDate = new Date(promo.endDate);
          return promo.isActive && now >= startDate && now <= endDate;
        },
      );

      setAvailablePromos(validPromos);
    } catch (error) {
      console.error("Error loading promos:", error);
      setAvailablePromos([]);
    } finally {
      setLoadingPromos(false);
    }
  };

  const methodConfig = PAYMENT_METHODS[selectedMethod];

  // Calculate with promo discount
  const finalTotal = total - promoDiscount;
  const paid = parseFloat(amountPaid) || 0;
  const change = paid - finalTotal;

  const handleMethodChange = (methodId: string) => {
    setSelectedMethod(methodId);
    setSelectedChannel(PAYMENT_METHODS[methodId].channels[0].id);

    if (methodId !== "CASH") {
      setAmountPaid(finalTotal.toString());
    } else {
      setAmountPaid("");
    }
  };

  // ✅ NEW: Handle promo selection from dropdown
  const handlePromoSelect = async (promoId: string) => {
    setSelectedPromoId(promoId);

    if (!promoId) {
      // Remove promo if empty selection
      handleRemovePromo();
      return;
    }

    const selectedPromo = availablePromos.find((p) => p.id === promoId);
    if (!selectedPromo) return;

    try {
      setValidatingPromo(true);

      const res = await fetch("/api/promos/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: selectedPromo.code,
          storeId,
          subtotal,
          items: items.map((item) => {
            const product = products.find((p) => p.id === item.productId);
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

        if (selectedMethod !== "CASH") {
          setAmountPaid((total - result.discount).toString());
        }
      } else {
        setAppliedPromo(null);
        setPromoDiscount(0);
        setSelectedPromoId("");
        toast.error(result.error);
      }
    } catch (error) {
      console.error("Promo validation error:", error);
      toast.error("Gagal validasi promo");
      setAppliedPromo(null);
      setPromoDiscount(0);
      setSelectedPromoId("");
    } finally {
      setValidatingPromo(false);
    }
  };

  const handleRemovePromo = () => {
    setAppliedPromo(null);
    setPromoDiscount(0);
    setSelectedPromoId("");

    if (selectedMethod !== "CASH") {
      setAmountPaid(total.toString());
    }

    toast.success("Promo dihapus");
  };

  const handleSubmit = () => {
    if (selectedMethod === "CASH" && paid < finalTotal) {
      toast.error("Jumlah bayar kurang!");
      return;
    }

    if (orderType === "dine-in" && !tableNumber.trim()) {
      toast.error("Nomor meja harus diisi untuk Dine In!");
      return;
    }

    const paymentData = {
      paymentMethod: selectedMethod,
      paymentChannel: selectedChannel,
      amountPaid: paid,
      change: Math.max(0, change),
      customerName: customerName || undefined,
      customerPhone: customerPhone || undefined,
      notes: notes || undefined,
      promoCode: appliedPromo ? appliedPromo.code : undefined,
      promoDiscount,
      orderType,
      tableNumber: orderType === "dine-in" ? tableNumber : undefined,
      // ✅ Send item notes
      itemNotes,
    };

    onComplete(paymentData);
  };

  const quickCashAmounts = [20000, 50000, 100000, 150000, 200000];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b dark:border-gray-700 flex items-center justify-between sticky top-0 bg-white dark:bg-gray-800 z-10">
          <h2 className="text-2xl font-bold dark:text-white">Checkout</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
          >
            <X className="w-6 h-6 dark:text-gray-400" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Order Type Selection */}
          <div>
            <label className="block text-sm font-semibold mb-3 dark:text-white flex items-center gap-2">
              <UtensilsCrossed className="w-4 h-4" />
              Tipe Order
            </label>
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setOrderType("dine-in")}
                className={`p-4 rounded-lg border-2 font-semibold transition-all ${
                  orderType === "dine-in"
                    ? "border-blue-600 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                    : "border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600"
                }`}
              >
                🍽️ Dine In
              </button>
              <button
                type="button"
                onClick={() => {
                  setOrderType("takeaway");
                  setTableNumber("");
                }}
                className={`p-4 rounded-lg border-2 font-semibold transition-all ${
                  orderType === "takeaway"
                    ? "border-blue-600 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                    : "border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600"
                }`}
              >
                🥡 Takeaway
              </button>
              <button
                type="button"
                onClick={() => {
                  setOrderType("delivery");
                  setTableNumber("");
                }}
                className={`p-4 rounded-lg border-2 font-semibold transition-all ${
                  orderType === "delivery"
                    ? "border-blue-600 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                    : "border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600"
                }`}
              >
                🚗 Delivery
              </button>
            </div>
          </div>

          {/* Table Number for Dine-In */}
          {orderType === "dine-in" && (
            <div>
              <label className="block text-sm font-semibold mb-2 dark:text-white">
                Nomor Meja <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                value={tableNumber}
                onChange={(e) => setTableNumber(e.target.value)}
                placeholder="masukkan nomor meja"
                className="w-full px-4 py-3 border dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-lg font-semibold"
                required
              />
            </div>
          )}

          {/* ✅ Order Summary with Item Notes */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <h3 className="font-semibold mb-3 dark:text-white flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Ringkasan Pesanan & Catatan
            </h3>
            <div className="space-y-3 max-h-60 overflow-y-auto">
              {items.map((item) => (
                <div
                  key={item.productId}
                  className="bg-white dark:bg-gray-800 rounded-lg p-3 border dark:border-gray-600"
                >
                  <div className="flex justify-between mb-2">
                    <span className="font-medium dark:text-white">
                      {item.name} x{item.quantity}
                    </span>
                    <span className="font-semibold dark:text-white">
                      {formatCurrency(item.subtotal)}
                    </span>
                  </div>

                  {/* Item Note Input */}
                  {editingItemNote === item.productId ? (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={itemNotes[item.productId] || ""}
                        onChange={(e) =>
                          setItemNotes({
                            ...itemNotes,
                            [item.productId]: e.target.value,
                          })
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter") setEditingItemNote(null);
                          if (e.key === "Escape") setEditingItemNote(null);
                        }}
                        placeholder="Contoh: Tanpa es, Extra pedas"
                        className="flex-1 px-3 py-2 text-sm border dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => setEditingItemNote(null)}
                        className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
                      >
                        ✓
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setEditingItemNote(item.productId)}
                      className="w-full text-left px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                    >
                      {itemNotes[item.productId] ? (
                        <span className="text-blue-600 dark:text-blue-400">
                          📝 {itemNotes[item.productId]}
                        </span>
                      ) : (
                        <span className="text-gray-500 dark:text-gray-400">
                          + Tambah catatan (tanpa es, extra pedas, dll)
                        </span>
                      )}
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Total Summary */}
            <div className="border-t dark:border-gray-600 pt-3 mt-3 space-y-1">
              <div className="flex justify-between dark:text-gray-300">
                <span>Subtotal:</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              {tax > 0 && (
                <div className="flex justify-between text-gray-600 dark:text-gray-400">
                  <span>Pajak:</span>
                  <span>{formatCurrency(tax)}</span>
                </div>
              )}
              {promoDiscount > 0 && (
                <div className="flex justify-between text-green-600 dark:text-green-400 font-semibold">
                  <span>Diskon Promo:</span>
                  <span>-{formatCurrency(promoDiscount)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-lg mt-2 pt-2 border-t dark:border-gray-600 text-blue-600 dark:text-blue-400">
                <span>Total:</span>
                <span>{formatCurrency(finalTotal)}</span>
              </div>
            </div>
          </div>

          {/* ✅ CLEAN: Modern Promo Select */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Tag className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Promo
              </span>
              {loadingPromos && (
                <Loader2 className="w-4 h-4 animate-spin text-gray-400 ml-auto" />
              )}
            </div>

            {appliedPromo ? (
              // Applied Promo Display
              <div className="space-y-2">
                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                      {appliedPromo.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-mono mt-0.5">
                      {appliedPromo.code}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemovePromo}
                    className="ml-3 p-1.5 hover:bg-gray-200 dark:hover:bg-gray-800 rounded transition-colors"
                  >
                    <X className="w-4 h-4 text-gray-500" />
                  </button>
                </div>

                <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Hemat
                  </span>
                  <span className="text-base font-bold text-green-600 dark:text-green-400">
                    {formatCurrency(promoDiscount)}
                  </span>
                </div>
              </div>
            ) : (
              // Modern Select
              <div className="space-y-2">
                <div className="relative">
                  <select
                    value={selectedPromoId}
                    onChange={(e) => handlePromoSelect(e.target.value)}
                    disabled={validatingPromo || loadingPromos}
                    className="w-full px-4 py-3 pr-10 
                     bg-white dark:bg-gray-900 
                     border border-gray-300 dark:border-gray-600 
                     rounded-lg 
                     text-sm text-gray-900 dark:text-white
                     focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                     disabled:opacity-50 disabled:cursor-not-allowed
                     appearance-none cursor-pointer
                     transition-all"
                  >
                    <option value="">Tidak pakai promo</option>
                    {availablePromos.map((promo) => (
                      <option key={promo.id} value={promo.id}>
                        {promo.code} - {promo.name}
                        {promo.type === "PERCENTAGE" && ` (${promo.value}%)`}
                        {promo.type === "FIXED" &&
                          ` (${formatCurrency(promo.value)})`}
                        {promo.type === "BUY_X_GET_Y" &&
                          ` (Beli ${promo.buyQuantity} Gratis ${promo.getQuantity})`}
                        {promo.minPurchase > 0 &&
                          ` • Min ${formatCurrency(promo.minPurchase)}`}
                      </option>
                    ))}
                  </select>

                  {/* Custom Arrow Icon */}
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <svg
                      className="w-5 h-5 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </div>
                </div>

                {/* Validating Indicator */}
                {validatingPromo && (
                  <div className="flex items-center gap-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <Loader2 className="w-4 h-4 animate-spin text-blue-600 dark:text-blue-400" />
                    <span className="text-xs text-blue-600 dark:text-blue-400">
                      Memvalidasi promo...
                    </span>
                  </div>
                )}

                {/* Empty State */}
                {availablePromos.length === 0 && !loadingPromos && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 text-center py-2">
                    Tidak ada promo tersedia saat ini
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Payment Method Selection */}
          <div>
            <label className="block font-semibold mb-3 dark:text-white">
              Metode Pembayaran
            </label>
            <div className="grid grid-cols-2 gap-3">
              {Object.values(PAYMENT_METHODS).map((method) => {
                const Icon = method.icon;
                return (
                  <button
                    key={method.id}
                    type="button"
                    onClick={() => handleMethodChange(method.id)}
                    className={`p-4 border-2 rounded-lg transition-all ${
                      selectedMethod === method.id
                        ? "border-blue-600 bg-blue-50 dark:bg-blue-900"
                        : "border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`${method.bgColor} text-white p-3 rounded-lg`}
                      >
                        <Icon className="w-6 h-6" />
                      </div>
                      <span className="font-semibold dark:text-white">
                        {method.name}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Payment Channel Selection */}
          {methodConfig && methodConfig.channels.length > 1 && (
            <div className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <label className="block font-semibold mb-3 dark:text-white">
                Pilih Channel - {methodConfig.name}
              </label>
              <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                {methodConfig.channels.map((channel) => (
                  <button
                    key={channel.id}
                    type="button"
                    onClick={() => setSelectedChannel(channel.id)}
                    className={`p-3 border-2 rounded-lg text-left transition-all ${
                      selectedChannel === channel.id
                        ? "border-blue-600 bg-blue-50 dark:bg-blue-900"
                        : "border-gray-200 dark:border-gray-600 hover:border-gray-300"
                    }`}
                  >
                    <div className="font-medium text-sm dark:text-white">
                      {channel.name}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Amount Paid - Only for CASH */}
          {selectedMethod === "CASH" && (
            <div>
              <label className="block font-semibold mb-2 dark:text-white">
                Jumlah Bayar
              </label>

              <div className="grid grid-cols-5 gap-2 mb-3">
                {quickCashAmounts.map((amount) => (
                  <button
                    key={amount}
                    type="button"
                    onClick={() => setAmountPaid(amount.toString())}
                    className="px-2 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg text-xs font-semibold dark:text-white"
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
                <div className="mt-3 p-3 bg-green-50 dark:bg-green-900 rounded-lg">
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

          {/* Non-cash auto amount */}
          {selectedMethod !== "CASH" && (
            <div className="bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700 rounded-lg p-3">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                ✓ Pembayaran {methodConfig.name}:{" "}
                <strong>{formatCurrency(finalTotal)}</strong>
              </p>
            </div>
          )}

          {/* Customer Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-1 dark:text-white">
                Nama Pelanggan
              </label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Opsional"
                className="w-full p-2 border dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1 dark:text-white">
                No. Telepon
              </label>
              <input
                type="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="Opsional"
                className="w-full p-2 border dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-semibold mb-1 dark:text-white">
              Catatan Pesanan
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Catatan tambahan untuk seluruh pesanan..."
              className="w-full p-2 border dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
              rows={2}
            />
          </div>
        </div>

        <div className="p-6 border-t dark:border-gray-700 flex gap-3 sticky bottom-0 bg-white dark:bg-gray-800">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 font-semibold"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={
              (selectedMethod === "CASH" && paid < finalTotal) ||
              (orderType === "dine-in" && !tableNumber.trim())
            }
            className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            Bayar Sekarang
          </button>
        </div>
      </div>
    </div>
  );
}
