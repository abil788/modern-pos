'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Menu, X, User, LogOut, History } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';

export default function KasirLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [session, setSession] = useState<any>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
        handleLogout();
        return;
      }

      setSession(parsed);
    } catch {
      router.push('/login');
    }
  }, []);

  const handleLogout = async () => {
    if (!confirm('Yakin ingin logout?')) return;

    try {
      // Log logout activity
      if (session) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: session.userId,
            storeId: 'demo-store',
          }),
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    }

    localStorage.removeItem('cashier_session');
    toast.success('Logout berhasil');
    router.push('/login');
  };

  if (!session) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="h-8 w-8 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  const menuItems = [
    {
      href: '/kasir',
      icon: Menu,
      label: 'Kasir',
    },
    {
      href: '/kasir/history',
      icon: History,
      label: 'History Saya',
    },
  ];

  return (
    <div className="h-screen w-full flex bg-gray-100 overflow-hidden">
      {/* Toggle Button */}
      <button
        onClick={() => setSidebarOpen(true)}
        className="fixed top-4 left-4 z-40 p-2 bg-white border rounded-xl shadow hover:bg-gray-50"
      >
        <Menu className="w-6 h-6" />
      </button>

      {/* Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-30"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed z-40 inset-y-0 left-0 w-64 bg-white border-r
        transform transition-transform duration-300
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        {/* Sidebar Header */}
        <div className="h-16 px-4 flex items-center justify-between border-b">
          <span className="text-sm font-semibold text-gray-700">
            Menu Kasir
          </span>
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-2 rounded-lg hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Card */}
        <div className="p-4 border-b">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-blue-600 flex items-center justify-center">
              <User className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">
                {session.fullName}
              </p>
              <p className="text-xs text-gray-500">Kasir</p>
            </div>
          </div>
        </div>

        {/* Menu Items */}
        <div className="flex flex-col h-[calc(100%-12rem)] p-4">
          <nav className="space-y-2">
            {menuItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition ${
                    isActive
                      ? 'bg-blue-50 text-blue-600 font-semibold'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Logout FIXED at bottom */}
          <button
            onClick={handleLogout}
            className="mt-auto flex items-center gap-3 px-4 py-3
            text-red-600 rounded-xl hover:bg-red-50 transition"
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