/**
 * Structured logging utilities using pino
 * Provides consistent logging across the ESPN MCP Server
 */

import pino from 'pino';
import type { Config } from '../config/index.js';

// ============================================================================
// Logger Types
// ============================================================================

export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export interface LogContext {
  requestId?: string;
  tool?: string;
  sport?: string;
  league?: string;
  endpoint?: string;
  duration?: number;
  statusCode?: number;
  [key: string]: any;
}

// ============================================================================
// Logger Instance
// ============================================================================

let loggerInstance: pino.Logger | null = null;

/**
 * Create a logger instance with the specified configuration
 */
export function createLogger(config: Config): pino.Logger {
  const options: pino.LoggerOptions = {
    level: config.logging.level,
    timestamp: pino.stdTimeFunctions.isoTime,
    formatters: {
      level: (label) => {
        return { level: label };
      },
      bindings: (bindings) => {
        return {
          pid: bindings.pid,
          hostname: bindings.hostname,
          node_version: process.version,
        };
      },
    },
    serializers: {
      error: pino.stdSerializers.err,
      req: pino.stdSerializers.req,
      res: pino.stdSerializers.res,
    },
  };

  // Add pretty printing in development
  if (config.logging.prettyPrint && config.server.nodeEnv === 'development') {
    return pino({
      ...options,
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss.l',
          ignore: 'pid,hostname',
          singleLine: false,
          messageFormat: '{msg}',
          errorLikeObjectKeys: ['err', 'error'],
        },
      },
    });
  }

  // Use destination if specified
  if (config.logging.destination) {
    const destination = pino.destination({
      dest: config.logging.destination,
      sync: false,
    });
    return pino(options, destination);
  }

  return pino(options);
}

/**
 * Get the logger instance (creates if not exists)
 */
export function getLogger(config?: Config): pino.Logger {
  if (!loggerInstance) {
    if (!config) {
      // Create default logger for cases where config is not available
      loggerInstance = pino({
        level: process.env.LOG_LEVEL || 'info',
      });
    } else {
      loggerInstance = createLogger(config);
    }
  }
  return loggerInstance;
}

/**
 * Set the logger instance (useful for testing)
 */
export function setLogger(logger: pino.Logger): void {
  loggerInstance = logger;
}

/**
 * Reset the logger instance
 */
export function resetLogger(): void {
  loggerInstance = null;
}

// ============================================================================
// Convenience Logger
// ============================================================================

/**
 * Default logger that can be imported directly
 */
export const logger = {
  trace: (obj: any, msg?: string) => getLogger().trace(obj, msg),
  debug: (obj: any, msg?: string) => getLogger().debug(obj, msg),
  info: (obj: any, msg?: string) => getLogger().info(obj, msg),
  warn: (obj: any, msg?: string) => getLogger().warn(obj, msg),
  error: (obj: any, msg?: string) => getLogger().error(obj, msg),
  fatal: (obj: any, msg?: string) => getLogger().fatal(obj, msg),
  child: (bindings: pino.Bindings) => getLogger().child(bindings),
};

// ============================================================================
// Structured Logging Helpers
// ============================================================================

/**
 * Log an ESPN API request
 */
export function logAPIRequest(
  endpoint: string,
  context: LogContext = {}
): void {
  getLogger().debug({
    ...context,
    type: 'api_request',
    endpoint,
  }, `ESPN API request: ${endpoint}`);
}

/**
 * Log an ESPN API response
 */
export function logAPIResponse(
  endpoint: string,
  statusCode: number,
  duration: number,
  context: LogContext = {}
): void {
  const level = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'debug';

  getLogger()[level]({
    ...context,
    type: 'api_response',
    endpoint,
    statusCode,
    duration,
  }, `ESPN API response: ${endpoint} (${statusCode}) in ${duration}ms`);
}

/**
 * Log a tool call
 */
export function logToolCall(
  toolName: string,
  args: any,
  context: LogContext = {}
): void {
  getLogger().info({
    ...context,
    type: 'tool_call',
    tool: toolName,
    args,
  }, `Tool called: ${toolName}`);
}

/**
 * Log a tool result
 */
export function logToolResult(
  toolName: string,
  success: boolean,
  duration: number,
  context: LogContext = {}
): void {
  const level = success ? 'info' : 'error';

  getLogger()[level]({
    ...context,
    type: 'tool_result',
    tool: toolName,
    success,
    duration,
  }, `Tool ${success ? 'completed' : 'failed'}: ${toolName} in ${duration}ms`);
}

