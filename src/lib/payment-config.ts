// src/lib/payment-config.ts

import { Wallet, Building2, CreditCard, Smartphone, type LucideIcon } from 'lucide-react';

export interface PaymentChannel {
  id: string;
  name: string;
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
      { id: 'TRANSFER_BCA', name: 'Transfer - Bank BCA' },
      { id: 'TRANSFER_MANDIRI', name: 'Transfer - Bank Mandiri' },
      { id: 'TRANSFER_BNI', name: 'Transfer - Bank BNI' },
      { id: 'TRANSFER_BRI', name: 'Transfer - Bank BRI' },
      { id: 'TRANSFER_PERMATA', name: 'Transfer - Bank Permata' },
      { id: 'TRANSFER_BSI', name: 'Transfer - Bank BSI' },
      { id: 'TRANSFER_CIMB', name: 'Transfer - Bank CIMB Niaga' },
      { id: 'TRANSFER_OTHER', name: 'Transfer - Bank Lainnya' }
    ]
  },
  CARD: {
    id: 'CARD',
    name: 'Kartu Debit/Kredit',
    icon: CreditCard,
    color: 'text-purple-600',
    bgColor: 'bg-purple-500',
    channels: [
      { id: 'DEBIT_BCA', name: 'Debit - BCA' },
      { id: 'DEBIT_MANDIRI', name: 'Debit - Mandiri' },
      { id: 'DEBIT_BNI', name: 'Debit - BNI' },
      { id: 'DEBIT_BRI', name: 'Debit - BRI' },
      { id: 'CREDIT_VISA', name: 'Credit Card - Visa' },
      { id: 'CREDIT_MASTERCARD', name: 'Credit Card - Mastercard' },
      { id: 'CREDIT_JCB', name: 'Credit Card - JCB' },
      { id: 'DEBIT_OTHER', name: 'Debit - Lainnya' }
    ]
  },
  QRIS: {
    id: 'QRIS',
    name: 'QRIS',
    icon: Smartphone,
    color: 'text-red-600',
    bgColor: 'bg-red-500',
    channels: [
      { id: 'QRIS', name: 'QRIS' }
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

export interface PaymentSummary {
  channelId: string;
  channelName: string;
  methodId: string;
  methodName: string;
  count: number;
  total: number;
  iconName: string;
  color: string;
}

export const calculatePaymentSummary = (transactions: any[]): PaymentSummary[] => {
  const summary: Record<string, PaymentSummary> = {};

  // Aggregate transactions first
  transactions.forEach(trx => {
    // Use paymentChannel if exists, otherwise use default channel for method
    let channelId = trx.paymentChannel;
    
    // If paymentChannel is null, use default channel for the method
    if (!channelId) {
      const method = PAYMENT_METHODS[trx.paymentMethod];
      if (method && method.channels.length > 0) {
        channelId = method.channels[0].id;
      } else {
        channelId = `${trx.paymentMethod}_IDR`; // fallback
      }
    }
    
    // Initialize if not exists
    if (!summary[channelId]) {
      const method = PAYMENT_METHODS[trx.paymentMethod];
      const channel = method?.channels.find(c => c.id === channelId);
      
      summary[channelId] = {
        channelId,
        channelName: channel?.name || channelId,
        methodId: trx.paymentMethod,
        methodName: method?.name || trx.paymentMethod,
        count: 0,
        total: 0,
        iconName: trx.paymentMethod,
        color: method?.bgColor || 'bg-gray-500'
      };
    }
    
    summary[channelId].count++;
    summary[channelId].total += trx.total;
  });

  // Filter and sort
  return Object.values(summary)
    .filter(s => s.count > 0)
    .sort((a, b) => b.total - a.total);
};