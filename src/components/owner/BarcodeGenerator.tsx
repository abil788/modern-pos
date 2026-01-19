'use client';

import { useState, useRef, useEffect } from 'react';
import { Download, Printer, Package } from 'lucide-react';
import JsBarcode from 'jsbarcode';
import toast from 'react-hot-toast';

interface BarcodeGeneratorProps {
  isOpen: boolean;
  onClose: () => void;
  productId?: string;
  productName?: string;
  productSku?: string;
  productBarcode?: string;
}

export function BarcodeGenerator({
  isOpen,
  onClose,
  productId,
  productName,
  productSku,
  productBarcode,
}: BarcodeGeneratorProps) {
  const [barcodeValue, setBarcodeValue] = useState(productBarcode || productSku || '');
  const [format, setFormat] = useState<'CODE128' | 'EAN13' | 'UPC'>('CODE128');
  const [copies, setCopies] = useState(1);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const printRef = useRef<HTMLDivElement>(null);

  // Generate barcode when value changes
  useEffect(() => {
    if (barcodeValue && canvasRef.current) {
      try {
        JsBarcode(canvasRef.current, barcodeValue, {
          format: format,
          width: 2,
          height: 80,
          displayValue: true,
          fontSize: 14,
          margin: 10,
        });
      } catch (error) {
        console.error('Barcode generation error:', error);
        toast.error('Format barcode tidak valid');
      }
    }
  }, [barcodeValue, format]);

  const handleGenerate = () => {
    if (!barcodeValue) {
      toast.error('Masukkan nilai barcode!');
      return;
    }
    // Barcode akan otomatis terupdate karena useEffect
    toast.success('Barcode berhasil digenerate!');
  };

  const handleDownload = () => {
    if (!canvasRef.current) return;

    try {
      // Convert canvas to blob
      canvasRef.current.toBlob((blob) => {
        if (!blob) return;

        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `barcode-${barcodeValue}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        toast.success('Barcode berhasil didownload!');
      });
    } catch (error) {
      toast.error('Gagal download barcode');
    }
  };

  const handlePrint = () => {
    if (!printRef.current) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    // Generate HTML untuk print dengan multiple copies
    const barcodeHTML = Array.from({ length: copies })
      .map(
        () => `
        <div style="page-break-inside: avoid; margin-bottom: 20px; text-align: center;">
          <p style="margin: 0 0 5px 0; font-size: 12px; font-weight: bold;">${productName || 'Product'}</p>
          <img src="${canvasRef.current?.toDataURL()}" style="display: block; margin: 0 auto;" />
          <p style="margin: 5px 0 0 0; font-size: 10px;">${barcodeValue}</p>
        </div>
      `
      )
      .join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Print Barcode - ${barcodeValue}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 20px;
            }
            @media print {
              body {
                padding: 0;
              }
            }
          </style>
        </head>
        <body>
          ${barcodeHTML}
          <script>
            window.onload = function() {
              window.print();
              window.onafterprint = function() {
                window.close();
              };
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const generateRandomBarcode = () => {
    // Generate random 12 digit barcode
    const random = Math.floor(100000000000 + Math.random() * 900000000000);
    setBarcodeValue(random.toString());
    toast.success('Barcode random digenerate!');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b dark:border-gray-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <Package className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold dark:text-white">Barcode Generator</h2>
              {productName && (
                <p className="text-sm text-gray-500 dark:text-gray-400">{productName}</p>
              )}
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Input Section */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-2 dark:text-white">
                Nilai Barcode <span className="text-red-600">*</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={barcodeValue}
                  onChange={(e) => setBarcodeValue(e.target.value)}
                  placeholder="Masukkan nilai barcode"
                  className="flex-1 p-3 border dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white font-mono"
                />
                <button
                  onClick={generateRandomBarcode}
                  className="px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-semibold whitespace-nowrap"
                >
                  Random
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-2 dark:text-white">
                  Format Barcode
                </label>
                <select
                  value={format}
                  onChange={(e) => setFormat(e.target.value as any)}
                  className="w-full p-3 border dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                >
                  <option value="CODE128">CODE128 (Recommended)</option>
                  <option value="EAN13">EAN13 (13 digits)</option>
                  <option value="UPC">UPC (12 digits)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2 dark:text-white">
                  Jumlah Copy (Print)
                </label>
                <input
                  type="number"
                  value={copies}
                  onChange={(e) => setCopies(Math.max(1, parseInt(e.target.value) || 1))}
                  min="1"
                  max="100"
                  className="w-full p-3 border dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>

            <button
              onClick={handleGenerate}
              className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
            >
              Generate Barcode
            </button>
          </div>

          {/* Preview Section */}
          <div className="border dark:border-gray-700 rounded-lg p-6 bg-gray-50 dark:bg-gray-700">
            <h3 className="font-semibold mb-4 dark:text-white text-center">Preview</h3>
            <div className="flex justify-center" ref={printRef}>
              <div className="text-center">
                {productName && (
                  <p className="text-sm font-semibold mb-2 dark:text-white">{productName}</p>
                )}
                <canvas ref={canvasRef} className="mx-auto bg-white p-2 rounded" />
                {barcodeValue && (
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-2 font-mono">
                    {barcodeValue}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 dark:text-blue-200 mb-2">
              💡 Tips Penggunaan:
            </h3>
            <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1 ml-4 list-disc">
              <li><strong>CODE128:</strong> Format paling fleksibel, bisa alfanumerik</li>
              <li><strong>EAN13:</strong> Untuk produk retail internasional (13 digit)</li>
              <li><strong>UPC:</strong> Standard USA/Canada (12 digit)</li>
              <li><strong>Print:</strong> Akan mencetak sejumlah copy yang diinginkan</li>
              <li><strong>Download:</strong> Menyimpan sebagai gambar PNG</li>
            </ul>
          </div>
        </div>

        {/* Actions */}
        <div className="p-6 border-t dark:border-gray-700 flex gap-3">
          <button
            onClick={handleDownload}
            disabled={!barcodeValue}
            className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Download className="w-5 h-5" />
            Download PNG
          </button>
          <button
            onClick={handlePrint}
            disabled={!barcodeValue}
            className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Printer className="w-5 h-5" />
            Print ({copies}x)
          </button>
        </div>
      </div>
    </div>
  );
}
