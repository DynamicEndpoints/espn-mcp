/**
 * Smithery.ai compatible entry point for ESPN MCP Server
 * Exports a default function as required by Smithery TypeScript runtime
 */
import { z } from 'zod';
import { createModernESPNServer } from './modern-server.js';
// Configuration schema for Smithery validation - matches smithery.yaml exactly
export const configSchema = z.object({
    cacheTimeout: z.number().min(30000).max(1800000).default(300000),
    maxConcurrentRequests: z.number().min(1).max(20).default(5),
    enableStreaming: z.boolean().default(true),
    debug: z.boolean().default(false),
});
/**
 * Smithery-compatible server function
 * Creates and returns the ESPN MCP server with the provided configuration
 */
export default async function createESPNMCPServer({ sessionId, config } = {}) {
    // Validate configuration using Zod schema with defaults
    const validatedConfig = configSchema.parse(config || {});
    // Environment variables for ESPN API
    const espnConfig = {
        baseUrl: process.env.ESPN_API_BASE_URL || 'https://site.api.espn.com/apis/site/v2/sports',
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
        // Return the server instance for Smithery to connect to appropriate transport
        return server;
    }
    catch (error) {
        console.error('Failed to create ESPN MCP Server:', error);
        throw error;
    }
}
