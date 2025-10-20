/**
 * Improved caching implementation with LRU eviction, size limits, and statistics
 */

import { EventEmitter } from 'events';
import { LRUCache } from 'lru-cache';
import { CacheError } from './errors.js';
import type { Config } from '../config/index.js';

// ============================================================================
// Cache Statistics
// ============================================================================

export interface CacheStats {
  size: number;
  calculatedSize: number;
  maxSize: number;
  maxMemory: number;
  hits: number;
  misses: number;
  hitRate: number;
  sets: number;
  deletes: number;
  evictions: number;
  ttl: number;
}

export interface CacheEntry<T> {
  value: T;
  createdAt: number;
  expiresAt: number;
  accessCount: number;
  lastAccessed: number;
}

// ============================================================================
// Cache Events
// ============================================================================

export interface CacheEvents {
  hit: (key: string) => void;
  miss: (key: string) => void;
  set: (key: string, value: any) => void;
  delete: (key: string) => void;
  evict: (key: string, value: any) => void;
  expire: (key: string) => void;
  clear: () => void;
}

// ============================================================================
// Enhanced Cache Implementation
// ============================================================================

/**
 * Enhanced cache with LRU eviction, size limits, and comprehensive statistics
 */
export class EnhancedCache<T = any> extends EventEmitter {
  private cache: LRUCache<string, CacheEntry<T>>;
  private hits = 0;
  private misses = 0;
  private sets = 0;
  private deletes = 0;
  private evictions = 0;

  constructor(
    private defaultTtl: number = 300000, // 5 minutes
    private maxSize: number = 1000,
    private maxMemory: number = 100 * 1024 * 1024 // 100MB
  ) {
    super();

    this.cache = new LRUCache<string, CacheEntry<T>>({
      max: maxSize,
      maxSize: maxMemory,
      ttl: defaultTtl,

      // Calculate entry size based on JSON string length
      sizeCalculation: (entry: CacheEntry<T>) => {
        try {
          return JSON.stringify(entry.value).length + 100; // +100 for metadata
        } catch {
          return 1000; // Default size if stringify fails
        }
      },

      // Update timestamps on access
      updateAgeOnGet: true,
      updateAgeOnHas: true,

      // Handle disposal
      dispose: (entry: CacheEntry<T>, key: string, reason: LRUCache.DisposeReason) => {
        if (reason === 'evict') {
          this.evictions++;
          this.emit('evict', key, entry.value);
        } else if (reason === 'delete') {
          this.emit('delete', key);
        }
      },

      // Allow stale data while refreshing
      allowStale: false,

      // TTL resolution
      ttlResolution: 1000,
      ttlAutopurge: true,
    });
  }

  /**
   * Get a value from cache or compute it
   */
  async get<K extends T = T>(
    key: string,
    fetcher?: () => Promise<K>,
    ttl: number = this.defaultTtl
  ): Promise<K> {
    try {
      // Check cache first
      const entry = this.cache.get(key);

      if (entry) {
        this.hits++;
        entry.accessCount++;
        entry.lastAccessed = Date.now();
        this.emit('hit', key);
        return entry.value as K;
      }

      this.misses++;
      this.emit('miss', key);

      // If no fetcher provided, throw
      if (!fetcher) {
        throw new CacheError(`Cache miss for key: ${key}`, 'get');
      }

      // Fetch and cache
      const value = await fetcher();
      await this.set(key, value, ttl);

      return value;
    } catch (error) {
      if (error instanceof CacheError) {
        throw error;
      }
      throw new CacheError(
        `Failed to get cache entry for key: ${key}`,
        'get'
      );
    }
  }

  /**
   * Set a value in cache
   */
  async set<K extends T = T>(
    key: string,
    value: K,
    ttl: number = this.defaultTtl
  ): Promise<void> {
    try {
      const now = Date.now();
      const entry: CacheEntry<K> = {
        value,
        createdAt: now,
        expiresAt: now + ttl,
        accessCount: 0,
        lastAccessed: now,
      };

      this.cache.set(key, entry as CacheEntry<T>, { ttl });
      this.sets++;
      this.emit('set', key, value);
    } catch (error) {
      throw new CacheError(
        `Failed to set cache entry for key: ${key}`,
        'set'
      );
    }
  }

  /**
   * Check if key exists in cache
   */
  has(key: string): boolean {
    return this.cache.has(key);
  }

  /**
   * Get a value without updating access time
   */
  peek(key: string): T | undefined {
    const entry = this.cache.peek(key);
    return entry?.value;
  }

