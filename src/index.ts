/**
 * Smithery.ai compatible entry point for ESPN MCP Server
 * Exports a default function as required by Smithery TypeScript runtime
 */
import { z } from 'zod';
import { createModernESPNServer } from './modern-server.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

// Configuration schema for Smithery validation
export const configSchema = z.object({
  cacheTimeout: z.number().min(1000).max(3600000).default(300000), // 5 minutes default
  maxConcurrentRequests: z.number().min(1).max(100).default(10),
  enableStreaming: z.boolean().default(true),
  debug: z.boolean().default(false),
});

export type Config = z.infer<typeof configSchema>;

/**
 * Smithery-compatible server function
 * Creates and returns the ESPN MCP server with the provided configuration
 */
export default async function createESPNMCPServer({ sessionId, config }: { sessionId?: string; config?: Partial<Config> } = {}) {
  // Validate configuration using Zod schema with defaults
  const validatedConfig = configSchema.parse(config || {});
  
  // Environment variables for ESPN API
  const espnConfig = {
    baseUrl: process.env.ESPN_API_BASE_URL || 'http://site.api.espn.com/apis/site/v2/sports',
    cacheTimeout: validatedConfig.cacheTimeout,
    maxConcurrentRequests: validatedConfig.maxConcurrentRequests,
    enableStreaming: validatedConfig.enableStreaming,
    debug: validatedConfig.debug,
  };

  try {
    // Create and return the modern ESPN server
    const server = await createModernESPNServer();
    
    if (validatedConfig.debug) {
      console.log('ESPN MCP Server initialized with config:', espnConfig);
    }
    
    // Connect to stdio transport for Smithery compatibility
    const transport = new StdioServerTransport();
    await server.connect(transport);
    
    return server;
  } catch (error) {
    console.error('Failed to create ESPN MCP Server:', error);
    throw error;
  }
}
