'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { User, LogOut, ChevronLeft, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';

export default function KasirLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [collapsed, setCollapsed] = useState(false);

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

  return (
    <div className="h-screen w-full flex bg-gray-100 dark:bg-gray-900 overflow-hidden">
      {/* Sidebar */}
      <aside
        className={`bg-gray-900 text-white transition-all duration-300 flex-shrink-0 ${
          collapsed ? 'w-20' : 'w-64'
        } flex flex-col`}
      >
        {/* Header */}
        <div className="h-16 px-4 flex items-center justify-between border-b border-gray-800">
          {!collapsed && (
            <span className="text-sm font-semibold text-gray-300">
              Kasir Panel
            </span>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-2 rounded-lg hover:bg-gray-800"
          >
            {collapsed ? (
              <ChevronRight className="w-5 h-5" />
            ) : (
              <ChevronLeft className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* User Card */}
        <div className={`p-4 border-b border-gray-800 ${collapsed ? 'px-2' : ''}`}>
          <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3'}`}>
            <div className="w-11 h-11 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
              <User className="w-5 h-5 text-white" />
            </div>
            {!collapsed && (
              <div className="overflow-hidden">
                <p className="text-sm font-semibold text-white truncate">
                  {session.fullName}
                </p>
                <p className="text-xs text-gray-400">Kasir</p>
              </div>
            )}
          </div>
        </div>

        {/* Spacer */}
        <div className="flex-1"></div>

        {/* Logout Button */}
        <div className="p-4 border-t border-gray-800">
          <button
            onClick={handleLogout}
            className={`flex items-center w-full px-4 py-3 text-red-400 hover:bg-red-900 hover:text-white rounded-lg transition-colors ${
              collapsed ? 'justify-center' : 'gap-3'
            }`}
            title={collapsed ? 'Logout' : undefined}
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            {!collapsed && <span className="font-medium">Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden">
        {children}
      </main>
    </div>
  );
}