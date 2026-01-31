/* 
 * Kode di atas merupakan komponen layout React TypeScript
 * yang digunakan dalam aplikasi kasir.
 * Layout ini berfungsi sebagai kerangka utama tampilan,
 * mengatur struktur halaman, dan membungkus konten kasir.
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Menu, X, User, LogOut, History, Sun, Moon } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { getClientStoreId } from '@/lib/store-config';

export default function KasirLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [session, setSession] = useState<any>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dark, setDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Initialize theme immediately on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const isDark = savedTheme === 'dark';
    
    setDark(isDark);
    
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    
    setMounted(true);
  }, []);

  // Update theme when dark state changes (but not on initial mount)
  useEffect(() => {
    if (!mounted) return;
    
    if (dark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [dark, mounted]);

  // Check session
  useEffect(() => {
    const data = localStorage.getItem('cashier_session');
    if (!data) {
      router.push('/login');
      return;
    }
    try {
      const parsed = JSON.parse(data);
      const EXPIRE = 8 * 60 * 60 * 1000;
      if (Date.now() - parsed.timestamp > EXPIRE) {
        localStorage.removeItem('cashier_session');
        router.push('/login');
        return;
      }
      setSession(parsed);
    } catch {
      router.push('/login');
    }
  }, [router]);

  const handleLogout = async () => {
    if (!confirm('Yakin ingin logout?')) return;
    try {
      // Only try to call API if online
      if (navigator.onLine && session) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: session.userId, storeId: getClientStoreId() }),
        });
      }
    } catch (error) {
    }
    localStorage.removeItem('cashier_session');
    toast.success('Logout berhasil');
    router.push('/login');
  };

  const toggleTheme = () => {
    setDark(prev => !prev);
  };

  if (!session || !mounted) {
    return (
      <div className="h-screen flex items-center justify-center bg-white dark:bg-gray-900">
        <div className="h-8 w-8 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  const menuItems = [
    { href: '/kasir', icon: Menu, label: 'Kasir' },
    { href: '/kasir/history', icon: History, label: 'History Saya' },
  ];

  return (
    <div className="h-screen w-full flex bg-gray-100 dark:bg-gray-900 overflow-hidden">
      {/* Button to open sidebar - Always visible */}
      <button 
        onClick={() => setSidebarOpen(true)} 
        className="fixed top-4 left-4 z-50 p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg hover:shadow-xl transition-shadow"
      >
        <Menu className="w-6 h-6 text-gray-700 dark:text-white" />
      </button>

      {/* Overlay when sidebar is open */}
      {sidebarOpen && (
        <div 
          onClick={() => setSidebarOpen(false)} 
          className="fixed inset-0 bg-black/30 z-40" 
        />
      )}

      {/* Sidebar - Always rendered, just transformed */}
      <aside 
        className={`fixed z-50 inset-y-0 left-0 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transform transition-transform duration-300 flex flex-col w-64 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Sidebar Header */}
        <div className="h-16 px-4 flex items-center justify-between border-b border-gray-200 dark:border-gray-700">
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">Menu Kasir</span>
          <div className="flex items-center gap-2">
            {/* Theme Toggle Button */}
            <button 
              onClick={toggleTheme} 
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title={dark ? 'Mode Terang' : 'Mode Gelap'}
            >
              {dark ? (
                <Sun className="w-5 h-5 text-yellow-400" />
              ) : (
                <Moon className="w-5 h-5 text-gray-700" />
              )}
            </button>
            {/* Close Sidebar Button */}
            <button 
              onClick={() => setSidebarOpen(false)} 
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title="Tutup"
            >
              <X className="w-5 h-5 text-gray-700 dark:text-gray-200" />
            </button>
          </div>
        </div>

        {/* User Profile */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
              <User className="w-5 h-5 text-white" />
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                {session.fullName}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Kasir</p>
            </div>
          </div>
        </div>

        {/* Navigation Menu */}
        <div className="flex flex-col flex-1 p-4">
          <nav className="space-y-2">
            {menuItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                    isActive
                      ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-semibold'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="mt-auto flex items-center gap-3 w-full px-4 py-3 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-xl transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}