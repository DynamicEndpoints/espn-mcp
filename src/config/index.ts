/**
 * Centralized configuration management for ESPN MCP Server
 * Provides type-safe configuration with validation and environment variable support
 */

import { z } from 'zod';

// ============================================================================
// Configuration Schema
// ============================================================================

const ConfigSchema = z.object({
  // Server Configuration
  server: z.object({
    port: z.number().int().positive().default(8081),
    host: z.string().default('0.0.0.0'),
    nodeEnv: z.enum(['development', 'production', 'test']).default('development'),
    transport: z.enum(['stdio', 'http']).default('stdio'),
  }),

  // ESPN API Configuration
  espn: z.object({
    baseUrl: z.string().url().default('https://site.api.espn.com/apis/site/v2/sports'),
    requestTimeout: z.number().positive().default(15000),
    maxRetries: z.number().int().min(0).max(5).default(3),
    retryDelay: z.number().positive().default(1000),
  }),

  // Cache Configuration
  cache: z.object({
    enabled: z.boolean().default(true),
    defaultTtl: z.number().positive().default(300000), // 5 minutes
    maxSize: z.number().positive().default(1000), // max entries
    maxMemory: z.number().positive().default(100 * 1024 * 1024), // 100MB
    // Sport-specific TTLs (in milliseconds)
    sportTtls: z.object({
      nfl: z.number().positive().default(180000), // 3 minutes
      nba: z.number().positive().default(60000),  // 1 minute
      mlb: z.number().positive().default(120000), // 2 minutes
      nhl: z.number().positive().default(120000), // 2 minutes
      cfb: z.number().positive().default(300000), // 5 minutes
      soccer: z.number().positive().default(240000), // 4 minutes
    }),
  }),

  // Rate Limiting Configuration
  rateLimit: z.object({
    enabled: z.boolean().default(true),
    maxRequests: z.number().positive().default(100),
    windowMs: z.number().positive().default(60000), // 1 minute
    skipSuccessfulRequests: z.boolean().default(false),
  }),

  // Features Configuration
  features: z.object({
    enableStreaming: z.boolean().default(true),
    enableSubscriptions: z.boolean().default(true),
    enableResourceTemplates: z.boolean().default(true),
    enableSessionManagement: z.boolean().default(true),
  }),

  // Logging Configuration
  logging: z.object({
    level: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),
    prettyPrint: z.boolean().default(true),
    destination: z.string().optional(),
  }),

  // CORS Configuration (for HTTP mode)
  cors: z.object({
    enabled: z.boolean().default(true),
    origin: z.union([z.string(), z.array(z.string())]).default('*'),
    credentials: z.boolean().default(true),
    maxAge: z.number().default(86400),
  }),

  // Health Check Configuration
  health: z.object({
    enabled: z.boolean().default(true),
    endpoint: z.string().default('/health'),
    includeDetails: z.boolean().default(true),
  }),

  // Monitoring Configuration
  monitoring: z.object({
    enabled: z.boolean().default(false),
    metricsEnabled: z.boolean().default(true),
    tracingEnabled: z.boolean().default(false),
  }),
});

export type Config = z.infer<typeof ConfigSchema>;

// ============================================================================
// Environment Variable Mapping
// ============================================================================

function getEnvValue(key: string, defaultValue?: any): any {
  const value = process.env[key];

  if (value === undefined) {
    return defaultValue;
  }

  // Handle boolean values
  if (value === 'true') return true;
  if (value === 'false') return false;

  // Handle numeric values
  const num = Number(value);
  if (!isNaN(num)) return num;

  // Return as string
  return value;
}

/**
 * Load configuration from environment variables
 */