/**
 * Log a cache operation
 */
export function logCacheOperation(
  operation: 'hit' | 'miss' | 'set' | 'delete' | 'evict',
  key: string,
  context: LogContext = {}
): void {
  getLogger().trace({
    ...context,
    type: 'cache_operation',
    operation,
    key,
  }, `Cache ${operation}: ${key}`);
}

/**
 * Log an error with full context
 */
export function logError(
  error: Error,
  context: LogContext = {}
): void {
  getLogger().error({
    ...context,
    type: 'error',
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
      ...((error as any).toJSON?.() || {}),
    },
  }, `Error: ${error.message}`);
}

/**
 * Log server startup
 */
export function logServerStart(
  transport: string,
  port?: number,
  context: LogContext = {}
): void {
  getLogger().info({
    ...context,
    type: 'server_start',
    transport,
    port,
  }, `ESPN MCP Server starting (${transport}${port ? ` on port ${port}` : ''})`);
}

/**
 * Log server shutdown
 */
export function logServerShutdown(
  reason: string,
  context: LogContext = {}
): void {
  getLogger().info({
    ...context,
    type: 'server_shutdown',
    reason,
  }, `ESPN MCP Server shutting down: ${reason}`);
}

/**
 * Log performance metric
 */
export function logMetric(
  metric: string,
  value: number,
  unit: string,
  context: LogContext = {}
): void {
  getLogger().debug({
    ...context,
    type: 'metric',
    metric,
    value,
    unit,
  }, `Metric: ${metric} = ${value}${unit}`);
}

// ============================================================================
// Request Logger Middleware
// ============================================================================

/**
 * Create a child logger with request context
 */
export function createRequestLogger(requestId: string): pino.Logger {
  return getLogger().child({ requestId });
}

/**
 * Generate a unique request ID
 */
export function generateRequestId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// ============================================================================
// Performance Logging
// ============================================================================

/**
 * Create a performance timer
 */
export class PerformanceTimer {
  private startTime: number;
  private marks: Map<string, number> = new Map();

  constructor(private name: string, private context: LogContext = {}) {
    this.startTime = Date.now();
  }

  /**
   * Mark a checkpoint
   */
  mark(label: string): void {
    this.marks.set(label, Date.now() - this.startTime);
  }

  /**
   * Get duration since start or since a mark
   */
  getDuration(since?: string): number {
    if (since && this.marks.has(since)) {
      return Date.now() - this.startTime - this.marks.get(since)!;
    }
    return Date.now() - this.startTime;
  }

  /**
   * End the timer and log the result
   */
  end(success: boolean = true): number {
    const duration = this.getDuration();
    const level = success ? 'debug' : 'warn';

    getLogger()[level]({
      ...this.context,
      type: 'performance',
      name: this.name,
      duration,
      marks: Object.fromEntries(this.marks),
      success,
    }, `Performance: ${this.name} completed in ${duration}ms`);

    return duration;
  }
}

/**
 * Wrap a function with performance logging
 */
export function withPerformanceLogging<T extends (...args: any[]) => Promise<any>>(
  name: string,
  fn: T,
  context: LogContext = {}
): T {
  return (async (...args: Parameters<T>): Promise<ReturnType<T>> => {
    const timer = new PerformanceTimer(name, context);
    try {
      const result = await fn(...args);
      timer.end(true);
      return result;
    } catch (error) {
      timer.end(false);
      throw error;
    }
  }) as T;
}

// ============================================================================
// Log Sampling
// ============================================================================

/**
 * Sample logs based on a rate (0-1)
 */
export function shouldSample(rate: number): boolean {
  return Math.random() < rate;
}

/**
 * Create a sampled logger that only logs a percentage of calls
 */
export function createSampledLogger(
  rate: number,
  logger: pino.Logger = getLogger()
): pino.Logger {
  const handler: ProxyHandler<pino.Logger> = {
    get(target, prop) {
      const original = target[prop as keyof pino.Logger];

      if (typeof original === 'function' &&
          ['trace', 'debug', 'info', 'warn', 'error', 'fatal'].includes(prop as string)) {
        return (...args: any[]) => {
          if (shouldSample(rate)) {
            return (original as Function).apply(target, args);
          }
        };
      }

      return original;
    },
  };

  return new Proxy(logger, handler);
}
