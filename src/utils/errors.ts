/**
 * Custom error classes and error handling utilities for ESPN MCP Server
 * Provides structured error handling with retry logic and circuit breaker patterns
 */

// ============================================================================
// Custom Error Classes
// ============================================================================

/**
 * Base error class for ESPN MCP Server
 */
export class ESPNMCPError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode?: number,
    public details?: any
  ) {
    super(message);
    this.name = 'ESPNMCPError';
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      details: this.details,
    };
  }
}

/**
 * Error for ESPN API failures
 */
export class ESPNAPIError extends ESPNMCPError {
  constructor(
    message: string,
    public statusCode: number,
    public endpoint?: string,
    public retryable: boolean = false
  ) {
    super(message, 'ESPN_API_ERROR', statusCode, { endpoint, retryable });
    this.name = 'ESPNAPIError';
  }

  static isRetryable(statusCode: number): boolean {
    // 5xx errors and 429 (rate limit) are retryable
    return statusCode >= 500 || statusCode === 429 || statusCode === 408;
  }
}

/**
 * Error for validation failures
 */
export class ValidationError extends ESPNMCPError {
  constructor(
    message: string,
    public field?: string,
    public value?: any
  ) {
    super(message, 'VALIDATION_ERROR', 400, { field, value });
    this.name = 'ValidationError';
  }
}

/**
 * Error for timeout failures
 */
export class TimeoutError extends ESPNMCPError {
  constructor(
    message: string,
    public timeout: number
  ) {
    super(message, 'TIMEOUT_ERROR', 408, { timeout });
    this.name = 'TimeoutError';
  }
}

/**
 * Error for cache failures
 */
export class CacheError extends ESPNMCPError {
  constructor(
    message: string,
    public operation: string
  ) {
    super(message, 'CACHE_ERROR', 500, { operation });
    this.name = 'CacheError';
  }
}

/**
 * Error for rate limit exceeded
 */
export class RateLimitError extends ESPNMCPError {
  constructor(
    message: string,
    public retryAfter?: number
  ) {
    super(message, 'RATE_LIMIT_ERROR', 429, { retryAfter });
    this.name = 'RateLimitError';
  }
}

/**
 * Error for circuit breaker open
 */
export class CircuitBreakerError extends ESPNMCPError {
  constructor(
    message: string,
    public circuitState: string
  ) {
    super(message, 'CIRCUIT_BREAKER_OPEN', 503, { circuitState });
    this.name = 'CircuitBreakerError';
  }
}

// ============================================================================
// Error Type Guards
// ============================================================================

export function isESPNMCPError(error: any): error is ESPNMCPError {
  return error instanceof ESPNMCPError;
}

export function isESPNAPIError(error: any): error is ESPNAPIError {
  return error instanceof ESPNAPIError;
}

export function isValidationError(error: any): error is ValidationError {
  return error instanceof ValidationError;
}

export function isTimeoutError(error: any): error is TimeoutError {
  return error instanceof TimeoutError;
}

export function isRateLimitError(error: any): error is RateLimitError {
  return error instanceof RateLimitError;
}

export function isCircuitBreakerError(error: any): error is CircuitBreakerError {
  return error instanceof CircuitBreakerError;
}

/**
 * Check if an error is retryable
 */
export function isRetryableError(error: any): boolean {
  if (isESPNAPIError(error)) {
    return error.retryable || ESPNAPIError.isRetryable(error.statusCode);
  }

  if (isTimeoutError(error)) {
    return true;
  }

  if (isRateLimitError(error)) {
    return true;
  }

  // Network errors from fetch
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return true;
  }

  return false;
}

// ============================================================================
// Retry Logic
// ============================================================================

export interface RetryOptions {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  onRetry?: (error: Error, attempt: number) => void | Promise<void>;
}

/**
 * Sleep for a specified number of milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calculate exponential backoff delay
 */
function calculateBackoff(
  attempt: number,
  baseDelay: number,
  maxDelay: number,
  multiplier: number
): number {
  const delay = baseDelay * Math.pow(multiplier, attempt);
  const jitter = Math.random() * 0.3 * delay; // Add 0-30% jitter
  return Math.min(delay + jitter, maxDelay);
}

