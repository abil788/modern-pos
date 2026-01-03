'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, Package, Receipt, DollarSign, 
  Settings, LogOut, Menu 
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/owner', icon: LayoutDashboard },
  { name: 'Produk', href: '/owner/products', icon: Package },
  { name: 'Transaksi', href: '/owner/history', icon: Receipt },
  { name: 'Pengeluaran', href: '/owner/expenses', icon: DollarSign },
  { name: 'Pengaturan', href: '/owner/settings', icon: Settings },
];

export default function OwnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className={`bg-gray-900 text-white ${sidebarOpen ? 'w-64' : 'w-20'} transition-all`}>
        <div className="p-4">
          <button onClick={() => setSidebarOpen(!sidebarOpen)}>
            <Menu className="w-6 h-6" />
          </button>
        </div>
        <nav className="mt-8">
          {navigation.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 px-6 py-3 hover:bg-gray-800 ${
                pathname === item.href ? 'bg-gray-800 border-l-4 border-blue-500' : ''
              }`}
            >
              <item.icon className="w-5 h-5" />
              {sidebarOpen && <span>{item.name}</span>}
            </Link>
          ))}
          <button className="flex items-center gap-3 px-6 py-3 hover:bg-gray-800 w-full mt-8">
            <LogOut className="w-5 h-5" />
            {sidebarOpen && <span>Keluar</span>}
          </button>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}