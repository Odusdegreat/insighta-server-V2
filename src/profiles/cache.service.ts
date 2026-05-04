import { Injectable } from '@nestjs/common';

interface CacheEntry {
  data: any;
  timestamp: number;
}

@Injectable()
export class CacheService {
  private cache = new Map<string, CacheEntry>();
  private readonly ttl = 5 * 60 * 1000; // 5 minutes TTL

  get(key: string): any | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  set(key: string, data: any): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  // Simple in-memory cache - suitable for single instance
  // For multi-instance, use Redis. Justification: single instance based on constraints
}
