import { Transaction } from '@/types';
import { formatCurrency, formatDateTime } from './utils';

// Helper function to get cashier name
async function getCashierName(cashierId: string): Promise<string> {
  try {
    const res = await fetch(`/api/cashiers?id=${cashierId}`);
    if (res.ok) {
      const data = await res.json();
      if (data.length > 0) {
        return data[0].fullName;
      }
    }
  } catch (error) {
    console.error('Failed to fetch cashier:', error);
  }
  return cashierId; // Fallback to cashier ID if name not found
}

export async function printReceipt(
  transaction: Transaction,
  storeName: string,
  storeAddress?: string,
  storePhone?: string,
  receiptFooter?: string
) {
  const printWindow = window.open('', '_blank');
  
  if (!printWindow) {
    alert('Pop-up blocker mencegah print. Silakan izinkan pop-up untuk website ini.');
    return;
  }

  // Get cashier name before generating receipt
  const cashierName = await getCashierName(transaction.cashierId);

  const receiptHtml = generateReceiptHtml(
    transaction,
    storeName,
    cashierName,
    storeAddress,
    storePhone,
    receiptFooter
  );

  printWindow.document.write(receiptHtml);
  printWindow.document.close();
  
  // Wait for content to load then print
  printWindow.onload = () => {
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  };
}