export function loadConfig(): Config {
  const rawConfig = {
    server: {
      port: getEnvValue('PORT', 8081),
      host: getEnvValue('HOST', '0.0.0.0'),
      nodeEnv: getEnvValue('NODE_ENV', 'development'),
      transport: getEnvValue('TRANSPORT', 'stdio'),
    },
    espn: {
      baseUrl: getEnvValue('ESPN_BASE_URL', 'https://site.api.espn.com/apis/site/v2/sports'),
      requestTimeout: getEnvValue('ESPN_REQUEST_TIMEOUT', 15000),
      maxRetries: getEnvValue('ESPN_MAX_RETRIES', 3),
      retryDelay: getEnvValue('ESPN_RETRY_DELAY', 1000),
    },
    cache: {
      enabled: getEnvValue('CACHE_ENABLED', true),
      defaultTtl: getEnvValue('CACHE_DEFAULT_TTL', 300000),
      maxSize: getEnvValue('CACHE_MAX_SIZE', 1000),
      maxMemory: getEnvValue('CACHE_MAX_MEMORY', 100 * 1024 * 1024),
      sportTtls: {
        nfl: getEnvValue('CACHE_TTL_NFL', 180000),
        nba: getEnvValue('CACHE_TTL_NBA', 60000),
        mlb: getEnvValue('CACHE_TTL_MLB', 120000),
        nhl: getEnvValue('CACHE_TTL_NHL', 120000),
        cfb: getEnvValue('CACHE_TTL_CFB', 300000),
        soccer: getEnvValue('CACHE_TTL_SOCCER', 240000),
      },
    },
    rateLimit: {
      enabled: getEnvValue('RATE_LIMIT_ENABLED', true),
      maxRequests: getEnvValue('RATE_LIMIT_MAX_REQUESTS', 100),
      windowMs: getEnvValue('RATE_LIMIT_WINDOW_MS', 60000),
      skipSuccessfulRequests: getEnvValue('RATE_LIMIT_SKIP_SUCCESSFUL', false),
    },
    features: {
      enableStreaming: getEnvValue('ENABLE_STREAMING', true),
      enableSubscriptions: getEnvValue('ENABLE_SUBSCRIPTIONS', true),
      enableResourceTemplates: getEnvValue('ENABLE_RESOURCE_TEMPLATES', true),
      enableSessionManagement: getEnvValue('ENABLE_SESSION_MANAGEMENT', true),
    },
    logging: {
      level: getEnvValue('LOG_LEVEL', 'info'),
      prettyPrint: getEnvValue('LOG_PRETTY_PRINT', true),
      destination: getEnvValue('LOG_DESTINATION'),
    },
    cors: {
      enabled: getEnvValue('CORS_ENABLED', true),
      origin: getEnvValue('CORS_ORIGIN', '*'),
      credentials: getEnvValue('CORS_CREDENTIALS', true),
      maxAge: getEnvValue('CORS_MAX_AGE', 86400),
    },
    health: {
      enabled: getEnvValue('HEALTH_CHECK_ENABLED', true),
      endpoint: getEnvValue('HEALTH_CHECK_ENDPOINT', '/health'),
      includeDetails: getEnvValue('HEALTH_CHECK_INCLUDE_DETAILS', true),
    },
    monitoring: {
      enabled: getEnvValue('MONITORING_ENABLED', false),
      metricsEnabled: getEnvValue('METRICS_ENABLED', true),
      tracingEnabled: getEnvValue('TRACING_ENABLED', false),
    },
  };

  try {
    return ConfigSchema.parse(rawConfig);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Configuration validation failed:');
      error.errors.forEach((err) => {
        console.error(`  - ${err.path.join('.')}: ${err.message}`);
      });
      throw new Error('Invalid configuration');
    }
    throw error;
  }
}

// ============================================================================
// Configuration Singleton
// ============================================================================

let configInstance: Config | null = null;

/**
 * Get the current configuration instance
 * Loads from environment if not already loaded
 */
export function getConfig(): Config {
  if (!configInstance) {
    configInstance = loadConfig();
  }
  return configInstance;
}

/**
 * Reset the configuration instance (useful for testing)
 */
export function resetConfig(): void {
  configInstance = null;
}

/**
 * Override configuration values (useful for testing)
 */
export function setConfig(config: Partial<Config>): void {
  configInstance = ConfigSchema.parse({
    ...getConfig(),
    ...config,
  });
}

// ============================================================================
// Configuration Helpers
// ============================================================================

/**
 * Get TTL for a specific sport
 */
export function getSportTtl(sport: string, config: Config): number {
  const sportKey = sport.toLowerCase().replace(/-/g, '');

  // Map sport names to config keys
  const sportMap: Record<string, keyof Config['cache']['sportTtls']> = {
    'nfl': 'nfl',
    'football': 'nfl',
    'nba': 'nba',
    'basketball': 'nba',
    'mlb': 'mlb',
    'baseball': 'mlb',
    'nhl': 'nhl',
    'hockey': 'nhl',
    'collegefootball': 'cfb',
    'cfb': 'cfb',
    'soccer': 'soccer',
    'mls': 'soccer',
  };

  const configKey = sportMap[sportKey];
  return configKey ? config.cache.sportTtls[configKey] : config.cache.defaultTtl;
}

/**
 * Check if a feature is enabled
 */
export function isFeatureEnabled(feature: keyof Config['features'], config: Config): boolean {
  return config.features[feature];
}

/**
 * Get log level
 */
export function getLogLevel(config: Config): string {
  return config.logging.level;
}

/**
 * Check if running in development mode
 */
export function isDevelopment(config: Config): boolean {
  return config.server.nodeEnv === 'development';
}

/**
 * Check if running in production mode
 */
export function isProduction(config: Config): boolean {
  return config.server.nodeEnv === 'production';
}

/**
 * Check if running in test mode
 */
export function isTest(config: Config): boolean {
  return config.server.nodeEnv === 'test';
}

// ============================================================================
// Export Default Configuration
// ============================================================================

export default getConfig();
