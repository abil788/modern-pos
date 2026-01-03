import { create } from 'zustand';
import { CartItem } from '@/types';
import { saveCart, getCart, clearCart as clearStorageCart } from '@/lib/storage';

interface CartState {
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'quantity' | 'subtotal'>) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  updateDiscount: (productId: string, discount: number) => void;
  clearCart: () => void;
  loadCart: () => void;
  getTotal: () => number;
  getSubtotal: () => number;
  getTotalDiscount: () => number;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],

  addItem: (item) => {
    const items = get().items;
    const existingItem = items.find(i => i.productId === item.productId);

    let newItems: CartItem[];
    if (existingItem) {
      newItems = items.map(i =>
        i.productId === item.productId
          ? {
              ...i,
              quantity: i.quantity + 1,
              subtotal: (i.quantity + 1) * i.price - i.discount,
            }
          : i
      );
    } else {
      newItems = [
        ...items,
        {
          ...item,
          quantity: 1,
          discount: 0,
          subtotal: item.price,
        },
      ];
    }

    set({ items: newItems });
    saveCart(newItems);
  },

  removeItem: (productId) => {
    const newItems = get().items.filter(i => i.productId !== productId);
    set({ items: newItems });
    saveCart(newItems);
  },

  updateQuantity: (productId, quantity) => {
    if (quantity <= 0) {
      get().removeItem(productId);
      return;
    }

    const newItems = get().items.map(i =>
      i.productId === productId
        ? {
            ...i,
            quantity,
            subtotal: quantity * i.price - i.discount,
          }
        : i
    );

    set({ items: newItems });
    saveCart(newItems);
  },

  updateDiscount: (productId, discount) => {
    const newItems = get().items.map(i =>
      i.productId === productId
        ? {
            ...i,
            discount,
            subtotal: i.quantity * i.price - discount,
          }
        : i
    );

    set({ items: newItems });
    saveCart(newItems);
  },

  clearCart: () => {
    set({ items: [] });
    clearStorageCart();
  },

  loadCart: () => {
    const items = getCart();
    set({ items });
  },

  getSubtotal: () => {
    return get().items.reduce((sum, item) => sum + item.quantity * item.price, 0);
  },

  getTotalDiscount: () => {
    return get().items.reduce((sum, item) => sum + item.discount, 0);
  },

  getTotal: () => {
    return get().items.reduce((sum, item) => sum + item.subtotal, 0);
  },
}));