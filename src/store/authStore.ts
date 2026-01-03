import { create } from 'zustand';
import { saveAuthSession, getAuthSession, clearAuthSession } from '@/lib/storage';

interface AuthState {
  userId: string | null;
  role: 'CASHIER' | 'OWNER' | null;
  isAuthenticated: boolean;
  isOwnerMode: boolean;
  login: (userId: string, role: 'CASHIER' | 'OWNER') => void;
  logout: () => void;
  switchToOwner: () => void;
  switchToCashier: () => void;
  loadSession: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  userId: null,
  role: null,
  isAuthenticated: false,
  isOwnerMode: false,

  login: (userId, role) => {
    set({
      userId,
      role,
      isAuthenticated: true,
      isOwnerMode: role === 'OWNER',
    });
    saveAuthSession(userId, role);
  },

  logout: () => {
    set({
      userId: null,
      role: null,
      isAuthenticated: false,
      isOwnerMode: false,
    });
    clearAuthSession();
  },

  switchToOwner: () => {
    set({ isOwnerMode: true });
  },

  switchToCashier: () => {
    set({ isOwnerMode: false });
  },

  loadSession: () => {
    const session = getAuthSession();
    if (session) {
      set({
        userId: session.userId,
        role: session.role,
        isAuthenticated: true,
        isOwnerMode: session.role === 'OWNER',
      });
    }
  },
}));