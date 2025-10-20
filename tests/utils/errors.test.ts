/**
 * Tests for error handling utilities
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  ESPNAPIError,
  ValidationError,
  TimeoutError,
  isRetryableError,
  withRetry,
  CircuitBreaker,
  getUserFriendlyMessage,
} from '../../src/utils/errors.js';

describe('Custom Errors', () => {
  describe('ESPNAPIError', () => {
    it('should create error with correct properties', () => {
      const error = new ESPNAPIError('API failed', 500, '/test', true);

      expect(error.message).toBe('API failed');
      expect(error.statusCode).toBe(500);
      expect(error.endpoint).toBe('/test');
      expect(error.retryable).toBe(true);
      expect(error.name).toBe('ESPNAPIError');
    });

    it('should identify retryable status codes', () => {
      expect(ESPNAPIError.isRetryable(500)).toBe(true);
      expect(ESPNAPIError.isRetryable(503)).toBe(true);
      expect(ESPNAPIError.isRetryable(429)).toBe(true);
      expect(ESPNAPIError.isRetryable(404)).toBe(false);
      expect(ESPNAPIError.isRetryable(400)).toBe(false);
    });

    it('should serialize to JSON', () => {
      const error = new ESPNAPIError('API failed', 500);
      const json = error.toJSON();

      expect(json).toHaveProperty('name', 'ESPNAPIError');
      expect(json).toHaveProperty('message', 'API failed');
      expect(json).toHaveProperty('statusCode', 500);
    });
  });

  describe('ValidationError', () => {
    it('should create validation error with field info', () => {
      const error = new ValidationError('Invalid date', 'date', '2025-13-01');

      expect(error.message).toBe('Invalid date');
      expect(error.field).toBe('date');
      expect(error.value).toBe('2025-13-01');
      expect(error.statusCode).toBe(400);
    });
  });

  describe('TimeoutError', () => {
    it('should create timeout error with duration', () => {
      const error = new TimeoutError('Request timed out', 5000);

      expect(error.message).toBe('Request timed out');
      expect(error.timeout).toBe(5000);
      expect(error.statusCode).toBe(408);
    });
  });
});

describe('Error detection', () => {
  it('should identify retryable errors', () => {
    const retryableAPIError = new ESPNAPIError('Server error', 500, '/test', true);
    const nonRetryableAPIError = new ESPNAPIError('Not found', 404, '/test', false);
    const timeoutError = new TimeoutError('Timeout', 5000);
    const validationError = new ValidationError('Invalid');

    expect(isRetryableError(retryableAPIError)).toBe(true);
    expect(isRetryableError(nonRetryableAPIError)).toBe(false);
    expect(isRetryableError(timeoutError)).toBe(true);
    expect(isRetryableError(validationError)).toBe(false);
  });
});

describe('withRetry', () => {
  it('should succeed on first try', async () => {
    const fn = vi.fn().mockResolvedValue('success');

    const result = await withRetry(fn, { maxRetries: 3 });

    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should retry on retryable errors', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new TimeoutError('Timeout', 5000))
      .mockRejectedValueOnce(new TimeoutError('Timeout', 5000))
      .mockResolvedValueOnce('success');

    const result = await withRetry(fn, {
      maxRetries: 3,
      baseDelay: 10,
    });

    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('should not retry on non-retryable errors', async () => {
    const fn = vi.fn().mockRejectedValue(new ValidationError('Invalid'));

    await expect(withRetry(fn, { maxRetries: 3 })).rejects.toThrow('Invalid');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should exhaust retries and throw last error', async () => {
    const fn = vi.fn().mockRejectedValue(new TimeoutError('Timeout', 5000));

    await expect(withRetry(fn, {
      maxRetries: 2,
      baseDelay: 10,
    })).rejects.toThrow('Timeout');

    expect(fn).toHaveBeenCalledTimes(3); // Initial + 2 retries
  });

  it('should call onRetry callback', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new TimeoutError('Timeout', 5000))
      .mockResolvedValueOnce('success');

    const onRetry = vi.fn();

    await withRetry(fn, {
      maxRetries: 2,
      baseDelay: 10,
      onRetry,
    });

    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(onRetry).toHaveBeenCalledWith(expect.any(TimeoutError), 1);
  });
});

describe('CircuitBreaker', () => {
  it('should start in closed state', () => {
    const cb = new CircuitBreaker('test');
    expect(cb.getState()).toBe('closed');
  });

  it('should execute function when closed', async () => {
    const cb = new CircuitBreaker('test');
    const fn = vi.fn().mockResolvedValue('success');

    const result = await cb.execute(fn);

    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should open after threshold failures', async () => {
    const cb = new CircuitBreaker('test', { failureThreshold: 3 });
    const fn = vi.fn().mockRejectedValue(new Error('fail'));

    // Fail 3 times
    for (let i = 0; i < 3; i++) {
      try {
        await cb.execute(fn);
      } catch (error) {
        // Expected
      }
    }

    expect(cb.getState()).toBe('open');
  });

  it('should reject immediately when open', async () => {
    const cb = new CircuitBreaker('test', {
      failureThreshold: 1,
      timeout: 1000,
    });

    const fn = vi.fn().mockRejectedValue(new Error('fail'));

    // Trigger open
    try {
      await cb.execute(fn);
    } catch (error) {
      // Expected
    }

    // Should reject immediately
    await expect(cb.execute(fn)).rejects.toThrow('Circuit breaker');
    expect(fn).toHaveBeenCalledTimes(1); // Only first call
  });

  it('should reset stats on success', async () => {
    const cb = new CircuitBreaker('test', { failureThreshold: 3 });
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValue('success');

    // One failure
    try {
      await cb.execute(fn);
    } catch (error) {
      // Expected
    }

    // Success should reset
    await cb.execute(fn);

    expect(cb.getStats().failureCount).toBe(0);
  });
});

describe('getUserFriendlyMessage', () => {
  it('should return friendly message for API errors', () => {
    const error404 = new ESPNAPIError('Not found', 404);
    const error429 = new ESPNAPIError('Rate limit', 429);
    const error500 = new ESPNAPIError('Server error', 500);

    expect(getUserFriendlyMessage(error404)).toContain('could not be found');
    expect(getUserFriendlyMessage(error429)).toContain('Rate limit exceeded');
    expect(getUserFriendlyMessage(error500)).toContain('experiencing issues');
  });

  it('should return friendly message for timeout errors', () => {
    const error = new TimeoutError('Timeout', 5000);
    expect(getUserFriendlyMessage(error)).toContain('timed out');
  });

  it('should return friendly message for validation errors', () => {
    const error = new ValidationError('Invalid date');
    expect(getUserFriendlyMessage(error)).toContain('Invalid input');
  });
});