/**
 * Execute a function with retry logic
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    maxDelay = 30000,
    backoffMultiplier = 2,
    onRetry,
  } = options;

  let lastError: Error;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      // Don't retry if we've exhausted retries
      if (attempt >= maxRetries) {
        break;
      }

      // Don't retry if error is not retryable
      if (!isRetryableError(error)) {
        throw error;
      }

      // Calculate delay with exponential backoff
      const delay = calculateBackoff(attempt, baseDelay, maxDelay, backoffMultiplier);

      // Call retry callback if provided
      if (onRetry) {
        await onRetry(lastError, attempt + 1);
      }

      // Wait before retrying
      await sleep(delay);
    }
  }

  throw lastError!;
}

// ============================================================================
// Circuit Breaker
// ============================================================================

export interface CircuitBreakerOptions {
  failureThreshold?: number; // Number of failures before opening
  successThreshold?: number; // Number of successes before closing from half-open
  timeout?: number; // Timeout in ms before trying half-open
  onStateChange?: (from: CircuitState, to: CircuitState) => void;
}

export type CircuitState = 'closed' | 'open' | 'half-open';

/**
 * Circuit Breaker implementation to prevent cascading failures
 */
export class CircuitBreaker {
  private state: CircuitState = 'closed';
  private failureCount = 0;
  private successCount = 0;
  private nextAttempt = Date.now();

  constructor(
    private name: string,
    private options: CircuitBreakerOptions = {}
  ) {
    this.options = {
      failureThreshold: 5,
      successThreshold: 2,
      timeout: 60000,
      ...options,
    };
  }

  getState(): CircuitState {
    return this.state;
  }

  getStats() {
    return {
      name: this.name,
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      nextAttempt: this.nextAttempt,
    };
  }

  private setState(newState: CircuitState): void {
    const oldState = this.state;
    this.state = newState;

    if (oldState !== newState && this.options.onStateChange) {
      this.options.onStateChange(oldState, newState);
    }
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() < this.nextAttempt) {
        throw new CircuitBreakerError(
          `Circuit breaker "${this.name}" is open`,
          this.state
        );
      }
      // Try half-open
      this.setState('half-open');
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failureCount = 0;

    if (this.state === 'half-open') {
      this.successCount++;

      if (this.successCount >= this.options.successThreshold!) {
        this.successCount = 0;
        this.setState('closed');
      }
    }
  }

  private onFailure(): void {
    this.failureCount++;
    this.successCount = 0;

    if (this.failureCount >= this.options.failureThreshold!) {
      this.setState('open');
      this.nextAttempt = Date.now() + this.options.timeout!;
    }
  }

  reset(): void {
    this.state = 'closed';
    this.failureCount = 0;
    this.successCount = 0;
    this.nextAttempt = Date.now();
  }
}

// ============================================================================
// Error Formatting
// ============================================================================

/**
 * Format an error for logging or display
 */
export function formatError(error: any): Record<string, any> {
  if (isESPNMCPError(error)) {
    return error.toJSON();
  }

  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  return {
    message: String(error),
  };
}

/**
 * Convert error to user-friendly message
 */
export function getUserFriendlyMessage(error: any): string {
  if (isESPNAPIError(error)) {
    if (error.statusCode === 404) {
      return 'The requested sports data could not be found.';
    }
    if (error.statusCode === 429) {
      return 'Rate limit exceeded. Please try again in a moment.';
    }
    if (error.statusCode >= 500) {
      return 'ESPN API is currently experiencing issues. Please try again later.';
    }
    return `ESPN API error: ${error.message}`;
  }

  if (isTimeoutError(error)) {
    return 'Request timed out. Please try again.';
  }

  if (isValidationError(error)) {
    return `Invalid input: ${error.message}`;
  }

  if (isRateLimitError(error)) {
    const retryAfter = error.retryAfter ? ` Try again in ${error.retryAfter}s.` : '';
    return `Rate limit exceeded.${retryAfter}`;
  }

  if (isCircuitBreakerError(error)) {
    return 'Service is temporarily unavailable. Please try again later.';
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'An unexpected error occurred.';
}

// ============================================================================
// Error Handler Middleware
// ============================================================================

/**
 * Wrap a function with error handling
 */
export function withErrorHandling<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  errorHandler?: (error: Error) => void
): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await fn(...args);
    } catch (error) {
      if (errorHandler) {
        errorHandler(error as Error);
      }
      throw error;
    }
  }) as T;
}

/**
 * Create a safe version of a function that doesn't throw
 */
export function makeSafe<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  defaultValue?: any
): (...args: Parameters<T>) => Promise<ReturnType<T> | typeof defaultValue> {
  return async (...args: Parameters<T>) => {
    try {
      return await fn(...args);
    } catch (error) {
      return defaultValue;
    }
  };
}
