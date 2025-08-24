import express from 'express';
import cors from 'cors';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { randomUUID } from 'crypto';
import { ESPNLazyServer } from './lazy-server.js';

class ESPNHttpServer {
  private app: express.Application;
  private mcpServer: McpServer;
  private transports: Map<string, StreamableHTTPServerTransport> = new Map();
  private espnCore: ESPNLazyServer;

  constructor() {
    this.app = express();
    this.espnCore = new ESPNLazyServer();
    this.mcpServer = this.espnCore.getServer();
    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware() {
    // CORS configuration
    this.app.use(cors({
      origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
      exposedHeaders: ['Mcp-Session-Id'],
      allowedHeaders: ['Content-Type', 'mcp-session-id'],
      credentials: true
    }));

    this.app.use(express.json({ limit: '10mb' }));
    
    // Security headers
    this.app.use((req, res, next) => {
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-Frame-Options', 'DENY');
      res.setHeader('X-XSS-Protection', '1; mode=block');
      next();
    });

    // Request logging
    this.app.use((req, res, next) => {
      console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
      next();
    });
  }

  private setupRoutes() {
    // Health check endpoint
    this.app.get('/health', (req, res) => {
      const health = {
        status: 'healthy',
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        activeTransports: this.transports.size,
        timestamp: new Date().toISOString()
      };
      res.json(health);
    });

    // MCP endpoint with session management
    this.app.post('/mcp', async (req, res) => {
      try {
        const sessionId = req.headers['mcp-session-id'] as string | undefined;
        let transport: StreamableHTTPServerTransport;

        if (sessionId && this.transports.has(sessionId)) {
          // Reuse existing transport
          transport = this.transports.get(sessionId)!;
        } else {
          // Create new transport
          transport = new StreamableHTTPServerTransport({
            sessionIdGenerator: () => randomUUID(),
            onsessioninitialized: (newSessionId) => {
              this.transports.set(newSessionId, transport);
              console.log(`Session initialized: ${newSessionId}`);
            },
            enableDnsRebindingProtection: true,
            allowedHosts: ['127.0.0.1', 'localhost'],
          });

          // Clean up on close
          transport.onclose = () => {
            if (transport.sessionId) {
              this.transports.delete(transport.sessionId);
              console.log(`Session closed: ${transport.sessionId}`);
            }
          };

          // Connect to MCP server
          await this.mcpServer.connect(transport);
        }

        // Handle the request
        await transport.handleRequest(req, res, req.body);
      } catch (error) {
        console.error('Error handling MCP request:', error);
        if (!res.headersSent) {
          res.status(500).json({
            jsonrpc: '2.0',
            error: {
              code: -32603,
              message: 'Internal server error',
            },
            id: null,
          });
        }
      }
    });

    // SSE endpoint for server-to-client notifications
    this.app.get('/mcp', async (req, res) => {
      const sessionId = req.headers['mcp-session-id'] as string | undefined;
      if (!sessionId || !this.transports.has(sessionId)) {
        res.status(400).send('Invalid or missing session ID');
        return;
      }
      
      const transport = this.transports.get(sessionId)!;
      await transport.handleRequest(req, res);
    });

    // Session termination
    this.app.delete('/mcp', async (req, res) => {
      const sessionId = req.headers['mcp-session-id'] as string | undefined;
      if (sessionId && this.transports.has(sessionId)) {
        const transport = this.transports.get(sessionId)!;
        await transport.handleRequest(req, res);
        this.transports.delete(sessionId);
        console.log(`Session terminated: ${sessionId}`);
      } else {
        res.status(400).send('Invalid or missing session ID');
      }
    });

    // Metrics endpoint
    this.app.get('/metrics', (req, res) => {
      const metrics = {
        activeSessions: this.transports.size,
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        cacheStats: this.espnCore.getCacheStats(),
        timestamp: new Date().toISOString()
      };
      res.json(metrics);
    });

    // Status endpoint for load balancer
    this.app.get('/status', (req, res) => {
      res.status(200).send('OK');
    });
  }

  async start(port: number = 3000) {
    return new Promise<void>((resolve, reject) => {
      this.app.listen(port, (error?: Error) => {
        if (error) {
          reject(error);
        } else {
          console.log(`ESPN MCP HTTP Server listening on port ${port}`);
          console.log(`Health check: http://localhost:${port}/health`);
          console.log(`MCP endpoint: http://localhost:${port}/mcp`);
          resolve();
        }
      });
    });
  }

  async stop() {
    // Close all active transports
    for (const [sessionId, transport] of this.transports) {
      try {
        await transport.close();
        console.log(`Closed transport for session: ${sessionId}`);
      } catch (error) {
        console.error(`Error closing transport ${sessionId}:`, error);
      }
    }
    this.transports.clear();
    
    // Clear cache
    this.espnCore.clearCache();
  }
}

// Start server if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const server = new ESPNHttpServer();
  const port = parseInt(process.env.PORT || '3000');

  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\nShutting down HTTP server gracefully...');
    await server.stop();
    process.exit(0);
  });

  server.start(port).catch(console.error);
}

export { ESPNHttpServer };
