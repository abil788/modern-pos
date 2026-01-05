'use client';

import { useState, useEffect } from 'react';
import { AlertTriangle, Wifi, WifiOff, Package, X } from 'lucide-react';
import { useOffline } from '@/hooks/useOffline';

interface Notification {
  id: string;
  type: 'warning' | 'error' | 'info' | 'success';
  message: string;
  persistent?: boolean;
  dismissable?: boolean;
}

const DISMISSED_KEY = 'dismissed_notifications';

export function NotificationBanner() {
  const { isOnline, pendingCount } = useOffline();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [lowStockProducts, setLowStockProducts] = useState(0);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Load dismissed notifications from localStorage
    const dismissed = localStorage.getItem(DISMISSED_KEY);
    if (dismissed) {
      try {
        setDismissedIds(new Set(JSON.parse(dismissed)));
      } catch (e) {
        console.error('Failed to parse dismissed notifications:', e);
      }
    }
  }, []);

  useEffect(() => {
    checkLowStock();
    const interval = setInterval(checkLowStock, 60000); // Check every minute
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Offline notification
    if (!isOnline) {
      addNotification({
        id: 'offline',
        type: 'warning',
        message: `Mode Offline - ${pendingCount} transaksi menunggu sync`,
        persistent: true,
        dismissable: false,
      });
    } else {
      removeNotification('offline');
      
      if (pendingCount > 0) {
        addNotification({
          id: 'syncing',
          type: 'info',
          message: `Online kembali - Syncing ${pendingCount} transaksi...`,
          dismissable: false,
        });
        
        setTimeout(() => removeNotification('syncing'), 3000);
      }
    }
  }, [isOnline, pendingCount]);

  useEffect(() => {
    // Low stock notification - can be dismissed
    if (lowStockProducts > 0 && !dismissedIds.has('low-stock')) {
      addNotification({
        id: 'low-stock',
        type: 'warning',
        message: `${lowStockProducts} produk stok menipis`,
        persistent: true,
        dismissable: true,
      });
    } else {
      removeNotification('low-stock');
    }
  }, [lowStockProducts, dismissedIds]);

  const checkLowStock = async () => {
    try {
      const res = await fetch('/api/products?storeId=demo-store');
      const data = await res.json();
      const products = data.products || data;
      const lowStock = products.filter(
        (p: any) => p.stock <= p.minStock && p.isActive
      );
      setLowStockProducts(lowStock.length);
    } catch (error) {
      console.error('Error checking stock:', error);
    }
  };

  const addNotification = (notification: Notification) => {
    setNotifications((prev) => {
      const exists = prev.find((n) => n.id === notification.id);
      if (exists) {
        return prev.map((n) => (n.id === notification.id ? notification : n));
      }
      return [...prev, notification];
    });
  };

  const removeNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const handleDismiss = (id: string) => {
    removeNotification(id);
    
    // Save to localStorage
    const newDismissed = new Set(dismissedIds);
    newDismissed.add(id);
    setDismissedIds(newDismissed);
    localStorage.setItem(DISMISSED_KEY, JSON.stringify(Array.from(newDismissed)));
  };

  const visibleNotifications = notifications.filter(n => !dismissedIds.has(n.id));

  if (visibleNotifications.length === 0) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 space-y-2 p-4">
      {visibleNotifications.map((notification) => (
        <div
          key={notification.id}
          className={`flex items-center justify-between px-4 py-3 rounded-lg shadow-lg ${
            notification.type === 'warning'
              ? 'bg-yellow-500 text-white'
              : notification.type === 'error'
              ? 'bg-red-500 text-white'
              : notification.type === 'success'
              ? 'bg-green-500 text-white'
              : 'bg-blue-500 text-white'
          }`}
        >
          <div className="flex items-center gap-3">
            {notification.id === 'offline' && <WifiOff className="w-5 h-5" />}
            {notification.id === 'syncing' && <Wifi className="w-5 h-5" />}
            {notification.id === 'low-stock' && <Package className="w-5 h-5" />}
            {notification.type === 'warning' && 
              notification.id !== 'offline' && 
              notification.id !== 'low-stock' && (
              <AlertTriangle className="w-5 h-5" />
            )}
            <p className="font-semibold">{notification.message}</p>
          </div>
          {notification.dismissable && (
            <button
              onClick={() => handleDismiss(notification.id)}
              className="p-1 hover:bg-white hover:bg-opacity-20 rounded ml-4"
              title="Tutup notifikasi"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}