export function generateReceiptHtml(
  transaction: Transaction,
  storeName: string,
  cashierName: string,
  storeAddress?: string,
  storePhone?: string,
  receiptFooter?: string
): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Struk - ${transaction.invoiceNumber}</title>
      <style>
        @media print {
          @page {
            size: 80mm auto;
            margin: 0;
          }
        }
        
        body {
          font-family: 'Courier New', monospace;
          max-width: 80mm;
          margin: 0 auto;
          padding: 10mm;
          font-size: 12px;
          line-height: 1.4;
        }
        
        .text-center {
          text-align: center;
        }
        
        .text-right {
          text-align: right;
        }
        
        .bold {
          font-weight: bold;
        }
        
        .divider {
          border-top: 1px dashed #000;
          margin: 10px 0;
        }
        
        .divider-solid {
          border-top: 2px solid #000;
          margin: 10px 0;
        }
        
        table {
          width: 100%;
          border-collapse: collapse;
        }
        
        th {
          text-align: left;
          border-bottom: 1px solid #000;
          padding: 5px 0;
        }
        
        td {
          padding: 3px 0;
        }
        
        .item-name {
          max-width: 150px;
          word-wrap: break-word;
        }
        
        .footer {
          margin-top: 15px;
          white-space: pre-line;
        }
      </style>
    </head>
    <body>
      <!-- Header -->
      <div class="text-center">
        <h2 class="bold" style="margin: 5px 0;">${storeName}</h2>
        ${storeAddress ? `<p style="margin: 2px 0;">${storeAddress}</p>` : ''}
        ${storePhone ? `<p style="margin: 2px 0;">Telp: ${storePhone}</p>` : ''}
      </div>
      
      <div class="divider-solid"></div>
      
      <!-- Transaction Info -->
      <table style="font-size: 11px;">
        <tr>
          <td>Invoice</td>
          <td class="text-right bold">${transaction.invoiceNumber}</td>
        </tr>
        <tr>
          <td>Tanggal</td>
          <td class="text-right">${formatDateTime(transaction.createdAt)}</td>
        </tr>
        <tr>
          <td>Kasir</td>
          <td class="text-right">${cashierName || '-'}</td>
        </tr>
        ${transaction.customerName ? `
        <tr>
          <td>Pelanggan</td>
          <td class="text-right">${transaction.customerName}</td>
        </tr>
        ` : ''}
      </table>
      
      <div class="divider"></div>
      
      <!-- Items -->
      <table>
        <thead>
          <tr>
            <th>Item</th>
            <th class="text-center">Qty</th>
            <th class="text-right">Harga</th>
            <th class="text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          ${transaction.items
            .map(
              (item) => `
            <tr>
              <td class="item-name">${item.productName}</td>
              <td class="text-center">${item.quantity}</td>
              <td class="text-right">${formatCurrency(item.price)}</td>
              <td class="text-right bold">${formatCurrency(item.subtotal)}</td>
            </tr>
            ${item.discount > 0 ? `
            <tr>
              <td colspan="4" style="font-size: 10px; color: #666;">
                &nbsp;&nbsp;Diskon: -${formatCurrency(item.discount)}
              </td>
            </tr>
            ` : ''}
          `
            )
            .join('')}
        </tbody>
      </table>
      
      <div class="divider"></div>
      
      <!-- Totals -->
      <table>
        <tr>
          <td>Subtotal</td>
          <td class="text-right">${formatCurrency(transaction.subtotal)}</td>
        </tr>
        ${transaction.tax > 0 ? `
        <tr>
          <td>Pajak</td>
          <td class="text-right">${formatCurrency(transaction.tax)}</td>
        </tr>
        ` : ''}
        ${transaction.discount > 0 ? `
        <tr>
          <td>Diskon</td>
          <td class="text-right">-${formatCurrency(transaction.discount)}</td>
        </tr>
        ` : ''}
        <tr style="font-size: 14px;">
          <td class="bold">TOTAL</td>
          <td class="text-right bold">${formatCurrency(transaction.total)}</td>
        </tr>
        <tr>
          <td>Bayar (${transaction.paymentMethod})</td>
          <td class="text-right">${formatCurrency(transaction.amountPaid)}</td>
        </tr>
        ${transaction.change > 0 ? `
        <tr class="bold">
          <td>Kembalian</td>
          <td class="text-right">${formatCurrency(transaction.change)}</td>
        </tr>
        ` : ''}
      </table>
      
      ${transaction.notes ? `
      <div class="divider"></div>
      <p style="font-size: 11px; margin: 5px 0;">
        <strong>Catatan:</strong><br>
        ${transaction.notes}
      </p>
      ` : ''}
      
      <div class="divider-solid"></div>
      
      <!-- Footer -->
      <div class="text-center footer">
        ${receiptFooter || 'Terima kasih atas kunjungan Anda!\\nSelamat berbelanja kembali'}
      </div>
      
      <div style="height: 20mm;"></div>
    </body>
    </html>
  `;
}

export async function printDailyReport(
  transactions: Transaction[],
  date: Date,
  storeName: string
) {
  const printWindow = window.open('', '_blank');
  
  if (!printWindow) {
    alert('Pop-up blocker mencegah print.');
    return;
  }

  const totalRevenue = transactions.reduce((sum, t) => sum + t.total, 0);
  const totalTransactions = transactions.length;
  const totalTax = transactions.reduce((sum, t) => sum + t.tax, 0);

  // Fetch all unique cashier names
  const cashierIds = [...new Set(transactions.map(t => t.cashierId))];
  const cashierMap: Record<string, string> = {};
  
  await Promise.all(
    cashierIds.map(async (id) => {
      try {
        const res = await fetch(`/api/cashiers?id=${id}`);
        if (res.ok) {
          const data = await res.json();
          if (data.length > 0) {
            cashierMap[id] = data[0].fullName;
          } else {
            cashierMap[id] = id;
          }
        } else {
          cashierMap[id] = id;
        }
      } catch (error) {
        cashierMap[id] = id;
      }
    })
  );

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Laporan Harian - ${date.toLocaleDateString()}</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          padding: 20px;
          max-width: 800px;
          margin: 0 auto;
        }
        h1 { text-align: center; margin-bottom: 10px; }
        .info { text-align: center; margin-bottom: 20px; color: #666; }
        .summary {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 15px;
          margin-bottom: 30px;
        }
        .summary-card {
          border: 1px solid #ddd;
          padding: 15px;
          border-radius: 5px;
        }
        .summary-card h3 {
          margin: 0 0 10px 0;
          color: #666;
          font-size: 14px;
        }
        .summary-card p {
          margin: 0;
          font-size: 24px;
          font-weight: bold;
        }
        table {
          width: 100%;
          border-collapse: collapse;
        }
        th, td {
          border: 1px solid #ddd;
          padding: 8px;
          text-align: left;
        }
        th {
          background-color: #f5f5f5;
        }
        .text-right { text-align: right; }
        @media print {
          body { padding: 10px; }
        }
      </style>
    </head>
    <body>
      <h1>${storeName}</h1>
      <div class="info">
        Laporan Harian<br>
        ${date.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
      </div>
      
      <div class="summary">
        <div class="summary-card">
          <h3>Total Transaksi</h3>
          <p>${totalTransactions}</p>
        </div>
        <div class="summary-card">
          <h3>Total Pendapatan</h3>
          <p>${formatCurrency(totalRevenue)}</p>
        </div>
        <div class="summary-card">
          <h3>Rata-rata</h3>
          <p>${formatCurrency(totalTransactions > 0 ? totalRevenue / totalTransactions : 0)}</p>
        </div>
      </div>
      
      <table>
        <thead>
          <tr>
            <th>Invoice</th>
            <th>Waktu</th>
            <th>Kasir</th>
            <th>Pelanggan</th>
            <th>Metode</th>
            <th class="text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          ${transactions
            .map(
              (t) => `
            <tr>
              <td>${t.invoiceNumber}</td>
              <td>${formatDateTime(t.createdAt).split(' ')[1]}</td>
              <td>${cashierMap[t.cashierId] || t.cashierId || '-'}</td>
              <td>${t.customerName || '-'}</td>
              <td>${t.paymentMethod}</td>
              <td class="text-right">${formatCurrency(t.total)}</td>
            </tr>
          `
            )
            .join('')}
        </tbody>
        <tfoot>
          <tr>
            <th colspan="5">TOTAL</th>
            <th class="text-right">${formatCurrency(totalRevenue)}</th>
          </tr>
        </tfoot>
      </table>
    </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.onload = () => {
    printWindow.print();
    printWindow.close();
  };
}