'use client';

import { useState, useEffect } from 'react';
import { AlertTriangle, Wifi, WifiOff, Package, X } from 'lucide-react';
import { useOffline } from '@/hooks/useOffline';

interface Notification {
  id: string;
  type: 'warning' | 'error' | 'info' | 'success';
  message: string;
  persistent?: boolean;
}

export function NotificationBanner() {
  const { isOnline, pendingCount } = useOffline();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [lowStockProducts, setLowStockProducts] = useState(0);

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
      });
    } else {
      removeNotification('offline');
      
      if (pendingCount > 0) {
        addNotification({
          id: 'syncing',
          type: 'info',
          message: `Online kembali - Syncing ${pendingCount} transaksi...`,
        });
        
        // Auto remove after 3 seconds
        setTimeout(() => removeNotification('syncing'), 3000);
      }
    }
  }, [isOnline, pendingCount]);

  useEffect(() => {
    // Low stock notification
    if (lowStockProducts > 0) {
      addNotification({
        id: 'low-stock',
        type: 'warning',
        message: `${lowStockProducts} produk stok menipis`,
        persistent: true,
      });
    } else {
      removeNotification('low-stock');
    }
  }, [lowStockProducts]);

  const checkLowStock = async () => {
    try {
      const res = await fetch('/api/products?storeId=demo-store');
      const products = await res.json();
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

  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 space-y-2 p-4">
      {notifications.map((notification) => (
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
            {notification.type === 'warning' && notification.id !== 'offline' && notification.id !== 'low-stock' && (
              <AlertTriangle className="w-5 h-5" />
            )}
            <p className="font-semibold">{notification.message}</p>
          </div>
          {!notification.persistent && (
            <button
              onClick={() => removeNotification(notification.id)}
              className="p-1 hover:bg-white hover:bg-opacity-20 rounded"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}