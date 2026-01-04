// 📁 src/app/login/page.tsx

'use client';

import React, { useState, useEffect } from 'react';
import { User, Lock, X, LogIn, Eye, EyeOff } from 'lucide-react';

interface Cashier {
  id: string;
  fullName: string;
  username: string;
  photo?: string;
  role: string;
  isActive: boolean;
}

export default function VisualLoginPage() {
  const [cashiers, setCashiers] = useState<Cashier[]>([]);
  const [selectedCashier, setSelectedCashier] = useState<Cashier | null>(null);
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showOwnerLogin, setShowOwnerLogin] = useState(false);
  const [ownerPassword, setOwnerPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    loadCashiers();
  }, []);

  const loadCashiers = async () => {
    try {
      const res = await fetch('/api/cashiers?storeId=demo-store&activeOnly=true');
      const data = await res.json();
      setCashiers(data.filter((c: Cashier) => c.role === 'CASHIER' && c.isActive));
    } catch (error) {
      console.error('Failed to load cashiers:', error);
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
        setTimeout(() => verifyPin(newPin), 300);
      }
    }
  };

  const handlePinDelete = () => {
    setPin(pin.slice(0, -1));
    setError('');
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

  const handleOwnerLogin = async () => {
    if (!ownerPassword) return;
    
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password: ownerPassword,
          storeId: 'demo-store',
        }),
      });

      const data = await res.json();

      if (data.success) {
        localStorage.setItem('owner_session', JSON.stringify({
          authenticated: true,
          timestamp: Date.now(),
        }));
        
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

  if (showOwnerLogin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center p-4 relative overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-white opacity-10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-white opacity-10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        </div>

        <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl max-w-md w-full p-8 relative z-10 border border-white/20">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-black bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                Login Owner
              </h2>
              <p className="text-gray-600 mt-1">Masukkan password Anda</p>
            </div>
            <button
              onClick={() => {
                setShowOwnerLogin(false);
                setOwnerPassword('');
                setError('');
              }}
              className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
            >
              <X className="w-6 h-6 text-gray-600" />
            </button>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-bold mb-3 text-gray-700">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={ownerPassword}
                  onChange={(e) => setOwnerPassword(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') handleOwnerLogin();
                  }}
                  className="w-full px-4 py-4 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none pr-12 text-lg transition-all"
                  placeholder="••••••••"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-6 h-6" /> : <Eye className="w-6 h-6" />}
                </button>
              </div>
              <div className="mt-3 flex items-center gap-2 text-xs">
                <div className="px-3 py-1 bg-purple-50 text-purple-600 rounded-lg font-mono font-semibold">
                  admin123
                </div>
                <span className="text-gray-500">← Password default</span>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border-2 border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm font-semibold flex items-center gap-2">
                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                {error}
              </div>
            )}

            <button
              onClick={handleOwnerLogin}
              disabled={loading || !ownerPassword}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-4 rounded-xl hover:from-purple-700 hover:to-pink-700 font-bold disabled:from-gray-300 disabled:to-gray-400 flex items-center justify-center gap-3 shadow-lg hover:shadow-xl transition-all transform hover:scale-[1.02] disabled:transform-none text-lg"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Memverifikasi...
                </>
              ) : (
                <>
                  <LogIn className="w-6 h-6" />
                  Masuk
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (selectedCashier) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center p-4 relative overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-white opacity-10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-white opacity-5 rounded-full blur-3xl"></div>
        </div>

        <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl max-w-md w-full p-8 relative z-10 border border-white/20">
          <div className="flex justify-end mb-2">
            <button
              onClick={() => {
                setSelectedCashier(null);
                setPin('');
                setError('');
              }}
              className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
            >
              <X className="w-6 h-6 text-gray-600" />
            </button>
          </div>

          <div className="text-center mb-8">
            <div className="relative w-32 h-32 mx-auto mb-6">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full opacity-20 blur-2xl animate-pulse"></div>
              <div className="relative w-full h-full rounded-full overflow-hidden border-4 border-white shadow-xl">
                {selectedCashier.photo ? (
                  <img
                    src={selectedCashier.photo}
                    alt={selectedCashier.fullName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-purple-400 via-pink-400 to-purple-500 flex items-center justify-center">
                    <User className="w-16 h-16 text-white" />
                  </div>
                )}
              </div>
            </div>
            <h2 className="text-3xl font-black text-gray-800 mb-2">
              Selamat Datang!
            </h2>
            <p className="text-xl text-purple-600 font-semibold">{selectedCashier.fullName}</p>
          </div>

          <div className="mb-8">
            <label className="block text-sm font-bold mb-4 text-center text-gray-700">
              Masukkan PIN (4 Digit)
            </label>
            <div className="flex justify-center gap-4 mb-6">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={`w-16 h-16 rounded-2xl border-2 flex items-center justify-center text-3xl font-black transition-all ${
                    pin.length > i
                      ? 'border-purple-500 bg-gradient-to-br from-purple-50 to-pink-50 text-purple-600 scale-110 shadow-lg'
                      : 'border-gray-200 bg-white'
                  }`}
                >
                  {pin.length > i ? '●' : ''}
                </div>
              ))}
            </div>

            {error && (
              <div className="bg-red-50 border-2 border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm text-center mb-6 font-semibold flex items-center justify-center gap-2">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                {error}
              </div>
            )}

            <div className="grid grid-cols-3 gap-3">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                <button
                  key={num}
                  onClick={() => handlePinInput(num.toString())}
                  disabled={loading || pin.length >= 4}
                  className="h-16 bg-gradient-to-br from-gray-50 to-white hover:from-purple-50 hover:to-pink-50 border-2 border-gray-200 hover:border-purple-300 rounded-2xl text-2xl font-black transition-all disabled:opacity-40 hover:shadow-lg hover:scale-105 active:scale-95"
                >
                  {num}
                </button>
              ))}
              <button
                onClick={handlePinDelete}
                disabled={loading || pin.length === 0}
                className="h-16 bg-gradient-to-br from-red-50 to-red-100 hover:from-red-100 hover:to-red-200 border-2 border-red-200 rounded-2xl text-red-600 font-black transition-all disabled:opacity-40 hover:shadow-lg hover:scale-105 active:scale-95 text-2xl"
              >
                ←
              </button>
              <button
                onClick={() => handlePinInput('0')}
                disabled={loading || pin.length >= 4}
                className="h-16 bg-gradient-to-br from-gray-50 to-white hover:from-purple-50 hover:to-pink-50 border-2 border-gray-200 hover:border-purple-300 rounded-2xl text-2xl font-black transition-all disabled:opacity-40 hover:shadow-lg hover:scale-105 active:scale-95"
              >
                0
              </button>
              <button
                onClick={() => {
                  setPin('');
                  setError('');
                }}
                disabled={loading || pin.length === 0}
                className="h-16 bg-gradient-to-br from-gray-50 to-white hover:from-gray-100 hover:to-gray-200 border-2 border-gray-200 rounded-2xl text-gray-600 font-bold transition-all disabled:opacity-40 hover:shadow-lg hover:scale-105 active:scale-95 text-sm"
              >
                Clear
              </button>
            </div>
          </div>

          {loading && (
            <div className="text-center">
              <div className="inline-flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-purple-600"></div>
                <span className="text-sm font-semibold text-purple-600">Memverifikasi PIN...</span>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-white opacity-10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-white opacity-10 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      {/* Header */}
      <div className="text-center mb-8 relative z-10">
        <div className="inline-block mb-4 p-4 bg-white/10 backdrop-blur-lg rounded-2xl">
          <div className="text-6xl">🏪</div>
        </div>
        <h1 className="text-6xl font-black text-white mb-3 drop-shadow-lg">
          Modern POS
        </h1>
        <p className="text-white/90 text-xl font-medium">Selamat Datang Kembali</p>
      </div>

      {/* Main Card */}
      <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl p-8 max-w-5xl w-full relative z-10 border border-white/20">
        {cashiers.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full flex items-center justify-center">
              <User className="w-10 h-10 text-purple-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-800 mb-2">Belum Ada Kasir</h3>
            <p className="text-gray-600 mb-6">Silakan login sebagai owner untuk menambah kasir</p>
            <button
              onClick={() => setShowOwnerLogin(true)}
              className="px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:from-purple-700 hover:to-pink-700 font-semibold shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
            >
              Login sebagai Owner
            </button>
          </div>
        ) : (
          <>
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Pilih Profil Anda</h2>
              <p className="text-gray-600">Tap pada foto untuk melanjutkan</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-8">
              {cashiers.map((cashier) => (
                <button
                  key={cashier.id}
                  onClick={() => handleCashierSelect(cashier)}
                  className="group relative flex flex-col items-center p-6 bg-gradient-to-br from-gray-50 to-white rounded-2xl hover:shadow-2xl transition-all duration-300 hover:scale-105 border-2 border-gray-100 hover:border-purple-400"
                >
                  {/* Glow Effect */}
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-400 to-pink-400 rounded-2xl opacity-0 group-hover:opacity-20 transition-opacity blur-xl"></div>
                  
                  <div className="relative w-28 h-28 mb-4">
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full opacity-0 group-hover:opacity-100 transition-opacity blur-lg"></div>
                    <div className="relative w-full h-full rounded-full overflow-hidden border-4 border-white shadow-lg group-hover:border-purple-400 transition-all">
                      {cashier.photo ? (
                        <img
                          src={cashier.photo}
                          alt={cashier.fullName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-purple-400 via-pink-400 to-purple-500 flex items-center justify-center">
                          <User className="w-14 h-14 text-white" />
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <h3 className="font-bold text-gray-800 group-hover:text-purple-600 transition-colors text-center text-lg">
                    {cashier.fullName}
                  </h3>
                  <span className="mt-1 px-3 py-1 bg-purple-100 text-purple-600 text-xs font-semibold rounded-full">
                    Kasir
                  </span>
                </button>
              ))}
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-gray-500 font-medium">atau</span>
              </div>
            </div>

            <div className="mt-6">
              <button
                onClick={() => setShowOwnerLogin(true)}
                className="w-full px-6 py-4 bg-gradient-to-r from-gray-800 to-gray-900 text-white rounded-xl hover:from-gray-900 hover:to-black font-semibold shadow-lg hover:shadow-xl transition-all transform hover:scale-[1.02] flex items-center justify-center gap-3"
              >
                <Lock className="w-5 h-5" />
                Login sebagai Owner
              </button>
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <div className="mt-8 text-center text-white/80 text-sm relative z-10">
        <p className="font-medium">Modern POS System © 2025</p>
        <p className="text-white/60 mt-1">Powered by Technology</p>
      </div>
    </div>
  );
}