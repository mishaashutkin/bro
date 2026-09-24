/**
 * In-memory TTL cache for match predictions.
 * Prevents unnecessary calls to Gemini API when the same sport, date, and hour are requested.
 * Saves 100% of API quota for repeated checks.
 */

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

class MemoryCache {
  private cache = new Map<string, CacheEntry<any>>();

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return entry.data as T;
  }

  set<T>(key: string, data: T, ttlSeconds: number = 600): void {
    this.cache.set(key, {
      data,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  clean(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }
}

export const predictionCache = new MemoryCache();
