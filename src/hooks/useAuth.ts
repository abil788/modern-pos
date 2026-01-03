// src/hooks/useAuth.ts
import { useAuthStore } from '@/store/authStore';
import { useEffect } from 'react';

export function useAuth() {
  const store = useAuthStore();

  useEffect(() => {
    // Load session on mount
    store.loadSession();
  }, []);

  return {
    userId: store.userId,
    role: store.role,
    isAuthenticated: store.isAuthenticated,
    isOwnerMode: store.isOwnerMode,
    login: store.login,
    logout: store.logout,
    switchToOwner: store.switchToOwner,
    switchToCashier: store.switchToCashier,
  };
}
