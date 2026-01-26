/**
 * Fungsi `ReportViewer` dalam TypeScript React merender sebuah komponen untuk
 * menampilkan laporan berdasarkan data yang diberikan dalam format terstruktur.
 * @param  - Komponen `ReportViewer` menerima satu properti yaitu `data` dengan
 * tipe `any`. Komponen ini merender sebuah container dengan gaya tertentu,
 * menampilkan judul "Report Viewer", serta menampilkan representasi JSON dari
 * properti `data` di dalam elemen `pre` agar mudah dibaca.
 * @returns Komponen `ReportViewer` dikembalikan. Komponen ini merender elemen
 * `div` dengan latar belakang putih, sudut membulat, dan padding. Di dalamnya
 * terdapat elemen `h3` dengan teks "Report Viewer" yang ditampilkan tebal.
 * Di bawah judul tersebut, terdapat elemen `pre` yang menampilkan hasil
 * stringify JSON dari properti `data` yang diteruskan ke komponen.
 */

'use client';

export function ReportViewer({ data }: { data: any }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
      <h3 className="text-lg font-bold mb-4 dark:text-white">Report Viewer</h3>
      <pre className="text-sm overflow-auto">{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
}