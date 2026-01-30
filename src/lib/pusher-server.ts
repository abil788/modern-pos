// src/lib/pusher-server.ts
import PusherServer from 'pusher';

const isPusherConfigured =
  process.env.PUSHER_APP_ID &&
  process.env.NEXT_PUBLIC_PUSHER_KEY &&
  process.env.PUSHER_SECRET &&
  process.env.NEXT_PUBLIC_PUSHER_CLUSTER;

export const pusherServer = isPusherConfigured
  ? new PusherServer({
      appId: process.env.PUSHER_APP_ID!,
      key: process.env.NEXT_PUBLIC_PUSHER_KEY!,
      secret: process.env.PUSHER_SECRET!,
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
      useTLS: true,
    })
  : null;

// Trigger kitchen order event
export async function triggerKitchenOrder(storeId: string, order: any) {
  if (!pusherServer) {
    console.warn('[PUSHER] Pusher not configured, skipping real-time update');
    return;
  }

  try {
    await pusherServer.trigger(`kitchen-${storeId}`, 'new-order', order);
  } catch (error) {
    console.error('[PUSHER] ❌ Failed to trigger kitchen order:', error);
  }
}

// Trigger order status update
export async function triggerOrderUpdate(
  storeId: string,
  orderId: string,
  status: string
) {
  if (!pusherServer) {
    console.warn('[PUSHER] Pusher not configured, skipping real-time update');
    return;
  }

  try {
    await pusherServer.trigger(`kitchen-${storeId}`, 'order-update', {
      orderId,
      status,
      timestamp: new Date(),
    });
  } catch (error) {
    console.error('[PUSHER] ❌ Failed to trigger order update:', error);
  }
}