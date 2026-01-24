'use client';

import { useState, useEffect, useRef } from 'react';
import { pusherClient } from '@/lib/pusher';
import {
  Clock,
  CheckCircle,
  ChefHat,
  Volume2,
  VolumeX,
  Grid,
  List,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { formatDateTime } from '@/lib/utils';
import toast from 'react-hot-toast';

interface KitchenOrderItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  notes?: string;
  station: string;
  status: 'pending' | 'preparing' | 'ready';
  prepTime: number;
  modifiers?: string[];
}

interface KitchenOrder {
  id: string;
  transactionId: string;
  invoiceNumber: string;
  items: KitchenOrderItem[];
  status: 'pending' | 'preparing' | 'ready' | 'completed';
  tableNumber?: string;
  customerName?: string;
  orderType: 'dine-in' | 'takeaway' | 'delivery';
  notes?: string;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

const STORE_ID = 'demo-store';

export default function KitchenDisplayPage() {
  const [orders, setOrders] = useState<KitchenOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStation, setSelectedStation] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const prevOrderCountRef = useRef<number>(0);

  const stations = [
    { id: 'main', name: 'Main Kitchen', color: 'bg-green-500' },
  ];

  useEffect(() => {
    // Setup notification sound
    audioRef.current = new Audio('/sounds/kitchen-bell.mp3');
    
    // Initial load
    loadOrders();

    // 🔥 Setup Pusher Real-time Connection (if available)
    if (!pusherClient) {
      console.warn('⚠️ Pusher not configured. Kitchen display will use polling.');
      setIsConnected(false);
      
      // Fallback: Poll every 10 seconds if Pusher not available
      const interval = setInterval(loadOrders, 10000);
      return () => clearInterval(interval);
    }

    const channel = pusherClient.subscribe(`kitchen-${STORE_ID}`);

    // Listen for new orders
    channel.bind('new-order', (newOrder: KitchenOrder) => {
      console.log('📥 New order received:', newOrder);
      
      setOrders((prev) => {
        // Avoid duplicates
        if (prev.find(o => o.id === newOrder.id)) {
          return prev;
        }
        
        // Play sound for new orders
        if (soundEnabled && audioRef.current) {
          audioRef.current.play().catch(console.error);
        }
        
        toast.success(`New Order: ${newOrder.invoiceNumber}`, {
          icon: '🔔',
          duration: 5000,
        });
        
        return [newOrder, ...prev];
      });
    });

    // Listen for order updates
    channel.bind('order-update', (update: { orderId: string; status: string }) => {
      console.log('🔄 Order update:', update);
      
      setOrders((prev) =>
        prev.map((order) =>
          order.id === update.orderId
            ? { ...order, status: update.status as any }
            : order
        )
      );
    });

    // Connection status
    pusherClient.connection.bind('connected', () => {
      setIsConnected(true);
      console.log('✅ Pusher connected');
    });

    pusherClient.connection.bind('disconnected', () => {
      setIsConnected(false);
      console.log('❌ Pusher disconnected');
    });

    // Cleanup
    return () => {
      channel.unbind_all();
      channel.unsubscribe();
    };
  }, [soundEnabled]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const res = await fetch(
        `/api/kds?storeId=${STORE_ID}&status=pending,preparing`
      );
      
      if (!res.ok) throw new Error('Failed to fetch orders');

      const data = await res.json();
      setOrders(data);
    } catch (error) {
      console.error('Error loading kitchen orders:', error);
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const getElapsedTime = (createdAt: Date, startedAt?: Date) => {
    const start = startedAt ? new Date(startedAt) : new Date(createdAt);
    const now = new Date();
    const diff = Math.floor((now.getTime() - start.getTime()) / 60000);
    return diff;
  };

  const getOrderColor = (order: KitchenOrder) => {
    const elapsed = getElapsedTime(order.createdAt, order.startedAt);
    if (elapsed >= 15) return 'border-red-500 bg-red-50 dark:bg-red-900/20';
    if (elapsed >= 10) return 'border-orange-500 bg-orange-50 dark:bg-orange-900/20';
    return 'border-green-500 bg-white dark:bg-gray-800';
  };

  const handleStartOrder = async (orderId: string) => {
    try {
      await fetch('/api/kds', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactionId: orderId,
          status: 'preparing',
        }),
      });
      
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId
            ? { ...o, status: 'preparing', startedAt: new Date() }
            : o
        )
      );
      
      toast.success('Order started');
    } catch (error) {
      toast.error('Failed to start order');
    }
  };

  const handleCompleteItem = async (orderId: string, itemId: string) => {
    try {
      await fetch('/api/kds', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactionId: orderId,
          itemId,
          itemStatus: 'ready',
        }),
      });

      setOrders((prev) =>
        prev.map((order) => {
          if (order.id === orderId) {
            const updatedItems = order.items.map((item) =>
              item.id === itemId ? { ...item, status: 'ready' as const } : item
            );
            
            const allReady = updatedItems.every((item) => item.status === 'ready');
            
            return {
              ...order,
              items: updatedItems,
              status: allReady ? ('ready' as const) : order.status,
            };
          }
          return order;
        })
      );
    } catch (error) {
      toast.error('Failed to update item');
    }
  };

  const handleCompleteOrder = async (orderId: string) => {
    try {
      await fetch('/api/kds', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactionId: orderId,
          status: 'completed',
        }),
      });
      
      // Remove from display
      setOrders((prev) => prev.filter((o) => o.id !== orderId));
      toast.success('Order completed!', { icon: '✅' });
    } catch (error) {
      toast.error('Failed to complete order');
    }
  };

  const filteredOrders = orders.filter((order) => {
    if (selectedStation === 'all') return true;
    return order.items.some((item) => item.station === selectedStation);
  });

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <div className="text-center">
          <ChefHat className="w-16 h-16 mx-auto mb-4 text-blue-600 animate-pulse" />
          <p className="text-gray-600 dark:text-gray-400">Loading Kitchen Display...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-100 dark:bg-gray-900 flex flex-col">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-lg border-b-4 border-blue-600">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <ChefHat className="w-8 h-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
                  Kitchen Display System
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
                  {filteredOrders.length} Active Orders
                  {isConnected ? (
                    <span className="flex items-center gap-1 text-green-600">
                      <Wifi className="w-4 h-4" />
                      Live
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-red-600">
                      <WifiOff className="w-4 h-4" />
                      Offline
                    </span>
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {/* Sound Toggle */}
              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                className="p-3 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600"
              >
                {soundEnabled ? (
                  <Volume2 className="w-6 h-6 text-blue-600" />
                ) : (
                  <VolumeX className="w-6 h-6 text-gray-400" />
                )}
              </button>

              {/* View Mode Toggle */}
              <div className="flex gap-2">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-3 rounded-lg ${
                    viewMode === 'grid'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                  }`}
                >
                  <Grid className="w-6 h-6" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-3 rounded-lg ${
                    viewMode === 'list'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                  }`}
                >
                  <List className="w-6 h-6" />
                </button>
              </div>
            </div>
          </div>

          {/* Station Filter */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            {stations.map((station) => {
              const count =
                station.id === 'all'
                  ? orders.length
                  : orders.filter((o) =>
                      o.items.some((i) => i.station === station.id)
                    ).length;

              return (
                <button
                  key={station.id}
                  onClick={() => setSelectedStation(station.id)}
                  className={`px-4 py-2 rounded-lg whitespace-nowrap font-semibold transition-all ${
                    selectedStation === station.id
                      ? `${station.color} text-white shadow-lg`
                      : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
                  }`}
                >
                  {station.name} ({count})
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* Orders Display */}
      <div className="flex-1 overflow-auto p-6">
        {filteredOrders.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-gray-400">
              <ChefHat className="w-20 h-20 mx-auto mb-4 opacity-50" />
              <p className="text-xl">No active orders</p>
              <p className="text-sm mt-2">New orders will appear here in real-time</p>
            </div>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredOrders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                onStart={handleStartOrder}
                onCompleteItem={handleCompleteItem}
                onComplete={handleCompleteOrder}
                getElapsedTime={getElapsedTime}
                getOrderColor={getOrderColor}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-4 max-w-4xl mx-auto">
            {filteredOrders.map((order) => (
              <OrderListItem
                key={order.id}
                order={order}
                onStart={handleStartOrder}
                onCompleteItem={handleCompleteItem}
                onComplete={handleCompleteOrder}
                getElapsedTime={getElapsedTime}
                getOrderColor={getOrderColor}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Order Card Component (same as before)
function OrderCard({ order, onStart, onCompleteItem, onComplete, getElapsedTime, getOrderColor }: any) {
  const elapsed = getElapsedTime(order.createdAt, order.startedAt);
  const allItemsReady = order.items.every((item: any) => item.status === 'ready');

  return (
    <div className={`rounded-xl border-4 ${getOrderColor(order)} p-4 shadow-lg transition-all`}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-xl font-bold text-gray-800 dark:text-white">
            {order.invoiceNumber}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {order.orderType === 'dine-in' && `Table ${order.tableNumber || '-'}`}
            {order.orderType === 'takeaway' && 'Takeaway'}
            {order.orderType === 'delivery' && 'Delivery'}
          </p>
          {order.customerName && (
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              {order.customerName}
            </p>
          )}
        </div>

        <div
          className={`flex items-center gap-2 px-3 py-1 rounded-full ${
            elapsed >= 15
              ? 'bg-red-600 text-white animate-pulse'
              : elapsed >= 10
              ? 'bg-orange-600 text-white'
              : 'bg-green-600 text-white'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span className="font-bold">{elapsed}m</span>
        </div>
      </div>

      <div className="space-y-2 mb-4">
        {order.items.map((item: any) => (
          <div
            key={item.id}
            className={`p-3 rounded-lg ${
              item.status === 'ready'
                ? 'bg-green-100 dark:bg-green-900/30 border-2 border-green-500'
                : 'bg-gray-50 dark:bg-gray-700'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="font-semibold dark:text-white">
                  {item.quantity}x {item.productName}
                </p>
                {item.modifiers && item.modifiers.length > 0 && (
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                    {item.modifiers.join(', ')}
                  </p>
                )}
                {item.notes && (
                  <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                    Note: {item.notes}
                  </p>
                )}
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {item.station} • {item.prepTime}min
                </p>
              </div>
              <button
                onClick={() => onCompleteItem(order.id, item.id)}
                disabled={item.status === 'ready'}
                className={`p-2 rounded-lg ${
                  item.status === 'ready'
                    ? 'bg-green-500 text-white'
                    : 'bg-white dark:bg-gray-600 hover:bg-green-50 dark:hover:bg-green-900/20'
                }`}
              >
                <CheckCircle
                  className={`w-5 h-5 ${
                    item.status === 'ready' ? 'text-white' : 'text-gray-400'
                  }`}
                />
              </button>
            </div>
          </div>
        ))}
      </div>

      {order.notes && (
        <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <p className="text-sm font-semibold text-yellow-800 dark:text-yellow-200">
            Note: {order.notes}
          </p>
        </div>
      )}

      <div className="flex gap-2">
        {order.status === 'pending' ? (
          <button
            onClick={() => onStart(order.id)}
            className="flex-1 py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors"
          >
            Start Order
          </button>
        ) : allItemsReady ? (
          <button
            onClick={() => onComplete(order.id)}
            className="flex-1 py-3 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 transition-colors animate-pulse"
          >
            Complete Order
          </button>
        ) : (
          <div className="flex-1 py-3 bg-orange-500 text-white rounded-lg font-bold text-center">
            In Progress...
          </div>
        )}
      </div>
    </div>
  );
}

// Order List Item (similar structure)
function OrderListItem({ order, onStart, onCompleteItem, onComplete, getElapsedTime, getOrderColor }: any) {
  const elapsed = getElapsedTime(order.createdAt, order.startedAt);
  const allItemsReady = order.items.every((item: any) => item.status === 'ready');

  return (
    <div className={`rounded-xl border-4 ${getOrderColor(order)} p-6 shadow-lg flex items-center gap-6`}>
      <div
        className={`flex flex-col items-center justify-center w-24 h-24 rounded-full ${
          elapsed >= 15
            ? 'bg-red-600 text-white animate-pulse'
            : elapsed >= 10
            ? 'bg-orange-600 text-white'
            : 'bg-green-600 text-white'
        }`}
      >
        <Clock className="w-8 h-8 mb-1" />
        <span className="text-2xl font-bold">{elapsed}m</span>
      </div>

      <div className="flex-1">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-2xl font-bold text-gray-800 dark:text-white">
              {order.invoiceNumber}
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              {order.orderType === 'dine-in' && `Table ${order.tableNumber || '-'}`}
              {order.orderType === 'takeaway' && 'Takeaway'}
              {order.orderType === 'delivery' && 'Delivery'}
              {order.customerName && ` • ${order.customerName}`}
            </p>
          </div>

          {order.status === 'pending' ? (
            <button
              onClick={() => onStart(order.id)}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700"
            >
              Start
            </button>
          ) : allItemsReady ? (
            <button
              onClick={() => onComplete(order.id)}
              className="px-6 py-3 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 animate-pulse"
            >
              Complete
            </button>
          ) : (
            <div className="px-6 py-3 bg-orange-500 text-white rounded-lg font-bold">
              In Progress
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          {order.items.map((item: any) => (
            <div
              key={item.id}
              className={`p-3 rounded-lg flex items-center justify-between ${
                item.status === 'ready'
                  ? 'bg-green-100 dark:bg-green-900/30'
                  : 'bg-gray-50 dark:bg-gray-700'
              }`}
            >
              <div>
                <p className="font-semibold dark:text-white">
                  {item.quantity}x {item.productName}
                </p>
                {item.notes && (
                  <p className="text-xs text-red-600 dark:text-red-400">
                    {item.notes}
                  </p>
                )}
              </div>
              <button
                onClick={() => onCompleteItem(order.id, item.id)}
                disabled={item.status === 'ready'}
                className={`p-2 rounded-lg ${
                  item.status === 'ready'
                    ? 'bg-green-500'
                    : 'bg-white dark:bg-gray-600 hover:bg-green-50'
                }`}
              >
                <CheckCircle
                  className={`w-5 h-5 ${
                    item.status === 'ready' ? 'text-white' : 'text-gray-400'
                  }`}
                />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}