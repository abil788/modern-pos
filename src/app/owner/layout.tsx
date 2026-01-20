// src/app/owner/layout.tsx
'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  LayoutDashboard, Package, Receipt, DollarSign, 
  Settings, LogOut, ChevronLeft, ChevronRight,
  Tag, History, Lock, Eye, EyeOff, Users,
  Gift,
  Clock
} from 'lucide-react';
import toast from 'react-hot-toast';

const navigation = [
  { name: 'Dashboard', href: '/owner', icon: LayoutDashboard },
  { name: 'Produk', href: '/owner/products', icon: Package },
  { name: 'Kategori', href: '/owner/categories', icon: Tag },
  { name: 'Staff', href: '/owner/staff', icon: Users },
  { name: 'Promo', href: '/owner/promos', icon: Gift }, 
  { name: 'Laporan', href: '/owner/reports', icon: Receipt },
  { name: 'Pengeluaran', href: '/owner/expenses', icon: DollarSign },
  { name: 'History', href: '/owner/history', icon: History },
  { name: 'Pengaturan', href: '/owner/settings', icon: Settings },
  { name: 'Rekonsiliasi', href: '/owner/reconciliation', icon: Clock },
  { name: 'Tutup Harian', href: '/owner/daily-closing', icon: Lock },
];

const OWNER_SESSION_KEY = 'owner_session';
const SESSION_DURATION = 1 * 60 * 60 * 1000; // 1 jam

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center h-screen bg-gray-900">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p className="text-gray-400">Loading...</p>
      </div>
    </div>
  );
}

export default function OwnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  
  // ✅ FIX: Auto-collapse on desktop (starts collapsed by default)
  const [collapsed, setCollapsed] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);

  // ✅ FIX: Handle responsive collapse behavior
  useEffect(() => {
    const handleResize = () => {
      // Auto-collapse on desktop (>= 1024px), expand on mobile
      if (window.innerWidth >= 1024) {
        setCollapsed(true);
      } else {
        setCollapsed(false);
      }
    };

    // Set initial state
    handleResize();

    // Listen to window resize
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = () => {
    const session = localStorage.getItem(OWNER_SESSION_KEY);
    
    if (session) {
      try {
        const { timestamp, authenticated } = JSON.parse(session);
        const now = Date.now();
        
        if (authenticated && (now - timestamp) < SESSION_DURATION) {
          setIsAuthenticated(true);
          setIsLoading(false);
          return;
        }
      } catch (error) {
        console.error('Invalid session data');
      }
    }
    
    setIsAuthenticated(false);
    setIsLoading(false);
    setShowPasswordModal(true);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password: password,
          storeId: 'demo-store',
        }),
      });

      const data = await res.json();

      if (data.success) {
        const session = {
          authenticated: true,
          timestamp: Date.now(),
        };
        localStorage.setItem(OWNER_SESSION_KEY, JSON.stringify(session));
        
        setIsAuthenticated(true);
        setShowPasswordModal(false);
        setPassword('');
        toast.success('Login berhasil!');
      } else {
        toast.error(data.error || 'Password salah!');
      }
    } catch (error) {
      toast.error('Terjadi kesalahan. Coba lagi.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = async () => {
    if (!confirm('Yakin ingin logout dari mode owner?')) return;

    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 'owner',
          storeId: 'demo-store',
        }),
      });
    } catch (error) {
      console.error('Logout error:', error);
    }

    localStorage.removeItem(OWNER_SESSION_KEY);
    toast.success('Logout berhasil!');
    router.push('/login');
  };

  if (isLoading) {
    return <LoadingFallback />;
  }

  if (!isAuthenticated || showPasswordModal) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 flex items-center justify-center p-4 z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full shadow-2xl">
          <div className="p-6 border-b dark:border-gray-700">
            <div className="flex items-center justify-center mb-4">
              <div className="p-4 bg-blue-100 dark:bg-blue-900 rounded-full">
                <Lock className="w-12 h-12 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-center dark:text-white">Mode Owner</h2>
            <p className="text-center text-gray-500 dark:text-gray-400 mt-2">
              Masukkan password untuk mengakses
            </p>
          </div>

          <form onSubmit={handleLogin} className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-2 dark:text-white">
                Password Owner
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') handleLogin(e as any);
                  }}
                  placeholder="Masukkan password"
                  className="w-full p-3 border dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white pr-10"
                  autoFocus
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                Password default: <span className="font-mono font-semibold">admin123</span>
              </p>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => router.push('/login')}
                className="flex-1 px-4 py-3 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 font-semibold"
              >
                Kembali
              </button>
              <button
                type="submit"
                disabled={loginLoading || !password}
                className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                {loginLoading ? 'Memverifikasi...' : 'Masuk'}
              </button>
            </div>
          </form>

          <div className="px-6 pb-6">
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
              <p className="text-xs text-yellow-800 dark:text-yellow-200">
                <strong>Info:</strong> Session akan aktif selama 8 jam. Setelah itu perlu login ulang.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {/* Sidebar - ✅ Starts collapsed by default on desktop */}
      <aside
        className={`bg-gray-900 text-white transition-all duration-300 ${
          collapsed ? 'w-20' : 'w-64'
        } flex flex-col`}
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-800 flex items-center justify-between">
          {!collapsed && <h2 className="text-xl font-bold">Owner Panel</h2>}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-2 rounded-lg hover:bg-gray-800 transition-colors"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? (
              <ChevronRight className="w-5 h-5" />
            ) : (
              <ChevronLeft className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                }`}
                title={collapsed ? item.name : undefined}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                {!collapsed && <span>{item.name}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Footer - Logout Button */}
        <div className="p-4 border-t border-gray-800">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-300 hover:bg-red-900 hover:text-white w-full transition-colors"
            title={collapsed ? 'Logout' : undefined}
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            {!collapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <Suspense fallback={<LoadingFallback />}>
          {children}
        </Suspense>
      </main>
    </div>
  );
}