  /**
   * Delete a specific key
   */
  delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.deletes++;
      this.emit('delete', key);
    }
    return deleted;
  }

  /**
   * Delete all keys matching a pattern
   */
  deletePattern(pattern: string | RegExp): number {
    const regex = typeof pattern === 'string'
      ? new RegExp(pattern.replace(/\*/g, '.*'))
      : pattern;

    let count = 0;
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.delete(key);
        count++;
      }
    }
    return count;
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
    this.sets = 0;
    this.deletes = 0;
    this.evictions = 0;
    this.emit('clear');
  }

  /**
   * Get all cache keys
   */
  keys(): IterableIterator<string> {
    return this.cache.keys();
  }

  /**
   * Get all cache values
   */
  values(): IterableIterator<T> {
    const values: T[] = [];
    for (const entry of this.cache.values()) {
      values.push(entry.value);
    }
    return values[Symbol.iterator]();
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Get comprehensive cache statistics
   */
  getStats(): CacheStats {
    const total = this.hits + this.misses;
    const hitRate = total > 0 ? this.hits / total : 0;

    return {
      size: this.cache.size,
      calculatedSize: this.cache.calculatedSize || 0,
      maxSize: this.maxSize,
      maxMemory: this.maxMemory,
      hits: this.hits,
      misses: this.misses,
      hitRate: parseFloat(hitRate.toFixed(4)),
      sets: this.sets,
      deletes: this.deletes,
      evictions: this.evictions,
      ttl: this.defaultTtl,
    };
  }

  /**
   * Get detailed information about a cache entry
   */
  getEntryInfo(key: string): CacheEntry<T> | undefined {
    return this.cache.peek(key);
  }

  /**
   * Prune expired entries
   */
  prune(): void {
    this.cache.purgeStale();
  }

  /**
   * Reset statistics without clearing cache
   */
  resetStats(): void {
    this.hits = 0;
    this.misses = 0;
    this.sets = 0;
    this.deletes = 0;
    this.evictions = 0;
  }

  /**
   * Dump cache contents (useful for debugging)
   */
  dump(): Array<{ key: string; entry: CacheEntry<T> }> {
    const entries: Array<{ key: string; entry: CacheEntry<T> }> = [];
    for (const [key, entry] of this.cache.entries()) {
      entries.push({ key, entry });
    }
    return entries;
  }

  /**
   * Load cache from dump
   */
  load(dump: Array<{ key: string; entry: CacheEntry<T> }>): void {
    for (const { key, entry } of dump) {
      const ttl = entry.expiresAt - Date.now();
      if (ttl > 0) {
        this.cache.set(key, entry, { ttl });
      }
    }
  }

  /**
   * Destroy cache and cleanup
   */
  destroy(): void {
    this.clear();
    this.removeAllListeners();
  }
}

// ============================================================================
// Cache Factory
// ============================================================================

/**
 * Create a cache instance from configuration
 */
export function createCache<T = any>(config: Config): EnhancedCache<T> {
  return new EnhancedCache<T>(
    config.cache.defaultTtl,
    config.cache.maxSize,
    config.cache.maxMemory
  );
}

// ============================================================================
// Multi-Level Cache
// ============================================================================

/**
 * Multi-level cache with L1 (memory) and L2 (persistent) support
 * Currently implements L1 only, but designed for future L2 addition
 */
export class MultiLevelCache<T = any> extends EventEmitter {
  private l1Cache: EnhancedCache<T>;

  constructor(config: Config) {
    super();
    this.l1Cache = createCache<T>(config);

    // Forward events from L1
    this.l1Cache.on('hit', (key) => this.emit('hit', key, 'l1'));
    this.l1Cache.on('miss', (key) => this.emit('miss', key, 'l1'));
    this.l1Cache.on('set', (key, value) => this.emit('set', key, value, 'l1'));
    this.l1Cache.on('evict', (key, value) => this.emit('evict', key, value, 'l1'));
  }

  async get<K extends T = T>(
    key: string,
    fetcher?: () => Promise<K>,
    ttl?: number
  ): Promise<K> {
    // Try L1 cache
    return this.l1Cache.get(key, fetcher, ttl);
  }

  async set<K extends T = T>(key: string, value: K, ttl?: number): Promise<void> {
    await this.l1Cache.set(key, value, ttl);
  }

  has(key: string): boolean {
    return this.l1Cache.has(key);
  }

  delete(key: string): boolean {
    return this.l1Cache.delete(key);
  }

  clear(): void {
    this.l1Cache.clear();
  }

  getStats() {
    return {
      l1: this.l1Cache.getStats(),
    };
  }

  destroy(): void {
    this.l1Cache.destroy();
    this.removeAllListeners();
  }
}

// ============================================================================
// Cache Utilities
// ============================================================================

/**
 * Generate a cache key from components
 */
export function generateCacheKey(...parts: any[]): string {
  return parts
    .map((part) => {
      if (typeof part === 'object') {
        return JSON.stringify(part);
      }
      return String(part);
    })
    .join(':');
}

/**
 * Create a memoized version of a function
 */
export function memoize<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  cache: EnhancedCache,
  keyGenerator: (...args: Parameters<T>) => string = (...args) => generateCacheKey(...args),
  ttl?: number
): T {
  return (async (...args: Parameters<T>): Promise<ReturnType<T>> => {
    const key = keyGenerator(...args);
    return cache.get(key, () => fn(...args), ttl);
  }) as T;
}
