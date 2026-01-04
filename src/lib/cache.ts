const cache = new Map();
const CACHE_TTL = 60000; // 1 menit

export function getCached(key: string) {
  const item = cache.get(key);
  if (!item) return null;
  
  if (Date.now() > item.expiry) {
    cache.delete(key);
    return null;
  }
  
  return item.data;
}

export function setCache(key: string, data: any, ttl = CACHE_TTL) {
  cache.set(key, {
    data,
    expiry: Date.now() + ttl,
  });
}