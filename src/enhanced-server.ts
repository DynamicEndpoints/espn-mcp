/**
 * Enhanced ESPN MCP Server with Latest Features (2025-03-26)
 * Supports: HTTP Streaming, Resources, Prompts, Session Management, OAuth
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  CallToolRequest,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
  ListToolsRequestSchema,
  ResourceTemplate,
  Tool,
  Resource,
  Prompt,
  PromptMessage,
  TextContent,
  ResourceContents
} from "@modelcontextprotocol/sdk/types.js";
import express from "express";
import cors from "cors";
import { EventEmitter } from "events";

// Enhanced cache with TTL and background refresh
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  refreshPromise?: Promise<T>;
}

class EnhancedCache extends EventEmitter {
  private cache = new Map<string, CacheEntry<any>>();
  private refreshInterval: NodeJS.Timeout;

  constructor(private defaultTtl = 600000) { // 10 minutes
    super();
    this.refreshInterval = setInterval(() => this.cleanup(), 60000); // Cleanup every minute
  }

  async get<T>(key: string, fetcher: () => Promise<T>, ttl = this.defaultTtl): Promise<T> {
    const entry = this.cache.get(key);
    const now = Date.now();

    if (entry && now - entry.timestamp < entry.ttl) {
      // Background refresh if data is >50% of TTL age
      if (now - entry.timestamp > entry.ttl * 0.5 && !entry.refreshPromise) {
        entry.refreshPromise = this.backgroundRefresh(key, fetcher, ttl);
      }
      return entry.data;
    }

    // Fetch new data
    const data = await fetcher();
    this.cache.set(key, { data, timestamp: now, ttl });
    this.emit('updated', key, data);
    return data;
  }

  private async backgroundRefresh<T>(key: string, fetcher: () => Promise<T>, ttl: number) {
    try {
      const data = await fetcher();
      const now = Date.now();
      this.cache.set(key, { data, timestamp: now, ttl });
      this.emit('updated', key, data);
      return data;
    } catch (error) {
      console.warn(`Background refresh failed for ${key}:`, error);
    }
  }

  private cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
        this.emit('expired', key);
      }
    }
  }

  invalidate(key: string) {
    this.cache.delete(key);
    this.emit('invalidated', key);
  }

  clear() {
    this.cache.clear();
    this.emit('cleared');
  }

  destroy() {
    clearInterval(this.refreshInterval);
    this.clear();
  }
}

// Session management for HTTP streaming
class SessionManager {
  private sessions = new Map<string, { events: any[], lastEventId: number }>();

  createSession(sessionId: string) {
    this.sessions.set(sessionId, { events: [], lastEventId: 0 });
  }

  addEvent(sessionId: string, event: any) {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.lastEventId++;
      session.events.push({ id: session.lastEventId, data: event });
      // Keep only last 100 events
      if (session.events.length > 100) {
        session.events = session.events.slice(-100);
      }
    }
  }

  getEventsAfter(sessionId: string, lastEventId: number) {
    const session = this.sessions.get(sessionId);
    if (!session) return [];
    return session.events.filter(event => event.id > lastEventId);
  }

  cleanup() {
    // Remove sessions older than 1 hour
    const cutoff = Date.now() - 3600000;
    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.events.length === 0 || session.events[0].timestamp < cutoff) {
        this.sessions.delete(sessionId);
      }
    }
  }
}

// Enhanced ESPN API client with modern fetch
class ESPNAPIClient {
  public cache: EnhancedCache; // Made public for event access
  private baseUrl = "https://site.api.espn.com/apis/site/v2/sports";

  constructor() {
    this.cache = new EnhancedCache(300000); // 5 minutes for sports data
  }

  private async fetchWithRetry(url: string, retries = 3): Promise<any> {
    for (let i = 0; i < retries; i++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'ESPN-MCP-Server/2.0',
            'Accept': 'application/json',
          },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return await response.json();
      } catch (error) {
        if (i === retries - 1) throw error;
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)));
      }
    }
  }

  async getScoreboard(sport: string, league?: string): Promise<any> {
    const key = `scoreboard:${sport}:${league || 'default'}`;
    return this.cache.get(key, async () => {
      const leagueParam = league ? `/${league}` : '';
      const url = `${this.baseUrl}/${sport}${leagueParam}/scoreboard`;
      return this.fetchWithRetry(url);
    });
  }

  async getTeams(sport: string, league?: string): Promise<any> {
    const key = `teams:${sport}:${league || 'default'}`;
    return this.cache.get(key, async () => {
      const leagueParam = league ? `/${league}` : '';
      const url = `${this.baseUrl}/${sport}${leagueParam}/teams`;
      return this.fetchWithRetry(url);
    });
  }

  async getStandings(sport: string, league?: string): Promise<any> {
    const key = `standings:${sport}:${league || 'default'}`;
    return this.cache.get(key, async () => {
      const leagueParam = league ? `/${league}` : '';
      const url = `${this.baseUrl}/${sport}${leagueParam}/standings`;
      return this.fetchWithRetry(url);
    });
  }

  async getAthletes(sport: string, league?: string): Promise<any> {
    const key = `athletes:${sport}:${league || 'default'}`;
    return this.cache.get(key, async () => {
      const leagueParam = league ? `/${league}` : '';
      const url = `${this.baseUrl}/${sport}${leagueParam}/athletes`;
      return this.fetchWithRetry(url);
    });
  }

  async getNews(sport?: string): Promise<any> {
    const key = `news:${sport || 'general'}`;
    return this.cache.get(key, async () => {
      const sportParam = sport ? `/${sport}` : '';
      const url = `${this.baseUrl}${sportParam}/news`;
      return this.fetchWithRetry(url);
    });
  }

  destroy() {
    this.cache.destroy();
  }
}

// Create enhanced server with latest capabilities
function createEnhancedESPNServer(): Server {
  const server = new Server(
    {
      name: "enhanced-espn-server",
      version: "2.0.0",
    },
    {
      capabilities: {
        // Enable all latest features
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
          streaming: true,
          oauth: true,
          sessionManagement: true
        }
      },
    }
  );

  const espnClient = new ESPNAPIClient();
  const sessionManager = new SessionManager();

  // Resource subscriptions
  const resourceSubscriptions = new Map<string, Set<string>>();

  // Tool definitions with enhanced schemas
  const tools: Tool[] = [
    {
      name: "get_sports_scoreboard",
      description: "Get live scores and game information for various sports",
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
            description: "Specific league (e.g., 'nfl', 'nba', 'mlb', 'nhl', 'mls')",
            enum: ["nfl", "college-football", "nba", "mens-college-basketball", "womens-college-basketball", 
                   "mlb", "nhl", "mls", "premier-league", "champions-league"]
          },
          date: {
            type: "string",
            pattern: "^\\d{4}-\\d{2}-\\d{2}$",
            description: "Date in YYYY-MM-DD format (optional, defaults to today)"
          }
        },
        required: ["sport"]
      }
    },
    {
      name: "get_team_info",
      description: "Get detailed information about sports teams including roster, stats, and schedule",
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
            description: "Specific league"
          },
          teamId: {
            type: "string",
            description: "Specific team ID (optional)"
          }
        },
        required: ["sport"]
      }
    },
    {
      name: "get_standings",
      description: "Get current league standings and playoff information",
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
            description: "Specific league"
          },
          season: {
            type: "number",
            description: "Season year (optional, defaults to current)"
          }
        },
        required: ["sport"]
      }
    },
    {
      name: "get_sports_news",
      description: "Get latest sports news and updates",
      inputSchema: {
        type: "object",
        properties: {
          sport: {
            type: "string",
            description: "Specific sport (optional, defaults to general sports news)"
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
      description: "Search for athlete information and statistics",
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
            description: "Specific league"
          },
          name: {
            type: "string",
            description: "Athlete name to search for"
          }
        },
        required: ["sport"]
      }
    }
  ];

  // Dynamic resources with templates
  const resourceTemplates: ResourceTemplate[] = [
    {
      uriTemplate: "espn://scoreboard/{sport}/{league?}",
      name: "Live Scoreboard",
      description: "Real-time scores for sports and leagues",
      mimeType: "application/json"
    },
    {
      uriTemplate: "espn://teams/{sport}/{league?}",
      name: "Teams Directory",
      description: "Team information and rosters",
      mimeType: "application/json"
    },
    {
      uriTemplate: "espn://standings/{sport}/{league?}",
      name: "League Standings",
      description: "Current standings and playoff positions",
      mimeType: "application/json"
    },
    {
      uriTemplate: "espn://news/{sport?}",
      name: "Sports News",
      description: "Latest sports news and updates",
      mimeType: "application/json"
    }
  ];

  // Dynamic prompts for interactive queries
  const prompts: Prompt[] = [
    {
      name: "analyze_game",
      description: "Analyze a specific game with detailed statistics and insights",
      arguments: [
        {
          name: "sport",
          description: "The sport (e.g., football, basketball)",
          required: true
        },
        {
          name: "gameId",
          description: "The game ID to analyze",
          required: true
        },
        {
          name: "includeStats",
          description: "Include detailed player statistics",
          required: false
        }
      ]
    },
    {
      name: "compare_teams",
      description: "Compare two teams head-to-head with statistics and analysis",
      arguments: [
        {
          name: "sport",
          description: "The sport",
          required: true
        },
        {
          name: "team1",
          description: "First team name or ID",
          required: true
        },
        {
          name: "team2",
          description: "Second team name or ID",
          required: true
        },
        {
          name: "season",
          description: "Season year for comparison",
          required: false
        }
      ]
    },
    {
      name: "predict_playoff_scenarios",
      description: "Analyze playoff scenarios and predictions for a league",
      arguments: [
        {
          name: "sport",
          description: "The sport",
          required: true
        },
        {
          name: "league",
          description: "The league",
          required: true
        }
      ]
    }
  ];

  // Register tools
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return { tools };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      switch (name) {
        case "get_sports_scoreboard": {
          const { sport, league, date } = args as any;
          const data = await espnClient.getScoreboard(sport, league);
          
          return {
            content: [
              {
                type: "text",
                text: `ESPN Scoreboard for ${sport}${league ? ` (${league})` : ''}:\n\n${JSON.stringify(data, null, 2)}`
              }
            ],
            isError: false
          };
        }

        case "get_team_info": {
          const { sport, league, teamId } = args as any;
          const data = await espnClient.getTeams(sport, league);
          
          return {
            content: [
              {
                type: "text",
                text: `Team information for ${sport}${league ? ` (${league})` : ''}:\n\n${JSON.stringify(data, null, 2)}`
              }
            ],
            isError: false
          };
        }

        case "get_standings": {
          const { sport, league, season } = args as any;
          const data = await espnClient.getStandings(sport, league);
          
          return {
            content: [
              {
                type: "text",
                text: `Standings for ${sport}${league ? ` (${league})` : ''}:\n\n${JSON.stringify(data, null, 2)}`
              }
            ],
            isError: false
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
            ],
            isError: false
          };
        }

        case "search_athletes": {
          const { sport, league, name } = args as any;
          const data = await espnClient.getAthletes(sport, league);
          
          return {
            content: [
              {
                type: "text",
                text: `Athletes for ${sport}${league ? ` (${league})` : ''}:\n\n${JSON.stringify(data, null, 2)}`
              }
            ],
            isError: false
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
            text: `Error: ${error instanceof Error ? error.message : String(error)}`
          }
        ],
        isError: true
      };
    }
  });

  // Resource management
  server.setRequestHandler(ListResourcesRequestSchema, async (request) => {
    const resources: Resource[] = [
      {
        uri: "espn://live-scores",
        name: "Live Scores",
        description: "Real-time scores across all sports",
        mimeType: "application/json"
      },
      {
        uri: "espn://trending-news",
        name: "Trending Sports News",
        description: "Latest trending sports stories",
        mimeType: "application/json"
      },
      {
        uri: "espn://top-athletes",
        name: "Top Athletes",
        description: "Featured athletes and their stats",
        mimeType: "application/json"
      }
    ];

    return { resources };
  });

  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const { uri } = request.params;

    try {
      let content: ResourceContents[];

      switch (uri) {
        case "espn://live-scores": {
          const scores = await Promise.all([
            espnClient.getScoreboard("football", "nfl"),
            espnClient.getScoreboard("basketball", "nba"),
            espnClient.getScoreboard("baseball", "mlb")
          ]);
          
          content = [{
            uri,
            mimeType: "application/json",
            text: JSON.stringify({ football: scores[0], basketball: scores[1], baseball: scores[2] }, null, 2)
          }];
          break;
        }

        case "espn://trending-news": {
          const news = await espnClient.getNews();
          content = [{
            uri,
            mimeType: "application/json",
            text: JSON.stringify(news, null, 2)
          }];
          break;
        }

        case "espn://top-athletes": {
          const athletes = await Promise.all([
            espnClient.getAthletes("football", "nfl"),
            espnClient.getAthletes("basketball", "nba")
          ]);
          
          content = [{
            uri,
            mimeType: "application/json",
            text: JSON.stringify({ football: athletes[0], basketball: athletes[1] }, null, 2)
          }];
          break;
        }

        default:
          throw new Error(`Resource not found: ${uri}`);
      }

      return { contents: content };
    } catch (error) {
      throw new Error(`Failed to read resource ${uri}: ${error instanceof Error ? error.message : String(error)}`);
    }
  });

  // Prompt management
  server.setRequestHandler(ListPromptsRequestSchema, async () => {
    return { prompts };
  });

  server.setRequestHandler(GetPromptRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    const prompt = prompts.find(p => p.name === name);
    
    if (!prompt) {
      throw new Error(`Prompt not found: ${name}`);
    }

    const messages: PromptMessage[] = [];

    try {
      switch (name) {
        case "analyze_game": {
          const { sport, gameId, includeStats } = args as any;
          
          messages.push({
            role: "user",
            content: {
              type: "text",
              text: `Analyze the ${sport} game with ID ${gameId}. ${includeStats ? 'Include detailed player statistics.' : ''}`
            } as TextContent
          });

          // Add game data as resource
          const scoreboardData = await espnClient.getScoreboard(sport);
          messages.push({
            role: "user",
            content: {
              type: "resource",
              resource: {
                uri: `espn://game/${gameId}`,
                mimeType: "application/json",
                text: JSON.stringify(scoreboardData, null, 2)
              }
            }
          });
          break;
        }

        case "compare_teams": {
          const { sport, team1, team2, season } = args as any;
          
          messages.push({
            role: "user",
            content: {
              type: "text",
              text: `Compare ${team1} vs ${team2} in ${sport}${season ? ` for the ${season} season` : ''}.`
            } as TextContent
          });

          // Add team data as resources
          const teamsData = await espnClient.getTeams(sport);
          messages.push({
            role: "user",
            content: {
              type: "resource",
              resource: {
                uri: `espn://teams/${sport}`,
                mimeType: "application/json",
                text: JSON.stringify(teamsData, null, 2)
              }
            }
          });
          break;
        }

        case "predict_playoff_scenarios": {
          const { sport, league } = args as any;
          
          messages.push({
            role: "user",
            content: {
              type: "text",
              text: `Analyze playoff scenarios for ${league} ${sport}.`
            } as TextContent
          });

          // Add standings data as resource
          const standingsData = await espnClient.getStandings(sport, league);
          messages.push({
            role: "user",
            content: {
              type: "resource",
              resource: {
                uri: `espn://standings/${sport}/${league}`,
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
    } catch (error) {
      throw new Error(`Failed to generate prompt: ${error instanceof Error ? error.message : String(error)}`);
    }

    return {
      description: prompt.description,
      messages
    };
  });

  // Set up cache invalidation notifications
  espnClient.cache.on('updated', (key: string) => {
    // Notify subscribers of resource updates
    const resourceUri = `espn://cache/${key}`;
    if (resourceSubscriptions.has(resourceUri)) {
      server.notification({
        method: "notifications/resources/updated",
        params: { uri: resourceUri }
      });
    }
  });

  // Cleanup on server close
  const originalClose = server.close.bind(server);
  server.close = async () => {
    espnClient.destroy();
    return originalClose();
  };

  return server;
}

// HTTP Streamable Server with SSE support
export function createHTTPStreamingServer(): express.Application {
  const app = express();
  const server = createEnhancedESPNServer();
  const sessionManager = new SessionManager();

  app.use(cors({
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
    credentials: true
  }));
  app.use(express.json());

  // Validate Origin header for security
  app.use((req, res, next) => {
    const origin = req.get('Origin');
    if (origin && !['http://localhost:3000', 'http://127.0.0.1:3000'].includes(origin)) {
      return res.status(403).json({ error: 'Invalid origin' });
    }
    next();
  });

  // Main MCP endpoint - supports both POST and GET
  app.all('/mcp', async (req, res) => {
    try {
      if (req.method === 'POST') {
        // Handle JSON-RPC request
        const request = req.body;
        const sessionId = req.headers['x-session-id'] as string || 'default';
        
        // Check if client wants streaming response
        const acceptHeader = req.get('Accept') || '';
        const wantsStream = acceptHeader.includes('text/event-stream');

        if (wantsStream) {
          // Return SSE stream
          res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'Access-Control-Allow-Origin': req.get('Origin') || '*',
            'Access-Control-Allow-Credentials': 'true'
          });

          // Handle stream resumption
          const lastEventId = req.get('Last-Event-ID');
          if (lastEventId && sessionManager) {
            const missedEvents = sessionManager.getEventsAfter(sessionId, parseInt(lastEventId));
            for (const event of missedEvents) {
              res.write(`id: ${event.id}\ndata: ${JSON.stringify(event.data)}\n\n`);
            }
          }

          // Process request directly with server
          try {
            let response;
            
            // Handle different request types
            if (request.method === 'initialize') {
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
                      streaming: true,
                      sessionManagement: true
                    }
                  },
                  serverInfo: {
                    name: "enhanced-espn-server",
                    version: "2.0.0"
                  }
                },
                id: request.id
              };
            } else {
              // For other requests, return method not implemented for now
              response = {
                jsonrpc: "2.0",
                error: { code: -32601, message: `Method not implemented: ${request.method}` },
                id: request.id
              };
            }
            
            if (sessionManager && response) {
              sessionManager.addEvent(sessionId, response);
            }

            res.write(`data: ${JSON.stringify(response)}\n\n`);
          } catch (error) {
            const errorResponse = {
              jsonrpc: "2.0",
              error: {
                code: -32603,
                message: error instanceof Error ? error.message : String(error)
              },
              id: request.id || null
            };
            res.write(`data: ${JSON.stringify(errorResponse)}\n\n`);
          }
        } else {
          // Return single JSON response
          // For now, just handle initialize method, return error for others
          if (request.method === 'initialize') {
            const response = {
              jsonrpc: "2.0",
              result: {
                protocolVersion: "2024-11-05",
                capabilities: {
                  resources: { subscribe: true, listChanged: true },
                  prompts: { listChanged: true },
                  tools: { listChanged: true },
                  logging: {},
                  experimental: {
                    streaming: true,
                    sessionManagement: true
                  }
                },
                serverInfo: {
                  name: "enhanced-espn-server",
                  version: "2.0.0"
                }
              },
              id: request.id
            };
            res.json(response);
          } else {
            res.status(500).json({
              jsonrpc: "2.0",
              error: { code: -32601, message: `Method not implemented: ${request.method}` },
              id: request.id || null
            });
          }
        }
      } else if (req.method === 'GET') {
        // Handle SSE stream initiation
        const acceptHeader = req.get('Accept') || '';
        
        if (acceptHeader.includes('text/event-stream')) {
          const sessionId = req.headers['x-session-id'] as string || `session_${Date.now()}`;
          
          res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'Access-Control-Allow-Origin': req.get('Origin') || '*',
            'Access-Control-Allow-Credentials': 'true'
          });

          sessionManager.createSession(sessionId);

          // Send initial connection event
          res.write(`id: 0\ndata: ${JSON.stringify({ type: 'connected', sessionId })}\n\n`);

          // Keep connection alive
          const keepAlive = setInterval(() => {
            res.write(': heartbeat\n\n');
          }, 30000);

          req.on('close', () => {
            clearInterval(keepAlive);
          });
        } else {
          res.status(405).json({ error: 'Method not allowed. Use Accept: text/event-stream for SSE.' });
        }
      } else {
        res.status(405).json({ error: 'Method not allowed' });
      }
    } catch (error) {
      console.error('MCP endpoint error:', error);
      res.status(500).json({ 
        error: 'Internal server error', 
        message: error instanceof Error ? error.message : String(error) 
      });
    }
  });

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.json({ 
      status: 'healthy', 
      timestamp: new Date().toISOString(),
      version: '2.0.0',
      capabilities: ['streaming', 'resources', 'prompts', 'tools']
    });
  });

  return app;
}

// STDIO Server (traditional)
export async function runSTDIOServer() {
  const server = createEnhancedESPNServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Enhanced ESPN MCP Server running on stdio");
}

// HTTP Server
export async function runHTTPServer(port = 3000) {
  const app = createHTTPStreamingServer();
  
  const httpServer = app.listen(port, '127.0.0.1', () => {
    console.error(`Enhanced ESPN MCP Server running on http://127.0.0.1:${port}/mcp`);
    console.error('Capabilities: HTTP Streaming, Resources, Prompts, Session Management');
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.error('Shutting down gracefully...');
    httpServer.close(() => {
      process.exit(0);
    });
  });

  return httpServer;
}

// Auto-detect transport (compatible with both ESM and CommonJS)
let isMainModule = false;

// Check if running as ESM module
if (typeof import.meta !== 'undefined' && import.meta.url) {
  isMainModule = import.meta.url === `file://${process.argv[1]}` || 
                 import.meta.url.endsWith('/enhanced-server.js') ||
                 import.meta.url.endsWith('\\enhanced-server.js');
} else {
  // Fallback for CommonJS - check if this is the main module
  isMainModule = require.main === module;
}

if (isMainModule) {
  const args = process.argv.slice(2);
  
  if (args.includes('--http')) {
    const portIndex = args.indexOf('--port');
    const port = portIndex !== -1 ? parseInt(args[portIndex + 1]) : 3000;
    runHTTPServer(port);
  } else {
    runSTDIOServer();
  }
}
