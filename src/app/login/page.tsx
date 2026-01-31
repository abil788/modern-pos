/* 
 * Kode di atas merupakan komponen React TypeScript
 * untuk halaman login.
 * Komponen ini menangani input pengguna,
 * proses autentikasi,
 * serta pengelolaan state dan validasi
 * sebelum pengguna masuk ke dalam aplikasi.
 */
'use client';

import { useState, useEffect } from 'react';
import { User, Lock, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import { getClientStoreId } from '@/lib/store-config';

interface Cashier {
  id: string;
  fullName: string;
  username: string;
  photo?: string;
  role: string;
  isActive: boolean;
}

export default function LoginPage() {
  const [cashiers, setCashiers] = useState<Cashier[]>([]);
  const [selectedCashier, setSelectedCashier] = useState<Cashier | null>(null);
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showOwnerLogin, setShowOwnerLogin] = useState(false);
  const [ownerPassword, setOwnerPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // ✅ KDS Setting
  const [kdsEnabled, setKdsEnabled] = useState(false);

  useEffect(() => {
    loadCashiers();
    loadKDSSetting();
  }, []);

  const loadCashiers = async () => {
    try {
      const res = await fetch(`/api/staff?storeId=${getClientStoreId()}&activeOnly=true`);
      const data = await res.json();
      setCashiers(data);
    } catch (error) {
      console.error('Failed to load cashiers:', error);
    }
  };

  // ✅ Load KDS Setting
  const loadKDSSetting = async () => {
    try {
      const res = await fetch(`/api/settings/kds?storeId=${getClientStoreId()}`);
      if (res.ok) {
        const data = await res.json();
        setKdsEnabled(data.enabled || false);
      }
    } catch (error) {
      console.error('Failed to load KDS setting:', error);
      setKdsEnabled(false);
    }
  };

  const handleCashierSelect = (cashier: Cashier) => {
    setSelectedCashier(cashier);
    setPin('');
    setError('');
  };

  const handlePinInput = (digit: string) => {
    if (pin.length < 4) {
      const newPin = pin + digit;
      setPin(newPin);
      
      if (newPin.length === 4) {
        setTimeout(() => verifyPin(newPin), 200);
      }
    }
  };

  const verifyPin = async (pinValue: string) => {
    if (!selectedCashier) return;
    
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/cashier-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cashierId: selectedCashier.id,
          pin: pinValue,
        }),
      });

      const data = await res.json();

      if (data.success) {
        localStorage.setItem('cashier_session', JSON.stringify({
          userId: data.user.id,
          fullName: data.user.fullName,
          role: data.user.role,
          timestamp: Date.now(),
        }));
        
        toast.success('Login berhasil!');
        window.location.href = '/kasir';
      } else {
        setError(data.error || 'PIN salah');
        setPin('');
      }
    } catch (error) {
      setError('Terjadi kesalahan. Coba lagi.');
      setPin('');
    } finally {
      setLoading(false);
    }
  };

  const handleOwnerLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ownerPassword) return;
    
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password: ownerPassword,
          storeId: getClientStoreId(),
        }),
      });

      const data = await res.json();

      if (data.success) {
        localStorage.setItem('owner_session', JSON.stringify({
          authenticated: true,
          timestamp: Date.now(),
        }));
        
        toast.success('Login berhasil!');
        window.location.href = '/owner';
      } else {
        setError(data.error || 'Password salah');
      }
    } catch (error) {
      setError('Terjadi kesalahan. Coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  // PIN Pad View
  if (selectedCashier) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-8">
          <button
            onClick={() => {
              setSelectedCashier(null);
              setPin('');
              setError('');
            }}
            className="mb-6 text-gray-600 hover:text-gray-900 flex items-center gap-2 text-sm"
          >
            ← Kembali
          </button>

          <div className="text-center mb-8">
            <div className="w-24 h-24 mx-auto mb-4 rounded-full overflow-hidden border-4 border-blue-100">
              {selectedCashier.photo ? (
                <img
                  src={selectedCashier.photo}
                  alt={selectedCashier.fullName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-blue-500 flex items-center justify-center">
                  <User className="w-12 h-12 text-white" />
                </div>
              )}
            </div>
            <h2 className="text-xl font-bold text-gray-900">{selectedCashier.fullName}</h2>
            <p className="text-sm text-gray-500">Masukkan PIN Anda</p>
          </div>

          <div className="flex justify-center gap-3 mb-6">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className={`w-12 h-12 rounded-lg border-2 flex items-center justify-center text-2xl transition-all ${
                  pin.length > i
                    ? 'border-blue-500 bg-blue-50 text-blue-600 scale-110'
                    : 'border-gray-200 bg-white'
                }`}
              >
                {pin.length > i ? '●' : ''}
              </div>
            ))}
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm text-center">
              {error}
            </div>
          )}

          <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
              <button
                key={num}
                onClick={() => handlePinInput(num.toString())}
                disabled={loading || pin.length >= 4}
                className="h-14 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg text-xl font-semibold transition-all disabled:opacity-40 active:scale-95"
              >
                {num}
              </button>
            ))}
            <button
              onClick={() => {
                setPin(pin.slice(0, -1));
                setError('');
              }}
              disabled={loading || pin.length === 0}
              className="h-14 bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 rounded-lg font-semibold transition-all disabled:opacity-40 active:scale-95"
            >
              ←
            </button>
            <button
              onClick={() => handlePinInput('0')}
              disabled={loading || pin.length >= 4}
              className="h-14 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg text-xl font-semibold transition-all disabled:opacity-40 active:scale-95"
            >
              0
            </button>
            <button
              onClick={() => {
                setPin('');
                setError('');
              }}
              disabled={loading || pin.length === 0}
              className="h-14 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-600 rounded-lg text-sm font-semibold transition-all disabled:opacity-40 active:scale-95"
            >
              Clear
            </button>
          </div>

          {loading && (
            <div className="mt-4 text-center">
              <div className="inline-flex items-center gap-2 text-sm text-gray-600">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                Memverifikasi...
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Owner Login View
  if (showOwnerLogin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-8">
          <button
            onClick={() => {
              setShowOwnerLogin(false);
              setOwnerPassword('');
              setError('');
            }}
            className="mb-6 text-gray-600 hover:text-gray-900 flex items-center gap-2 text-sm"
          >
            ← Kembali
          </button>

          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center">
              <Lock className="w-8 h-8 text-blue-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Login Owner</h2>
            <p className="text-gray-600">Masukkan password untuk melanjutkan</p>
          </div>

          <form onSubmit={handleOwnerLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={ownerPassword}
                  onChange={(e) => setOwnerPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-12"
                  placeholder="Masukkan password"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Password default: <span className="font-semibold">admin123</span>
              </p>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !ownerPassword}
              className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Memverifikasi...' : 'Masuk'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Main Selection
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-5xl w-full">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Selamat Datang</h1>
          <p className="text-gray-600">Pilih profil untuk melanjutkan</p>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-8">
          {cashiers.length === 0 ? (
            <div className="text-center py-12">
              <User className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Belum Ada Staff</h3>
              <p className="text-gray-600 mb-6">Login sebagai owner untuk menambah staff</p>
              <button
                onClick={() => setShowOwnerLogin(true)}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold transition-colors"
              >
                Login sebagai Owner
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-8">
                {cashiers.map((cashier) => (
                  <button
                    key={cashier.id}
                    onClick={() => handleCashierSelect(cashier)}
                    className="flex flex-col items-center p-6 rounded-xl border-2 border-gray-200 hover:border-blue-500 hover:shadow-md transition-all"
                  >
                    <div className="w-20 h-20 mb-3 rounded-full overflow-hidden border-4 border-gray-100">
                      {cashier.photo ? (
                        <img
                          src={cashier.photo}
                          alt={cashier.fullName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-blue-500 flex items-center justify-center">
                          <User className="w-10 h-10 text-white" />
                        </div>
                      )}
                    </div>
                    <h3 className="font-semibold text-gray-900 text-center mb-1">
                      {cashier.fullName}
                    </h3>
                    <span className="text-xs text-gray-500">Kasir</span>
                  </button>
                ))}
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => setShowOwnerLogin(true)}
                  className="w-full py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 font-semibold flex items-center justify-center gap-2 transition-colors"
                >
                  <Lock className="w-5 h-5" />
                  Login sebagai Owner
                </button>

                {/* ✅ Kitchen Display Button - Only if KDS enabled */}
                {kdsEnabled && (
                  <button
                    onClick={() => window.location.href = '/kitchen'}
                    className="w-full py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-semibold flex items-center justify-center gap-2 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                    </svg>
                    Kitchen Display System
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}