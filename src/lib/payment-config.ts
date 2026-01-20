// src/lib/payment-config.ts

import { Wallet, Building2, CreditCard, Smartphone, type LucideIcon } from 'lucide-react';

export interface PaymentChannel {
  id: string;
  name: string;
  requiresReference?: boolean;
  description?: string;
}

export interface PaymentMethod {
  id: string;
  name: string;
  icon: LucideIcon;
  color: string;
  bgColor: string;
  channels: PaymentChannel[];
  requiresCashCount?: boolean;
}

export const PAYMENT_METHODS: Record<string, PaymentMethod> = {
  CASH: {
    id: 'CASH',
    name: 'Tunai',
    icon: Wallet,
    color: 'text-green-600',
    bgColor: 'bg-green-500',
    requiresCashCount: true,
    channels: [
      { id: 'CASH_IDR', name: 'Cash - IDR' }
    ]
  },
  TRANSFER: {
    id: 'TRANSFER',
    name: 'Transfer Bank',
    icon: Building2,
    color: 'text-blue-600',
    bgColor: 'bg-blue-500',
    channels: [
      { id: 'TRANSFER_BCA', name: 'Transfer - Bank BCA', requiresReference: true },
      { id: 'TRANSFER_MANDIRI', name: 'Transfer - Bank Mandiri', requiresReference: true },
      { id: 'TRANSFER_BNI', name: 'Transfer - Bank BNI', requiresReference: true },
      { id: 'TRANSFER_BRI', name: 'Transfer - Bank BRI', requiresReference: true },
      { id: 'TRANSFER_PERMATA', name: 'Transfer - Bank Permata', requiresReference: true },
      { id: 'TRANSFER_BSI', name: 'Transfer - Bank BSI', requiresReference: true },
      { id: 'TRANSFER_CIMB', name: 'Transfer - Bank CIMB Niaga', requiresReference: true },
      { id: 'TRANSFER_OTHER', name: 'Transfer - Bank Lainnya', requiresReference: true }
    ]
  },
  CARD: {
    id: 'CARD',
    name: 'Kartu Debit/Kredit',
    icon: CreditCard,
    color: 'text-purple-600',
    bgColor: 'bg-purple-500',
    channels: [
      { id: 'DEBIT_BCA', name: 'Debit - BCA', requiresReference: true },
      { id: 'DEBIT_MANDIRI', name: 'Debit - Mandiri', requiresReference: true },
      { id: 'DEBIT_BNI', name: 'Debit - BNI', requiresReference: true },
      { id: 'DEBIT_BRI', name: 'Debit - BRI', requiresReference: true },
      { id: 'CREDIT_VISA', name: 'Credit Card - Visa', requiresReference: true },
      { id: 'CREDIT_MASTERCARD', name: 'Credit Card - Mastercard', requiresReference: true },
      { id: 'CREDIT_JCB', name: 'Credit Card - JCB', requiresReference: true },
      { id: 'DEBIT_OTHER', name: 'Debit - Lainnya', requiresReference: true }
    ]
  },
  QRIS: {
    id: 'QRIS',
    name: 'QRIS / E-Wallet',
    icon: Smartphone,
    color: 'text-red-600',
    bgColor: 'bg-red-500',
    channels: [
      { id: 'QRIS_GOPAY', name: 'QRIS - GoPay', requiresReference: true },
      { id: 'QRIS_OVO', name: 'QRIS - OVO', requiresReference: true },
      { id: 'QRIS_DANA', name: 'QRIS - DANA', requiresReference: true },
      { id: 'QRIS_SHOPEEPAY', name: 'QRIS - ShopeePay', requiresReference: true },
      { id: 'QRIS_LINKAJA', name: 'QRIS - LinkAja', requiresReference: true },
      { id: 'QRIS_SAKUKU', name: 'QRIS - SakuKu', requiresReference: true },
      { id: 'QRIS_OTHER', name: 'QRIS - Lainnya', requiresReference: true }
    ]
  }
};

export const getPaymentMethodConfig = (methodId: string): PaymentMethod | null => {
  return PAYMENT_METHODS[methodId] || null;
};

export const getPaymentChannelConfig = (methodId: string, channelId: string): PaymentChannel | null => {
  const method = PAYMENT_METHODS[methodId];
  if (!method) return null;
  
  return method.channels.find(c => c.id === channelId) || null;
};

export const getChannelName = (methodId: string, channelId: string): string => {
  const channel = getPaymentChannelConfig(methodId, channelId);
  return channel?.name || channelId;
};

// Helper untuk grouping transactions by payment channel
export interface PaymentSummary {
  channelId: string;
  channelName: string;
  methodId: string;
  methodName: string;
  count: number;
  total: number;
  iconName: string; // Changed from icon to iconName
  color: string;
}

export const calculatePaymentSummary = (transactions: any[]): PaymentSummary[] => {
  const summary: Record<string, PaymentSummary> = {};

  // Initialize all channels
  Object.values(PAYMENT_METHODS).forEach(method => {
    method.channels.forEach(channel => {
      summary[channel.id] = {
        channelId: channel.id,
        channelName: channel.name,
        methodId: method.id,
        methodName: method.name,
        count: 0,
        total: 0,
        iconName: method.id, // Store method ID for icon lookup
        color: method.bgColor
      };
    });
  });

  // Aggregate transactions
  transactions.forEach(trx => {
    const channelId = trx.paymentChannel || `${trx.paymentMethod}_IDR`;
    if (summary[channelId]) {
      summary[channelId].count++;
      summary[channelId].total += trx.total;
    }
  });

  // Filter and sort
  return Object.values(summary)
    .filter(s => s.count > 0)
    .sort((a, b) => b.total - a.total);
};