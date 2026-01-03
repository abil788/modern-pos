'use client';

import { Menu, Settings, User, LogOut } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { useAuthStore } from '@/store/authStore';

interface HeaderProps {
  title?: string;
  onMenuClick?: () => void;
  showMenu?: boolean;
}

export function Header({ title = 'POS System', onMenuClick, showMenu = false }: HeaderProps) {
  const { isOwnerMode, logout } = useAuthStore();

  return (
    <header className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {showMenu && (
            <button
              onClick={onMenuClick}
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <Menu className="w-6 h-6 dark:text-gray-300" />
            </button>
          )}
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">{title}</h1>
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          
          {isOwnerMode && (
            <>
              <button className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                <User className="w-5 h-5 dark:text-gray-300" />
              </button>
              <button className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                <Settings className="w-5 h-5 dark:text-gray-300" />
              </button>
              <button
                onClick={logout}
                className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900 text-red-600"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}