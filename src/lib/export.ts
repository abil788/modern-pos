import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { Transaction } from '@/types';
import { formatCurrency, formatDateTime } from './utils';

export function exportTransactionsPDF(
  transactions: Transaction[],
  storeName: string,
  dateRange: { start: Date; end: Date }
) {
  const doc = new jsPDF();

  // Header
  doc.setFontSize(18);
  doc.text(storeName, 14, 20);
  doc.setFontSize(11);
  doc.text(`Laporan Transaksi`, 14, 28);
  doc.text(`Periode: ${formatDateTime(dateRange.start)} - ${formatDateTime(dateRange.end)}`, 14, 34);

  // Summary
  const totalRevenue = transactions.reduce((sum, t) => sum + t.total, 0);
  const totalTransactions = transactions.length;
  
  doc.setFontSize(10);
  doc.text(`Total Transaksi: ${totalTransactions}`, 14, 42);
  doc.text(`Total Pendapatan: ${formatCurrency(totalRevenue)}`, 14, 48);

  // Table
  const tableData = transactions.map(t => [
    t.invoiceNumber,
    formatDateTime(t.createdAt),
    t.paymentMethod,
    formatCurrency(t.total),
    t.customerName || '-',
  ]);

  autoTable(doc, {
    startY: 55,
    head: [['Invoice', 'Tanggal', 'Metode', 'Total', 'Pelanggan']],
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: [59, 130, 246] },
  });

  return doc;
}

export function exportTransactionsExcel(
  transactions: Transaction[],
  storeName: string,
  dateRange: { start: Date; end: Date }
) {
  const data = transactions.map(t => ({
    'Invoice': t.invoiceNumber,
    'Tanggal': formatDateTime(t.createdAt),
    'Metode Pembayaran': t.paymentMethod,
    'Subtotal': t.subtotal,
    'Pajak': t.tax,
    'Diskon': t.discount,
    'Total': t.total,
    'Pelanggan': t.customerName || '-',
    'Catatan': t.notes || '-',
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Transaksi');

  // Add summary sheet
  const summary = [
    ['Laporan Transaksi', ''],
    ['Toko', storeName],
    ['Periode', `${formatDateTime(dateRange.start)} - ${formatDateTime(dateRange.end)}`],
    ['', ''],
    ['Total Transaksi', transactions.length],
    ['Total Pendapatan', transactions.reduce((sum, t) => sum + t.total, 0)],
  ];

  const wsSummary = XLSX.utils.aoa_to_sheet(summary);
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Ringkasan');

  return wb;
}

export function downloadPDF(doc: jsPDF, filename: string) {
  doc.save(filename);
}

export function downloadExcel(wb: XLSX.WorkBook, filename: string) {
  XLSX.writeFile(wb, filename);
}

export function exportProductsPDF(products: any[], storeName: string) {
  const doc = new jsPDF();

  doc.setFontSize(18);
  doc.text(storeName, 14, 20);
  doc.setFontSize(11);
  doc.text(`Daftar Produk`, 14, 28);
  doc.text(`Tanggal: ${formatDateTime(new Date())}`, 14, 34);

  const tableData = products.map(p => [
    p.name,
    p.sku || '-',
    formatCurrency(p.price),
    p.stock.toString(),
    p.category?.name || '-',
    p.isActive ? 'Aktif' : 'Nonaktif',
  ]);

  autoTable(doc, {
    startY: 42,
    head: [['Nama', 'SKU', 'Harga', 'Stok', 'Kategori', 'Status']],
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: [59, 130, 246] },
  });

  return doc;
}

export function exportProductsExcel(products: any[]) {
  const data = products.map(p => ({
    'Nama Produk': p.name,
    'SKU': p.sku || '-',
    'Barcode': p.barcode || '-',
    'Harga': p.price,
    'Harga Modal': p.cost,
    'Stok': p.stock,
    'Stok Minimum': p.minStock,
    'Kategori': p.category?.name || '-',
    'Status': p.isActive ? 'Aktif' : 'Nonaktif',
    'Deskripsi': p.description || '-',
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Produk');

  return wb;
}