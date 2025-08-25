/**
 * Smithery.ai compatible ESPN MCP Server
 * Main entry point with complete MCP implementation and HTTP transport
 */
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
  ListToolsRequestSchema,
  Tool,
  Resource,
  Prompt,
  PromptMessage,
  TextContent,
  ResourceContents
} from "@modelcontextprotocol/sdk/types.js";
import express from "express";
import cors from "cors";
import { z } from 'zod';

// Configuration schema for Smithery validation - matches smithery.yaml exactly
export const configSchema = z.object({
  cacheTimeout: z.number().min(30000).max(1800000).default(300000),
  maxConcurrentRequests: z.number().min(1).max(20).default(5),
  enableStreaming: z.boolean().default(true),
  debug: z.boolean().default(false),
});

export type Config = z.infer<typeof configSchema>;

// Modern cache implementation
class ModernCache {
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  private cleanupInterval: NodeJS.Timeout;

  constructor(private defaultTtl = 300000) { // 5 minutes
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000);
  }

  async get<T>(key: string, fetcher: () => Promise<T>, ttl = this.defaultTtl): Promise<T> {
    const entry = this.cache.get(key);
    const now = Date.now();

    if (entry && now - entry.timestamp < entry.ttl) {
      return entry.data;
    }

    const data = await fetcher();
    this.cache.set(key, { data, timestamp: now, ttl });
    return data;
  }

  private cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
      }
    }
  }

  destroy() {
    clearInterval(this.cleanupInterval);
    this.cache.clear();
  }
}

// ESPN API client
class ESPNClient {
  private cache: ModernCache;
  private baseUrl = "https://site.api.espn.com/apis/site/v2/sports";

  constructor(cacheTimeout = 300000) {
    this.cache = new ModernCache(cacheTimeout);
  }

  async fetchData(endpoint: string): Promise<any> {
    return this.cache.get(endpoint, async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      try {
        const response = await fetch(`${this.baseUrl}${endpoint}`, {
          headers: {
            'User-Agent': 'ESPN-MCP-Server/2.0',
            'Accept': 'application/json',
          },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`ESPN API error: ${response.status} ${response.statusText}`);
        }

        return await response.json();
      } catch (error) {
        clearTimeout(timeoutId);
        if (error instanceof Error && error.name === 'AbortError') {
          throw new Error('ESPN API request timeout');
        }
        throw error instanceof Error ? error : new Error(String(error));
      }
    });
  }

  async getScoreboard(sport: string, league?: string): Promise<any> {
    const leagueParam = league ? `/${league}` : '';
    return this.fetchData(`/${sport}${leagueParam}/scoreboard`);
  }

  async getTeams(sport: string, league?: string): Promise<any> {
    const leagueParam = league ? `/${league}` : '';
    return this.fetchData(`/${sport}${leagueParam}/teams`);
  }

  async getStandings(sport: string, league?: string): Promise<any> {
    const leagueParam = league ? `/${league}` : '';
    return this.fetchData(`/${sport}${leagueParam}/standings`);
  }

  async getNews(sport?: string): Promise<any> {
    const sportParam = sport ? `/${sport}` : '';
    return this.fetchData(`${sportParam}/news`);
  }

  async getAthletes(sport: string, league?: string): Promise<any> {
    const leagueParam = league ? `/${league}` : '';
    return this.fetchData(`/${sport}${leagueParam}/athletes`);
  }

  destroy() {
    this.cache.destroy();
  }
}

