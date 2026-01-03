// src/hooks/useCart.ts
import { useCartStore } from '@/store/cartStore';

export function useCart() {
  const store = useCartStore();
  
  return {
    items: store.items,
    addItem: store.addItem,
    removeItem: store.removeItem,
    updateQuantity: store.updateQuantity,
    updateDiscount: store.updateDiscount,
    clearCart: store.clearCart,
    loadCart: store.loadCart,
    getTotal: store.getTotal,
    getSubtotal: store.getSubtotal,
    getTotalDiscount: store.getTotalDiscount,
    itemCount: store.items.length,
    isEmpty: store.items.length === 0,
  };
}

