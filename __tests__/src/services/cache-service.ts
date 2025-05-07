const CACHE_NAME = 'ygo101-v1';
const ONE_WEEK_CACHE_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 1 week in ms
const TIMESTAMP_HEADER = 'X-Cached-Timestamp';

export class CacheService {
  static async getCardById(id: number) {
    try {
      const cache = await caches.open(CACHE_NAME);
      const request = new Request(`/cache/card/${id}`);
      const cachedResponse = await cache.match(request);

      if (!cachedResponse) return null;

      const timestamp = parseInt(cachedResponse.headers.get(TIMESTAMP_HEADER) || '0');
      const isFresh = Date.now() - timestamp < ONE_WEEK_CACHE_MAX_AGE;

      if (!isFresh) return null;

      const data = await cachedResponse.json();
      return data;
    } catch (error) {
      console.error('Cache lookup failed:', error);
      return null;
    }
  }

  static async saveCardById(id: number, data: any) {
    try {
      const cache = await caches.open(CACHE_NAME);
      const body = new Blob([JSON.stringify(data)], { type: 'application/json' });

      const headers = new Headers({
        'Content-Type': 'application/json',
        [TIMESTAMP_HEADER]: Date.now().toString(),
      });

      const response = new Response(body, { headers });

      await cache.put(new Request(`/cache/card/${id}`), response);
    } catch (error) {
      console.error('Failed to save to cache:', error);
    }
  }
}