// Tools definitions
const tools: Tool[] = [
  {
    name: "get_live_scores",
    description: "Get live scores and game information for any sport and league",
    inputSchema: {
      type: "object",
      properties: {
        sport: {
          type: "string",
          enum: ["football", "basketball", "baseball", "hockey", "soccer", "tennis", "golf"],
          description: "The sport to get scores for"
        },
        league: {
          type: "string",
          description: "Specific league (optional)",
          enum: ["nfl", "college-football", "nba", "mens-college-basketball", "womens-college-basketball", 
                 "mlb", "nhl", "mls", "premier-league", "champions-league"]
        }
      },
      required: ["sport"]
    }
  },
  {
    name: "get_team_information",
    description: "Get comprehensive team information including roster and statistics",
    inputSchema: {
      type: "object",
      properties: {
        sport: {
          type: "string",
          enum: ["football", "basketball", "baseball", "hockey", "soccer"],
          description: "The sport"
        },
        league: {
          type: "string",
          description: "Specific league (optional)"
        }
      },
      required: ["sport"]
    }
  },
  {
    name: "get_league_standings",
    description: "Get current standings and playoff information for any league",
    inputSchema: {
      type: "object",
      properties: {
        sport: {
          type: "string",
          enum: ["football", "basketball", "baseball", "hockey", "soccer"],
          description: "The sport"
        },
        league: {
          type: "string",
          description: "Specific league (optional)"
        }
      },
      required: ["sport"]
    }
  },
  {
    name: "get_sports_news",
    description: "Get latest sports news and breaking stories",
    inputSchema: {
      type: "object",
      properties: {
        sport: {
          type: "string",
          description: "Specific sport for news (optional, defaults to general sports)"
        },
        limit: {
          type: "number",
          minimum: 1,
          maximum: 50,
          default: 10,
          description: "Number of articles to return"
        }
      }
    }
  },
  {
    name: "search_athletes",
    description: "Search for athlete information and career statistics",
    inputSchema: {
      type: "object",
      properties: {
        sport: {
          type: "string",
          enum: ["football", "basketball", "baseball", "hockey", "soccer", "tennis", "golf"],
          description: "The sport"
        },
        league: {
          type: "string",
          description: "Specific league (optional)"
        }
      },
      required: ["sport"]
    }
  }
];

// Resources definitions
const resources: Resource[] = [
  {
    uri: "espn://live-dashboard",
    name: "Live Sports Dashboard",
    description: "Real-time sports scores and updates across all major leagues",
    mimeType: "application/json"
  },
  {
    uri: "espn://breaking-news",
    name: "Breaking Sports News",
    description: "Latest breaking news stories from the sports world",
    mimeType: "application/json"
  },
  {
    uri: "espn://trending-athletes",
    name: "Trending Athletes",
    description: "Currently trending athletes and their recent performances",
    mimeType: "application/json"
  },
  {
    uri: "espn://playoff-picture",
    name: "Playoff Picture",
    description: "Current playoff standings and scenarios across all leagues",
    mimeType: "application/json"
  }
];

// Prompts definitions
const prompts: Prompt[] = [
  {
    name: "analyze_game_performance",
    description: "Analyze team or player performance in a specific game with detailed insights",
    arguments: [
      {
        name: "sport",
        description: "The sport (e.g., football, basketball, baseball)",
        required: true
      },
      {
        name: "team_or_player",
        description: "Team name or player name to analyze",
        required: true
      },
      {
        name: "game_context",
        description: "Specific game or recent games context",
        required: false
      }
    ]
  },
  {
    name: "compare_head_to_head",
    description: "Generate head-to-head comparison between two teams or players",
    arguments: [
      {
        name: "sport",
        description: "The sport for comparison",
        required: true
      },
      {
        name: "entity1",
        description: "First team or player name",
        required: true
      },
      {
        name: "entity2",
        description: "Second team or player name",
        required: true
      },
      {
        name: "comparison_type",
        description: "Type of comparison (season, career, recent)",
        required: false
      }
    ]
  },
  {
    name: "predict_season_outcomes",
    description: "Generate predictions and analysis for season outcomes and playoffs",
    arguments: [
      {
        name: "sport",
        description: "The sport to analyze",
        required: true
      },
      {
        name: "league",
        description: "Specific league",
        required: true
      },
      {
        name: "prediction_scope",
        description: "Scope of prediction (playoffs, championship, awards)",
        required: false
      }
    ]
  }
];

