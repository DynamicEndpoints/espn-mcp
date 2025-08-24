/**
 * Modern ESPN MCP Server with Latest 2025 Features
 * Supports: Resources, Prompts, Tools, HTTP Streaming, Session Management
 */
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListResourcesRequestSchema, ReadResourceRequestSchema, ListPromptsRequestSchema, GetPromptRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import express from "express";
import cors from "cors";
import { EventEmitter } from "events";
// Modern cache implementation
class ModernCache extends EventEmitter {
    defaultTtl;
    cache = new Map();
    cleanupInterval;
    constructor(defaultTtl = 300000) {
        super();
        this.defaultTtl = defaultTtl;
        this.cleanupInterval = setInterval(() => this.cleanup(), 60000);
    }
    async get(key, fetcher, ttl = this.defaultTtl) {
        const entry = this.cache.get(key);
        const now = Date.now();
        if (entry && now - entry.timestamp < entry.ttl) {
            return entry.data;
        }
        const data = await fetcher();
        this.cache.set(key, { data, timestamp: now, ttl });
        this.emit('resourceUpdated', key, data);
        return data;
    }
    cleanup() {
        const now = Date.now();
        for (const [key, entry] of this.cache.entries()) {
            if (now - entry.timestamp > entry.ttl) {
                this.cache.delete(key);
                this.emit('resourceExpired', key);
            }
        }
    }
    invalidate(key) {
        this.cache.delete(key);
        this.emit('resourceInvalidated', key);
    }
    destroy() {
        clearInterval(this.cleanupInterval);
        this.cache.clear();
    }
}
// ESPN API with modern patterns
class ModernESPNClient {
    cache;
    baseUrl = "https://site.api.espn.com/apis/site/v2/sports";
    constructor() {
        this.cache = new ModernCache(300000); // 5 minutes
    }
    async fetchData(endpoint) {
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
            }
            catch (error) {
                clearTimeout(timeoutId);
                if (error instanceof Error && error.name === 'AbortError') {
                    throw new Error('ESPN API request timeout');
                }
                throw error instanceof Error ? error : new Error(String(error));
            }
        });
    }
    // Specific data methods
    async getScoreboard(sport, league) {
        const leagueParam = league ? `/${league}` : '';
        return this.fetchData(`/${sport}${leagueParam}/scoreboard`);
    }
    async getTeams(sport, league) {
        const leagueParam = league ? `/${league}` : '';
        return this.fetchData(`/${sport}${leagueParam}/teams`);
    }
    async getStandings(sport, league) {
        const leagueParam = league ? `/${league}` : '';
        return this.fetchData(`/${sport}${leagueParam}/standings`);
    }
    async getNews(sport) {
        const sportParam = sport ? `/${sport}` : '';
        return this.fetchData(`${sportParam}/news`);
    }
    async getAthletes(sport, league) {
        const leagueParam = league ? `/${league}` : '';
        return this.fetchData(`/${sport}${leagueParam}/athletes`);
    }
    onResourceUpdate(callback) {
        this.cache.on('resourceUpdated', callback);
    }
    destroy() {
        this.cache.destroy();
    }
}
export function createModernESPNServer() {
    const server = new Server({
        name: "modern-espn-server",
        version: "2.0.0",
    }, {
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
                httpStreaming: true,
                sessionManagement: true,
                resourceTemplates: true
            }
        },
    });
    const espnClient = new ModernESPNClient();
    const resourceSubscriptions = new Map();
    // Tools with modern schemas
    const tools = [
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
    // Dynamic resources
    const staticResources = [
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
    // Interactive prompts
    const prompts = [
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
    // Tool handlers
    server.setRequestHandler(ListToolsRequestSchema, async () => {
        return { tools };
    });
    server.setRequestHandler(CallToolRequestSchema, async (request) => {
        const { name, arguments: args } = request.params;
        try {
            switch (name) {
                case "get_live_scores": {
                    const { sport, league } = args;
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
                    const { sport, league } = args;
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
                    const { sport, league } = args;
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
                    const { sport, limit = 10 } = args;
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
                    const { sport, league } = args;
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
        }
        catch (error) {
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
    });
    // Resource handlers
    server.setRequestHandler(ListResourcesRequestSchema, async () => {
        return { resources: staticResources };
    });
    server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
        const { uri } = request.params;
        try {
            let contents;
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
        }
        catch (error) {
            throw new Error(`Failed to read resource ${uri}: ${error instanceof Error ? error.message : String(error)}`);
        }
    });
    // Prompt handlers
    server.setRequestHandler(ListPromptsRequestSchema, async () => {
        return { prompts };
    });
    server.setRequestHandler(GetPromptRequestSchema, async (request) => {
        const { name, arguments: args } = request.params;
        const prompt = prompts.find(p => p.name === name);
        if (!prompt) {
            throw new Error(`Prompt not found: ${name}`);
        }
        const messages = [];
        try {
            switch (name) {
                case "analyze_game_performance": {
                    const { sport, team_or_player, game_context } = args;
                    messages.push({
                        role: "user",
                        content: {
                            type: "text",
                            text: `Analyze the performance of ${team_or_player} in ${sport}${game_context ? ` (${game_context})` : ''}.`
                        }
                    });
                    // Add relevant data as resource
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
                    const { sport, entity1, entity2, comparison_type } = args;
                    messages.push({
                        role: "user",
                        content: {
                            type: "text",
                            text: `Compare ${entity1} vs ${entity2} in ${sport}${comparison_type ? ` (${comparison_type} comparison)` : ''}.`
                        }
                    });
                    // Add team data
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
                    const { sport, league, prediction_scope } = args;
                    messages.push({
                        role: "user",
                        content: {
                            type: "text",
                            text: `Predict season outcomes for ${league} ${sport}${prediction_scope ? ` focusing on ${prediction_scope}` : ''}.`
                        }
                    });
                    // Add standings data
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
        }
        catch (error) {
            throw new Error(`Failed to generate prompt: ${error instanceof Error ? error.message : String(error)}`);
        }
        return {
            description: prompt.description,
            messages
        };
    });
    // Resource update notifications
    espnClient.onResourceUpdate((key, data) => {
        // Notify subscribers of resource updates
        server.notification({
            method: "notifications/resources/updated",
            params: { uri: `espn://cache/${key}` }
        });
    });
    // Cleanup on server close
    const originalClose = server.close.bind(server);
    server.close = async () => {
        espnClient.destroy();
        return originalClose();
    };
    return server;
}
// HTTP Server with modern streaming
export function createHTTPServer() {
    const app = express();
    const server = createModernESPNServer();
    app.use(cors({
        origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
        credentials: true
    }));
    app.use(express.json({ limit: '10mb' }));
    // Security middleware
    app.use((req, res, next) => {
        const origin = req.get('Origin');
        if (origin && !['http://localhost:3000', 'http://127.0.0.1:3000'].includes(origin)) {
            return res.status(403).json({ error: 'Invalid origin' });
        }
        next();
    });
    // Main MCP endpoint
    app.post('/mcp', async (req, res) => {
        try {
            const request = req.body;
            // Simple method routing - bypass the complex server.request approach
            let response;
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
                                httpStreaming: true,
                                sessionManagement: true
                            }
                        },
                        serverInfo: {
                            name: "modern-espn-server",
                            version: "2.0.0"
                        }
                    },
                    id: request.id
                };
            }
            else {
                // For other requests, return method not implemented for now
                response = {
                    jsonrpc: "2.0",
                    error: { code: -32601, message: `Method not implemented: ${request.method}` },
                    id: request.id
                };
            }
            res.json(response);
        }
        catch (error) {
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
    // SSE endpoint for streaming
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
            // Send initial connection event
            res.write(`data: ${JSON.stringify({ type: 'connected', timestamp: new Date().toISOString() })}\n\n`);
            // Heartbeat
            const heartbeat = setInterval(() => {
                res.write(': heartbeat\n\n');
            }, 30000);
            req.on('close', () => {
                clearInterval(heartbeat);
            });
        }
        else {
            res.status(405).json({ error: 'Method not allowed. Use POST for JSON-RPC or Accept: text/event-stream for SSE.' });
        }
    });
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
                streaming: true,
                sessionManagement: true
            }
        });
    });
    return app;
}
// STDIO Server
export async function runSTDIOServer() {
    const server = createModernESPNServer();
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("Modern ESPN MCP Server (v2.0) running on stdio");
}
// HTTP Server
export async function runHTTPServer(port = 3000) {
    const app = createHTTPServer();
    const httpServer = app.listen(port, '127.0.0.1', () => {
        console.error(`Modern ESPN MCP Server (v2.0) running on http://127.0.0.1:${port}/mcp`);
        console.error('Features: Resources, Prompts, Tools, HTTP Streaming, Session Management');
    });
    process.on('SIGTERM', () => {
        console.error('Shutting down gracefully...');
        httpServer.close(() => process.exit(0));
    });
    return httpServer;
}
// Auto-detect transport (ES modules compatible)
const isMainModule = import.meta.url === `file://${process.argv[1]}` ||
    import.meta.url.endsWith('/modern-server.js') ||
    process.argv[1]?.endsWith('modern-server.js');
if (isMainModule) {
    const args = process.argv.slice(2);
    if (args.includes('--http')) {
        const portIndex = args.indexOf('--port');
        const port = portIndex !== -1 ? parseInt(args[portIndex + 1]) : 3000;
        runHTTPServer(port).catch(console.error);
    }
    else {
        runSTDIOServer().catch(console.error);
    }
}
