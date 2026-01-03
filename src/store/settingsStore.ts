import { create } from 'zustand';
import { Store } from '@/types';

interface SettingsState {
  store: Store | null;
  theme: 'light' | 'dark';
  setStore: (store: Store) => void;
  setTheme: (theme: 'light' | 'dark') => void;
  updateStore: (updates: Partial<Store>) => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  store: null,
  theme: 'light',

  setStore: (store) => {
    set({ store });
  },

  setTheme: (theme) => {
    set({ theme });
    if (typeof document !== 'undefined') {
      document.documentElement.classList.toggle('dark', theme === 'dark');
    }
  },

  updateStore: (updates) => {
    set((state) => ({
      store: state.store ? { ...state.store, ...updates } : null,
    }));
  },
}));