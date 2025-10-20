/**
 * Client pool for proper resource management
 * Prevents memory leaks by reusing client instances
 */

import { EventEmitter } from 'events';
import type { ModernESPNClient } from '../client/espn-client.js';
import type { Config } from '../config/index.js';
import { logger } from './logger.js';

// ============================================================================
// Client Pool
// ============================================================================

/**
 * Singleton client pool to manage ESPN client instances
 * Prevents creating new clients for every request
 */
export class ESPNClientPool extends EventEmitter {
  private static instance: ESPNClientPool | null = null;
  private client: ModernESPNClient | null = null;
  private refCount: number = 0;
  private config: Config | null = null;

  private constructor() {
    super();
  }

  /**
   * Get the singleton instance
   */
  static getInstance(): ESPNClientPool {
    if (!ESPNClientPool.instance) {
      ESPNClientPool.instance = new ESPNClientPool();
    }
    return ESPNClientPool.instance;
  }

  /**
   * Initialize the pool with configuration
   */
  initialize(config: Config, ClientClass: new (config: Config) => ModernESPNClient): void {
    if (this.client) {
      logger.warn('Client pool already initialized, skipping');
      return;
    }

    this.config = config;
    this.client = new ClientClass(config);
    this.refCount = 0;

    logger.info({
      type: 'client_pool_init',
      cacheTimeout: config.cache.defaultTtl,
    }, 'ESPN client pool initialized');

    this.emit('initialized');
  }

  /**
   * Get a client instance
   * Increments reference count
   */
  acquire(): ModernESPNClient {
    if (!this.client) {
      throw new Error('Client pool not initialized. Call initialize() first.');
    }

    this.refCount++;
    this.emit('acquire', this.refCount);

    logger.trace({
      type: 'client_acquire',
      refCount: this.refCount,
    }, 'Client acquired from pool');

    return this.client;
  }

  /**
   * Release a client instance
   * Decrements reference count
   */
  release(): void {
    if (this.refCount > 0) {
      this.refCount--;
      this.emit('release', this.refCount);

      logger.trace({
        type: 'client_release',
        refCount: this.refCount,
      }, 'Client released to pool');
    }
  }

  /**
   * Get current reference count
   */
  getRefCount(): number {
    return this.refCount;
  }

  /**
   * Get pool statistics
   */
  getStats() {
    return {
      initialized: this.client !== null,
      refCount: this.refCount,
      cacheStats: this.client?.getCacheStats() || null,
    };
  }

  /**
   * Destroy the pool and cleanup resources
   * Should only be called on server shutdown
   */
  async destroy(): Promise<void> {
    if (!this.client) {
      return;
    }

    logger.info({
      type: 'client_pool_destroy',
      refCount: this.refCount,
    }, 'Destroying ESPN client pool');

    // Warn if there are active references
    if (this.refCount > 0) {
      logger.warn({
        type: 'client_pool_destroy_warning',
        refCount: this.refCount,
      }, `Destroying client pool with ${this.refCount} active references`);
    }

    // Destroy the client
    await this.client.destroy();
    this.client = null;
    this.refCount = 0;
    this.config = null;

    this.emit('destroyed');
  }

  /**
   * Reset the pool (useful for testing)
   */
  static reset(): void {
    if (ESPNClientPool.instance?.client) {
      ESPNClientPool.instance.client.destroy();
    }
    ESPNClientPool.instance = null;
  }
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Get the global client pool instance
 */
export function getClientPool(): ESPNClientPool {
  return ESPNClientPool.getInstance();
}

/**
 * Initialize the global client pool
 */
export function initializeClientPool(
  config: Config,
  ClientClass: new (config: Config) => ModernESPNClient
): void {
  getClientPool().initialize(config, ClientClass);
}

/**
 * Get a client from the global pool
 */
export function getClient(): ModernESPNClient {
  return getClientPool().acquire();
}

/**
 * Release a client back to the global pool
 */
export function releaseClient(): void {
  getClientPool().release();
}

/**
 * Destroy the global client pool
 */
export async function destroyClientPool(): Promise<void> {
  await getClientPool().destroy();
}

// ============================================================================
// Client Wrapper with Auto-Release
// ============================================================================

/**
 * Execute a function with a client and automatically release it
 */
export async function withClient<T>(
  fn: (client: ModernESPNClient) => Promise<T>
): Promise<T> {
  const client = getClient();
  try {
    return await fn(client);
  } finally {
    releaseClient();
  }
}

/**
 * Create a scoped client that auto-releases
 */
export class ScopedClient {
  private client: ModernESPNClient;
  private released = false;

  constructor() {
    this.client = getClient();
  }

  /**
   * Get the underlying client
   */
  get(): ModernESPNClient {
    if (this.released) {
      throw new Error('Client has been released');
    }
    return this.client;
  }

  /**
   * Release the client back to the pool
   */
  release(): void {
    if (!this.released) {
      releaseClient();
      this.released = true;
    }
  }

  /**
   * Auto-release when scope ends
   */
  [Symbol.dispose](): void {
    this.release();
  }
}
