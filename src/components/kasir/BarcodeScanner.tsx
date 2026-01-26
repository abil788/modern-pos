/**
 * Komponen `BarcodeScanner` adalah komponen React TypeScript yang memungkinkan pengguna
 * melakukan pemindaian barcode menggunakan kamera atau dengan memasukkan kode barcode
 * secara manual. Komponen ini menyediakan opsi untuk berpindah mode (kamera / manual)
 * serta menangani event hasil pemindaian barcode.
 *
 * @returns
 * Komponen `BarcodeScanner` akan menampilkan antarmuka pemindai barcode yang terdiri dari
 * header, tombol pilihan mode (kamera atau input manual), area pemindaian kamera atau
 * form input manual, serta logika untuk menangani hasil scan dan interaksi pengguna.
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { X, Camera, Keyboard } from 'lucide-react';
import toast from 'react-hot-toast';

interface BarcodeScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (barcode: string) => void;
}

export function BarcodeScanner({ isOpen, onClose, onScan }: BarcodeScannerProps) {
  const [manualBarcode, setManualBarcode] = useState('');
  const [mode, setMode] = useState<'camera' | 'manual'>('camera');
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
    if (isOpen && mode === 'camera' && !isScanning) {
      startScanner();
    }

    return () => {
      stopScanner();
    };
  }, [isOpen, mode]);

  const startScanner = async () => {
    if (scannerRef.current || isScanning) return;

    try {
      setIsScanning(true);
      
      const scanner = new Html5QrcodeScanner(
        'barcode-scanner-region',
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        },
        false
      );

      scanner.render(
        (decodedText) => {
          // Success callback
          handleScanSuccess(decodedText);
          stopScanner();
        },
        (error) => {
          // Error callback - can be ignored for continuous scanning
          console.log('Scanning...', error);
        }
      );

      scannerRef.current = scanner;
    } catch (error) {
      console.error('Scanner error:', error);
      toast.error('Gagal memulai scanner');
      setIsScanning(false);
    }
  };

  const stopScanner = () => {
    if (scannerRef.current) {
      try {
        scannerRef.current.clear();
        scannerRef.current = null;
      } catch (error) {
        console.error('Error stopping scanner:', error);
      }
    }
    setIsScanning(false);
  };

  const handleScanSuccess = (barcode: string) => {
    // Play success sound
    const audio = new Audio('/sounds/beep.mp3'); // You need to add this file
    audio.play().catch(() => {});

    toast.success(`Barcode detected: ${barcode}`);
    onScan(barcode);
    onClose();
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualBarcode.trim()) {
      handleScanSuccess(manualBarcode.trim());
      setManualBarcode('');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-lg w-full">
        {/* Header */}
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="text-xl font-bold">Scan Barcode</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Toggle */}
        <div className="p-4 border-b">
          <div className="flex gap-2">
            <button
              onClick={() => {
                stopScanner();
                setMode('camera');
              }}
              className={`flex-1 px-4 py-2 rounded-lg flex items-center justify-center gap-2 ${
                mode === 'camera'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700'
              }`}
            >
              <Camera className="w-5 h-5" />
              Camera
            </button>
            <button
              onClick={() => {
                stopScanner();
                setMode('manual');
              }}
              className={`flex-1 px-4 py-2 rounded-lg flex items-center justify-center gap-2 ${
                mode === 'manual'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700'
              }`}
            >
              <Keyboard className="w-5 h-5" />
              Manual
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          {mode === 'camera' ? (
            <div>
              <div id="barcode-scanner-region" className="w-full"></div>
              <p className="text-sm text-gray-500 text-center mt-4">
                Arahkan kamera ke barcode produk
              </p>
            </div>
          ) : (
            <form onSubmit={handleManualSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-2">
                  Masukkan Barcode
                </label>
                <input
                  type="text"
                  value={manualBarcode}
                  onChange={(e) => setManualBarcode(e.target.value)}
                  placeholder="Scan atau ketik barcode..."
                  className="w-full p-3 border rounded-lg text-lg"
                  autoFocus
                />
                <p className="text-sm text-gray-500 mt-2">
                  Gunakan barcode scanner USB atau ketik manual
                </p>
              </div>
              <button
                type="submit"
                className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
              >
                Cari Produk
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}