// Helper functions for HTTP endpoint handling
async function handleToolCall(params: any, espnClient: ESPNClient) {
  const { name, arguments: args } = params;

  try {
    switch (name) {
      case "get_live_scores": {
        const { sport, league } = args as any;
        const data = await espnClient.getScoreboard(sport, league);
        
        return {
          content: [
            {
              type: "text",
              text: `Live scores for ${sport}${league ? ` (${league})` : ''}:\n\n${JSON.stringify(data, null, 2)}`
            }
          ]
        };
      }

      case "get_team_information": {
        const { sport, league } = args as any;
        const data = await espnClient.getTeams(sport, league);
        
        return {
          content: [
            {
              type: "text",
              text: `Team information for ${sport}${league ? ` (${league})` : ''}:\n\n${JSON.stringify(data, null, 2)}`
            }
          ]
        };
      }

      case "get_league_standings": {
        const { sport, league } = args as any;
        const data = await espnClient.getStandings(sport, league);
        
        return {
          content: [
            {
              type: "text",
              text: `Standings for ${sport}${league ? ` (${league})` : ''}:\n\n${JSON.stringify(data, null, 2)}`
            }
          ]
        };
      }

      case "get_sports_news": {
        const { sport, limit = 10 } = args as any;
        const data = await espnClient.getNews(sport);
        
        return {
          content: [
            {
              type: "text",
              text: `Sports news${sport ? ` for ${sport}` : ''}:\n\n${JSON.stringify(data, null, 2)}`
            }
          ]
        };
      }

      case "search_athletes": {
        const { sport, league } = args as any;
        const data = await espnClient.getAthletes(sport, league);
        
        return {
          content: [
            {
              type: "text",
              text: `Athletes for ${sport}${league ? ` (${league})` : ''}:\n\n${JSON.stringify(data, null, 2)}`
            }
          ]
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Error executing ${name}: ${error instanceof Error ? error.message : String(error)}`
        }
      ],
      isError: true
    };
  }
}

async function handleResourceRead(params: any, espnClient: ESPNClient) {
  const { uri } = params;

  try {
    let contents: ResourceContents[];

    switch (uri) {
      case "espn://live-dashboard": {
        const [football, basketball, baseball] = await Promise.all([
          espnClient.getScoreboard("football", "nfl").catch(() => null),
          espnClient.getScoreboard("basketball", "nba").catch(() => null),
          espnClient.getScoreboard("baseball", "mlb").catch(() => null)
        ]);
        
        contents = [{
          uri,
          mimeType: "application/json",
          text: JSON.stringify({
            lastUpdated: new Date().toISOString(),
            football: football,
            basketball: basketball,
            baseball: baseball
          }, null, 2)
        }];
        break;
      }

      case "espn://breaking-news": {
        const news = await espnClient.getNews();
        contents = [{
          uri,
          mimeType: "application/json",
          text: JSON.stringify(news, null, 2)
        }];
        break;
      }

      case "espn://trending-athletes": {
        const [footballAthletes, basketballAthletes] = await Promise.all([
          espnClient.getAthletes("football", "nfl").catch(() => null),
          espnClient.getAthletes("basketball", "nba").catch(() => null)
        ]);
        
        contents = [{
          uri,
          mimeType: "application/json",
          text: JSON.stringify({
            football: footballAthletes,
            basketball: basketballAthletes
          }, null, 2)
        }];
        break;
      }

      case "espn://playoff-picture": {
        const [nflStandings, nbaStandings] = await Promise.all([
          espnClient.getStandings("football", "nfl").catch(() => null),
          espnClient.getStandings("basketball", "nba").catch(() => null)
        ]);
        
        contents = [{
          uri,
          mimeType: "application/json",
          text: JSON.stringify({
            nfl: nflStandings,
            nba: nbaStandings
          }, null, 2)
        }];
        break;
      }

      default:
        throw new Error(`Resource not found: ${uri}`);
    }

    return { contents };
  } catch (error) {
    throw new Error(`Failed to read resource ${uri}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function handlePromptGet(params: any, espnClient: ESPNClient) {
  const { name, arguments: args } = params;
  const prompt = prompts.find((p: Prompt) => p.name === name);
  
  if (!prompt) {
    throw new Error(`Prompt not found: ${name}`);
  }

  const messages: PromptMessage[] = [];

  try {
    switch (name) {
      case "analyze_game_performance": {
        const { sport, team_or_player, game_context } = args as any;
        
        messages.push({
          role: "user",
          content: {
            type: "text",
            text: `Analyze the performance of ${team_or_player} in ${sport}${game_context ? ` (${game_context})` : ''}.`
          } as TextContent
        });

        const scoreboardData = await espnClient.getScoreboard(sport);
        messages.push({
          role: "user",
          content: {
            type: "resource",
            resource: {
              uri: `espn://analysis/${sport}/${encodeURIComponent(team_or_player)}`,
              mimeType: "application/json",
              text: JSON.stringify(scoreboardData, null, 2)
            }
          }
        });
        break;
      }

      case "compare_head_to_head": {
        const { sport, entity1, entity2, comparison_type } = args as any;
        
        messages.push({
          role: "user",
          content: {
            type: "text",
            text: `Compare ${entity1} vs ${entity2} in ${sport}${comparison_type ? ` (${comparison_type} comparison)` : ''}.`
          } as TextContent
        });

        const teamsData = await espnClient.getTeams(sport);
        messages.push({
          role: "user",
          content: {
            type: "resource",
            resource: {
              uri: `espn://comparison/${sport}/${encodeURIComponent(entity1)}-vs-${encodeURIComponent(entity2)}`,
              mimeType: "application/json",
              text: JSON.stringify(teamsData, null, 2)
            }
          }
        });
        break;
      }

      case "predict_season_outcomes": {
        const { sport, league, prediction_scope } = args as any;
        
        messages.push({
          role: "user",
          content: {
            type: "text",
            text: `Predict season outcomes for ${league} ${sport}${prediction_scope ? ` focusing on ${prediction_scope}` : ''}.`
          } as TextContent
        });

        const standingsData = await espnClient.getStandings(sport, league);
        messages.push({
          role: "user",
          content: {
            type: "resource",
            resource: {
              uri: `espn://predictions/${sport}/${league}`,
              mimeType: "application/json",
              text: JSON.stringify(standingsData, null, 2)
            }
          }
        });
        break;
      }

      default:
        throw new Error(`Unknown prompt: ${name}`);
    }

    return {
      description: prompt.description,
      messages
    };
  } catch (error) {
    throw new Error(`Failed to generate prompt: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Smithery-compatible server function with HTTP transport support
 */
export default function createESPNMCPServer({ config }: { config?: Partial<Config> } = {}) {
  // Validate configuration using Zod schema with defaults
  const validatedConfig = configSchema.parse(config || {});
  
  // Create Express app for HTTP transport
  const app = express();
  const espnClient = new ESPNClient(validatedConfig.cacheTimeout);

  if (validatedConfig.debug) {
    console.log('ESPN MCP Server initialized with config:', validatedConfig);
  }

  // CORS and JSON parsing
  app.use(cors({
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
    credentials: true
  }));
  app.use(express.json({ limit: '10mb' }));

  // Main MCP endpoint with complete JSON-RPC handling
  app.post('/mcp', async (req, res) => {
    try {
      const request = req.body;
      
      // Validate JSON-RPC format
      if (!request.jsonrpc || request.jsonrpc !== "2.0" || !request.method) {
        return res.status(400).json({
          jsonrpc: "2.0",
          error: { code: -32600, message: "Invalid Request" },
          id: request.id || null
        });
      }

      let response;
      
      switch (request.method) {
        case 'initialize':
          response = {
            jsonrpc: "2.0",
            result: {
              protocolVersion: "2024-11-05",
              capabilities: {
                resources: { subscribe: true, listChanged: true },
                prompts: { listChanged: true },
                tools: { listChanged: true },
                logging: {},
                experimental: {
                  httpStreaming: validatedConfig.enableStreaming,
                  sessionManagement: true
                }
              },
              serverInfo: {
                name: "espn-mcp-server",
                version: "2.0.0"
              }
            },
            id: request.id
          };
          break;

        case 'tools/list':
          response = {
            jsonrpc: "2.0",
            result: { tools },
            id: request.id
          };
          break;

        case 'tools/call':
          try {
            const toolResult = await handleToolCall(request.params, espnClient);
            response = {
              jsonrpc: "2.0",
              result: toolResult,
              id: request.id
            };
          } catch (error) {
            response = {
              jsonrpc: "2.0",
              error: { 
                code: -32603, 
                message: error instanceof Error ? error.message : 'Tool execution failed' 
              },
              id: request.id
            };
          }
          break;

        case 'resources/list':
          response = {
            jsonrpc: "2.0",
            result: { resources },
            id: request.id
          };
          break;

        case 'resources/read':
          try {
            const resourceResult = await handleResourceRead(request.params, espnClient);
            response = {
              jsonrpc: "2.0",
              result: resourceResult,
              id: request.id
            };
          } catch (error) {
            response = {
              jsonrpc: "2.0",
              error: { 
                code: -32603, 
                message: error instanceof Error ? error.message : 'Resource read failed' 
              },
              id: request.id
            };
          }
          break;

        case 'prompts/list':
          response = {
            jsonrpc: "2.0",
            result: { prompts },
            id: request.id
          };
          break;

        case 'prompts/get':
          try {
            const promptResult = await handlePromptGet(request.params, espnClient);
            response = {
              jsonrpc: "2.0",
              result: promptResult,
              id: request.id
            };
          } catch (error) {
            response = {
              jsonrpc: "2.0",
              error: { 
                code: -32603, 
                message: error instanceof Error ? error.message : 'Prompt generation failed' 
              },
              id: request.id
            };
          }
          break;

        default:
          response = {
            jsonrpc: "2.0",
            error: { code: -32601, message: `Method not found: ${request.method}` },
            id: request.id
          };
      }

      res.json(response);
    } catch (error) {
      console.error('MCP endpoint error:', error);
      res.status(500).json({
        jsonrpc: "2.0",
        error: {
          code: -32603,
          message: error instanceof Error ? error.message : 'Internal server error'
        },
        id: req.body?.id || null
      });
    }
  });

  // SSE endpoint for streaming (if enabled)
  if (validatedConfig.enableStreaming) {
    app.get('/mcp', (req, res) => {
      const acceptHeader = req.get('Accept') || '';
      
      if (acceptHeader.includes('text/event-stream')) {
        res.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'Access-Control-Allow-Origin': req.get('Origin') || '*',
          'Access-Control-Allow-Credentials': 'true'
        });

        res.write(`data: ${JSON.stringify({ type: 'connected', timestamp: new Date().toISOString() })}\n\n`);

        const heartbeat = setInterval(() => {
          res.write(': heartbeat\n\n');
        }, 30000);

        req.on('close', () => {
          clearInterval(heartbeat);
        });
      } else {
        res.status(405).json({ error: 'Method not allowed. Use POST for JSON-RPC or Accept: text/event-stream for SSE.' });
      }
    });
  }

  // Health endpoint
  app.get('/health', (req, res) => {
    res.json({
      status: 'healthy',
      version: '2.0.0',
      timestamp: new Date().toISOString(),
      capabilities: {
        resources: { subscribe: true, listChanged: true },
        prompts: { listChanged: true },
        tools: { listChanged: true },
        streaming: validatedConfig.enableStreaming,
        sessionManagement: true
      }
    });
  });

  // Start server on the PORT environment variable (required by Smithery)
  const port = parseInt(process.env.PORT || '3000', 10);
  
  const httpServer = app.listen(port, '0.0.0.0', () => {
    console.error(`ESPN MCP Server running on port ${port}`);
    console.error('Smithery-compatible HTTP transport ready');
  });

  // Graceful shutdown
  const shutdown = () => {
    console.error('Shutting down gracefully...');
    espnClient.destroy();
    httpServer.close(() => process.exit(0));
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);

  return app;
}

// Legacy STDIO server function for backwards compatibility
export function createStdioServer({ config }: { config?: Partial<Config> } = {}) {
  // Validate configuration using Zod schema with defaults
  const validatedConfig = configSchema.parse(config || {});
  
  const server = new Server(
    {
      name: "espn-mcp-server",
      version: "2.0.0",
    },
    {
      capabilities: {
        resources: {
          subscribe: true,
          listChanged: true
        },
        prompts: {
          listChanged: true
        },
        tools: {
          listChanged: true
        },
        logging: {},
        experimental: {
          httpStreaming: validatedConfig.enableStreaming,
          sessionManagement: true,
          resourceTemplates: true
        }
      },
    }
  );

  const espnClient = new ESPNClient(validatedConfig.cacheTimeout);

  if (validatedConfig.debug) {
    console.log('ESPN MCP Server initialized with config:', validatedConfig);
  }

  // Tool handlers
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return { tools };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    return await handleToolCall(request.params, espnClient);
  });

  // Resource handlers
  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    return { resources };
  });

  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    return await handleResourceRead(request.params, espnClient);
  });

  // Prompt handlers
  server.setRequestHandler(ListPromptsRequestSchema, async () => {
    return { prompts };
  });

  server.setRequestHandler(GetPromptRequestSchema, async (request) => {
    return await handlePromptGet(request.params, espnClient);
  });

  // Cleanup on server close
  const originalClose = server.close.bind(server);
  server.close = async () => {
    espnClient.destroy();
    return originalClose();
  };

  return server;
}

// Auto-start for Smithery deployment
if (process.env.NODE_ENV === 'production' || process.env.SMITHERY_RUNTIME) {
  createESPNMCPServer();
}
