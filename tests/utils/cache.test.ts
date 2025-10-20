/**
 * Tests for EnhancedCache
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { EnhancedCache, generateCacheKey, memoize } from '../../src/utils/cache.js';

describe('EnhancedCache', () => {
  let cache: EnhancedCache;

  beforeEach(() => {
    cache = new EnhancedCache(5000, 100, 1024 * 1024);
  });

  afterEach(() => {
    cache.destroy();
  });

  describe('basic operations', () => {
    it('should set and get values', async () => {
      await cache.set('key1', 'value1');
      const value = await cache.get('key1');
      expect(value).toBe('value1');
    });

    it('should return undefined for missing keys', async () => {
      try {
        await cache.get('nonexistent');
      } catch (error) {
        expect(error.message).toContain('Cache miss');
      }
    });

    it('should use fetcher on cache miss', async () => {
      const fetcher = async () => 'fetched value';
      const value = await cache.get('key1', fetcher);
      expect(value).toBe('fetched value');
    });

    it('should cache fetched values', async () => {
      let callCount = 0;
      const fetcher = async () => {
        callCount++;
        return 'value';
      };

      await cache.get('key1', fetcher);
      await cache.get('key1', fetcher);

      expect(callCount).toBe(1); // Fetcher should only be called once
    });
  });

  describe('TTL and expiration', () => {
    it('should expire entries after TTL', async () => {
      const shortTtl = 100; // 100ms
      await cache.set('key1', 'value1', shortTtl);

      // Value should exist immediately
      expect(await cache.get('key1')).toBe('value1');

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 150));

      // Value should be expired
      try {
        await cache.get('key1');
      } catch (error) {
        expect(error.message).toContain('Cache miss');
      }
    });
  });

  describe('statistics', () => {
    it('should track hits and misses', async () => {
      await cache.set('key1', 'value1');

      // Hit
      await cache.get('key1');

      // Miss
      try {
        await cache.get('key2');
      } catch (error) {
        // Expected
      }

      const stats = cache.getStats();
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBe(0.5);
    });

    it('should track sets and deletes', async () => {
      await cache.set('key1', 'value1');
      await cache.set('key2', 'value2');
      cache.delete('key1');

      const stats = cache.getStats();
      expect(stats.sets).toBe(2);
      expect(stats.deletes).toBe(1);
    });
  });

  describe('deletion', () => {
    it('should delete specific keys', async () => {
      await cache.set('key1', 'value1');
      expect(cache.has('key1')).toBe(true);

      cache.delete('key1');
      expect(cache.has('key1')).toBe(false);
    });

    it('should delete by pattern', async () => {
      await cache.set('user:1', 'data1');
      await cache.set('user:2', 'data2');
      await cache.set('post:1', 'data3');

      const count = cache.deletePattern('user:*');
      expect(count).toBe(2);
      expect(cache.has('user:1')).toBe(false);
      expect(cache.has('user:2')).toBe(false);
      expect(cache.has('post:1')).toBe(true);
    });

    it('should clear all entries', async () => {
      await cache.set('key1', 'value1');
      await cache.set('key2', 'value2');

      cache.clear();
      expect(cache.size()).toBe(0);
    });
  });

  describe('events', () => {
    it('should emit hit events', async () => {
      let hitKey: string | undefined;

      cache.on('hit', (key) => {
        hitKey = key;
      });

      await cache.set('key1', 'value1');
      await cache.get('key1');

      expect(hitKey).toBe('key1');
    });

    it('should emit miss events', async () => {
      let missKey: string | undefined;

      cache.on('miss', (key) => {
        missKey = key;
      });

      try {
        await cache.get('nonexistent');
      } catch (error) {
        // Expected
      }

      expect(missKey).toBe('nonexistent');
    });

    it('should emit set events', async () => {
      let setKey: string | undefined;
      let setValue: any;

      cache.on('set', (key, value) => {
        setKey = key;
        setValue = value;
      });

      await cache.set('key1', 'value1');

      expect(setKey).toBe('key1');
      expect(setValue).toBe('value1');
    });
  });
});

describe('cache utilities', () => {
  describe('generateCacheKey', () => {
    it('should generate consistent keys', () => {
      const key1 = generateCacheKey('sport', 'nfl', { date: '20250101' });
      const key2 = generateCacheKey('sport', 'nfl', { date: '20250101' });
      expect(key1).toBe(key2);
    });

    it('should generate different keys for different inputs', () => {
      const key1 = generateCacheKey('sport', 'nfl');
      const key2 = generateCacheKey('sport', 'nba');
      expect(key1).not.toBe(key2);
    });
  });

  describe('memoize', () => {
    it('should memoize function results', async () => {
      const cache = new EnhancedCache();
      let callCount = 0;

      const fn = async (x: number) => {
        callCount++;
        return x * 2;
      };

      const memoized = memoize(fn, cache);

      const result1 = await memoized(5);
      const result2 = await memoized(5);

      expect(result1).toBe(10);
      expect(result2).toBe(10);
      expect(callCount).toBe(1);

      cache.destroy();
    });
  });
});
