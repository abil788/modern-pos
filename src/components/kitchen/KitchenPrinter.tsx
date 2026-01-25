'use client';

import { useRef } from 'react';
import { Printer } from 'lucide-react';
import { formatDateTime } from '@/lib/utils';

interface KitchenPrinterProps {
  order: any;
  station?: string;
  autoprint?: boolean;
}

export function KitchenPrinter({ order, station, autoprint = false }: KitchenPrinterProps) {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const printContent = generatePrintContent(order, station);
    const printWindow = window.open('', '_blank');
    
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Kitchen Order - ${order.invoiceNumber}</title>
            <style>
              @media print {
                @page {
                  size: 80mm auto;
                  margin: 0;
                }
              }
              * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
              }
              body {
                font-family: 'Courier New', monospace;
                font-size: 12px;
                line-height: 1.4;
                padding: 10px;
                width: 80mm;
              }
              .header {
                text-align: center;
                border-bottom: 2px dashed #000;
                padding-bottom: 10px;
                margin-bottom: 10px;
              }
              .title {
                font-size: 20px;
                font-weight: bold;
                margin-bottom: 5px;
              }
              .station {
                font-size: 16px;
                font-weight: bold;
                background: #000;
                color: #fff;
                padding: 5px;
                margin: 10px 0;
              }
              .info-row {
                display: flex;
                justify-content: space-between;
                margin: 3px 0;
              }
              .items {
                margin: 15px 0;
              }
              .item {
                margin: 10px 0;
                padding: 8px 0;
                border-bottom: 1px solid #ccc;
              }
              .item-name {
                font-size: 14px;
                font-weight: bold;
              }
              .item-qty {
                font-size: 18px;
                font-weight: bold;
                display: inline-block;
                min-width: 30px;
              }
              .item-note {
                font-style: italic;
                margin-top: 5px;
                background: #f0f0f0;
                padding: 5px;
              }
              .order-note {
                margin: 15px 0;
                padding: 10px;
                background: #ffeb3b;
                border: 2px solid #000;
              }
              .footer {
                text-align: center;
                border-top: 2px dashed #000;
                padding-top: 10px;
                margin-top: 15px;
                font-size: 10px;
              }
              .urgent {
                background: #f44336;
                color: white;
                padding: 5px;
                text-align: center;
                font-weight: bold;
                font-size: 14px;
                margin: 10px 0;
              }
            </style>
          </head>
          <body onload="window.print(); setTimeout(() => window.close(), 100);">
            ${printContent}
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  // Auto-print when component mounts if enabled
  if (autoprint && order) {
    setTimeout(handlePrint, 100);
  }

  return (
    <button
      onClick={handlePrint}
      className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-colors"
      title="Print Kitchen Ticket"
    >
      <Printer className="w-4 h-4" />
      <span>Print</span>
    </button>
  );
}

// Helper function to generate print content
function generatePrintContent(order: any, station?: string) {
  const filteredItems = station 
    ? order.items.filter((item: any) => item.station === station)
    : order.items;

  const elapsed = order.startedAt 
    ? Math.floor((new Date().getTime() - new Date(order.startedAt).getTime()) / 60000)
    : Math.floor((new Date().getTime() - new Date(order.createdAt).getTime()) / 60000);

  const isUrgent = elapsed >= 10;

  return `
    <div class="header">
      <div class="title">🍳 KITCHEN ORDER</div>
      <div>${formatDateTime(new Date())}</div>
    </div>

    ${station ? `<div class="station">STATION: ${station.toUpperCase()}</div>` : ''}

    ${isUrgent ? '<div class="urgent">⚠️ URGENT - PREPARE IMMEDIATELY ⚠️</div>' : ''}

    <div class="info-row">
      <strong>Order #:</strong>
      <span>${order.invoiceNumber}</span>
    </div>

    ${order.tableNumber ? `
      <div class="info-row">
        <strong>Table:</strong>
        <span>${order.tableNumber}</span>
      </div>
    ` : ''}

    ${order.customerName ? `
      <div class="info-row">
        <strong>Customer:</strong>
        <span>${order.customerName}</span>
      </div>
    ` : ''}

    <div class="info-row">
      <strong>Type:</strong>
      <span>${order.orderType.toUpperCase()}</span>
    </div>

    <div class="info-row">
      <strong>Time:</strong>
      <span>${elapsed} minutes</span>
    </div>

    <div class="items">
      ${filteredItems.map((item: any) => `
        <div class="item">
          <div>
            <span class="item-qty">${item.quantity}x</span>
            <span class="item-name">${item.productName}</span>
          </div>
          ${item.modifiers && item.modifiers.length > 0 ? `
            <div style="margin-left: 30px; font-size: 11px;">
              ${item.modifiers.join(', ')}
            </div>
          ` : ''}
          ${item.notes ? `
            <div class="item-note">
              📝 ${item.notes}
            </div>
          ` : ''}
        </div>
      `).join('')}
    </div>

    ${order.notes ? `
      <div class="order-note">
        <strong>⚠️ ORDER NOTE:</strong><br/>
        ${order.notes}
      </div>
    ` : ''}

    <div class="footer">
      <div>Kitchen Display System</div>
      <div>Printed: ${formatDateTime(new Date())}</div>
    </div>
  `;
}

// Export function for programmatic printing
export function printKitchenOrder(order: any, station?: string) {
  const printContent = generatePrintContent(order, station);
  const printWindow = window.open('', '_blank');
  
  if (printWindow) {
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Kitchen Order - ${order.invoiceNumber}</title>
          <style>
            @media print {
              @page {
                size: 80mm auto;
                margin: 0;
              }
            }
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: 'Courier New', monospace;
              font-size: 12px;
              line-height: 1.4;
              padding: 10px;
              width: 80mm;
            }
            .header {
              text-align: center;
              border-bottom: 2px dashed #000;
              padding-bottom: 10px;
              margin-bottom: 10px;
            }
            .title {
              font-size: 20px;
              font-weight: bold;
              margin-bottom: 5px;
            }
            .station {
              font-size: 16px;
              font-weight: bold;
              background: #000;
              color: #fff;
              padding: 5px;
              margin: 10px 0;
            }
            .info-row {
              display: flex;
              justify-content: space-between;
              margin: 3px 0;
            }
            .items {
              margin: 15px 0;
            }
            .item {
              margin: 10px 0;
              padding: 8px 0;
              border-bottom: 1px solid #ccc;
            }
            .item-name {
              font-size: 14px;
              font-weight: bold;
            }
            .item-qty {
              font-size: 18px;
              font-weight: bold;
              display: inline-block;
              min-width: 30px;
            }
            .item-note {
              font-style: italic;
              margin-top: 5px;
              background: #f0f0f0;
              padding: 5px;
            }
            .order-note {
              margin: 15px 0;
              padding: 10px;
              background: #ffeb3b;
              border: 2px solid #000;
            }
            .footer {
              text-align: center;
              border-top: 2px dashed #000;
              padding-top: 10px;
              margin-top: 15px;
              font-size: 10px;
            }
            .urgent {
              background: #f44336;
              color: white;
              padding: 5px;
              text-align: center;
              font-weight: bold;
              font-size: 14px;
              margin: 10px 0;
            }
          </style>
        </head>
        <body onload="window.print(); setTimeout(() => window.close(), 100);">
          ${printContent}
        </body>
      </html>
    `);
    printWindow.document.close();
  }
}