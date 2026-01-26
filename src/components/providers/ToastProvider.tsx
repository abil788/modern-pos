/**
 * Fungsi `ToastProvider` dalam TypeScript React digunakan untuk
 * menyiapkan sistem notifikasi toast dengan opsi yang dapat
 * dikustomisasi untuk pesan sukses, error, dan loading.
 * @returns Komponen `ToastProvider` dikembalikan. Komponen ini
 * merender komponen `Toaster` dari library `react-hot-toast`
 * dengan konfigurasi tertentu, seperti posisi notifikasi,
 * styling, durasi, serta tema ikon untuk kondisi sukses,
 * error, dan loading.
 */

'use client';

import { Toaster } from 'react-hot-toast';

export function ToastProvider() {
  return (
    <Toaster
      position="top-right"
      reverseOrder={false}
      gutter={8}
      toastOptions={{
        duration: 3000,
        style: {
          background: '#363636',
          color: '#fff',
        },
        success: {
          duration: 3000,
          iconTheme: {
            primary: '#10B981',
            secondary: '#fff',
          },
        },
        error: {
          duration: 4000,
          iconTheme: {
            primary: '#EF4444',
            secondary: '#fff',
          },
        },
        loading: {
          iconTheme: {
            primary: '#3B82F6',
            secondary: '#fff',
          },
        },
      }}
    />
  );
}