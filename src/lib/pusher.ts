// src/lib/pusher.ts
import PusherClient from 'pusher-js';

// Check if Pusher credentials are configured
const isPusherEnabled = 
  typeof window !== 'undefined' && 
  process.env.NEXT_PUBLIC_PUSHER_KEY && 
  process.env.NEXT_PUBLIC_PUSHER_CLUSTER;

export const pusherClient = isPusherEnabled
  ? new PusherClient(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
      forceTLS: true,
    })
  : null;

// Helper to check if Pusher is available
export const isPusherAvailable = () => pusherClient !== null;

// Log Pusher status
if (typeof window !== 'undefined') {
  if (isPusherAvailable()) {
  } else {
    console.warn('⚠️ Pusher not configured - using polling fallback');
  }
}