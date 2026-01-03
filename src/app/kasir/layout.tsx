'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, X, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';

// Key untuk session owner
const OWNER_SESSION_KEY = 'owner_session';
const SESSION_DURATION = 8 * 60 * 60 * 1000; // 8 jam

export default function KasirLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [showOwnerModal, setShowOwnerModal] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleOwnerAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // Get saved password or use default
    const savedPassword = localStorage.getItem('owner_password') || 'admin123';
    
    if (password === savedPassword) {
      // Create session
      const session = {
        authenticated: true,
        timestamp: Date.now(),
      };
      localStorage.setItem(OWNER_SESSION_KEY, JSON.stringify(session));
      
      toast.success('Akses owner berhasil!');
      setShowOwnerModal(false);
      setPassword('');
      
      // Redirect to owner page
      router.push('/owner');
    } else {
      toast.error('Password salah!');
    }
    
    setPassword('');
    setLoading(false);
  };

  return (
    <div className="h-screen flex flex-col">
      {/* Top Bar */}
      <div className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-gray-800 dark:text-white">Kasir POS</h1>
        </div>
        
        <button
          onClick={() => setShowOwnerModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
        >
          <Lock className="w-4 h-4" />
          <span className="hidden sm:inline">Mode Owner</span>
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        {children}
      </div>

      {/* Owner Password Modal */}
      {showOwnerModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full">
            <div className="p-6 border-b dark:border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-full">
                    <Lock className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold dark:text-white">Akses Mode Owner</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Masukkan password untuk melanjutkan
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowOwnerModal(false);
                    setPassword('');
                  }}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                >
                  <X className="w-5 h-5 dark:text-gray-400" />
                </button>
              </div>
            </div>

            <form onSubmit={handleOwnerAccess} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-2 dark:text-white">
                  Password Owner
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
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

              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                <p className="text-xs text-blue-800 dark:text-blue-200">
                  <strong>Info:</strong> Setelah login, session akan aktif selama 8 jam
                </p>
              </div>

              <button
                type="submit"
                disabled={loading || !password}
                className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                {loading ? 'Memverifikasi...' : 'Masuk ke Mode Owner'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}