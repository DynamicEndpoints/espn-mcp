/**
 * Modern ESPN MCP Server with Latest 2025 Features
 * Supports: Resources, Prompts, Tools, HTTP Streaming, Session Management
 */
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { CallToolRequestSchema, ListResourcesRequestSchema, ReadResourceRequestSchema, ListPromptsRequestSchema, GetPromptRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import express from "express";
import cors from "cors";
import { EventEmitter } from "events";
import { z } from "zod";
// Configuration schema for HTTP deployment
export const configSchema = z.object({
    cacheTimeout: z.number().optional().default(300000).describe("Cache timeout in milliseconds"),
    maxConcurrentRequests: z.number().optional().default(5).describe("Maximum number of concurrent ESPN API requests"),
    enableStreaming: z.boolean().optional().default(true).describe("Enable Server-Side Events for real-time updates"),
    debug: z.boolean().optional().default(false).describe("Enable debug logging"),
});
// Parse configuration from query parameters (for HTTP deployment)
function parseConfig(req) {
    const configParam = req.query.config;
    if (configParam) {
        try {
            return JSON.parse(Buffer.from(configParam, 'base64').toString());
        }
        catch (e) {
            console.warn('Failed to parse config parameter:', e);
            return {};
        }
    }
    return {};
}
// Modern cache implementation
class ModernCache extends EventEmitter {
    constructor(defaultTtl = 300000) {
        super();
        this.defaultTtl = defaultTtl;
        this.cache = new Map();
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
    constructor(cacheTimeout = 300000) {
        this.baseUrl = "https://site.api.espn.com/apis/site/v2/sports";
        this.cache = new ModernCache(cacheTimeout);
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
// Tools with modern schemas (defined globally for HTTP handlers)
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
// Dynamic resources (defined globally for HTTP handlers)
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
// Interactive prompts (defined globally for HTTP handlers)
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
export function createModernESPNServer(config = {}) {
    const finalConfig = configSchema.parse(config);
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
                httpStreaming: finalConfig.enableStreaming,
                sessionManagement: true,
                resourceTemplates: true
            }
        },
    });
    const espnClient = new ModernESPNClient(finalConfig.cacheTimeout);
    const resourceSubscriptions = new Map();
    if (finalConfig.debug) {
        console.log('ESPN MCP Server initialized with config:', finalConfig);
    }
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
// Global references for HTTP handlers
let globalTools = [];
let globalResources = [];
let globalPrompts = [];
// Helper functions for HTTP endpoint handling
async function handleToolCall(params) {
    const { name, arguments: args } = params;
    try {
        switch (name) {
            case "get_live_scores": {
                const { sport, league } = args;
                const espnClient = new ModernESPNClient();
                const data = await espnClient.getScoreboard(sport, league);
                espnClient.destroy();
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
                const espnClient = new ModernESPNClient();
                const data = await espnClient.getTeams(sport, league);
                espnClient.destroy();
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
                const espnClient = new ModernESPNClient();
                const data = await espnClient.getStandings(sport, league);
                espnClient.destroy();
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
                const espnClient = new ModernESPNClient();
                const data = await espnClient.getNews(sport);
                espnClient.destroy();
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
                const espnClient = new ModernESPNClient();
                const data = await espnClient.getAthletes(sport, league);
                espnClient.destroy();
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
}
async function handleResourceRead(params) {
    const { uri } = params;
    const espnClient = new ModernESPNClient();
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
    finally {
        espnClient.destroy();
    }
}
async function handlePromptGet(params) {
    const { name, arguments: args } = params;
    const prompt = globalPrompts.find((p) => p.name === name);
    if (!prompt) {
        throw new Error(`Prompt not found: ${name}`);
    }
    const espnClient = new ModernESPNClient();
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
    }
    finally {
        espnClient.destroy();
    }
}
// HTTP Server with proper MCP StreamableHTTPServerTransport
export function createHTTPServer() {
    const app = express();
    const PORT = process.env.PORT || 8081;
    // CORS configuration for deployment
    app.use(cors({
        origin: '*', // Configure appropriately for production
        exposedHeaders: ['Mcp-Session-Id', 'mcp-protocol-version'],
        allowedHeaders: ['Content-Type', 'mcp-session-id'],
    }));
    app.use(express.json());
    // Main MCP endpoint using StreamableHTTPServerTransport
    app.all('/mcp', async (req, res) => {
        try {
            // Parse configuration from query parameters
            const rawConfig = parseConfig(req);
            const config = configSchema.parse({
                cacheTimeout: rawConfig.cacheTimeout || Number(process.env.CACHE_TIMEOUT) || 300000,
                maxConcurrentRequests: rawConfig.maxConcurrentRequests || Number(process.env.MAX_CONCURRENT_REQUESTS) || 5,
                enableStreaming: rawConfig.enableStreaming !== undefined ? rawConfig.enableStreaming : (process.env.ENABLE_STREAMING !== 'false'),
                debug: rawConfig.debug !== undefined ? rawConfig.debug : (process.env.DEBUG === 'true'),
            });
            const server = createModernESPNServer(config);
            const transport = new StreamableHTTPServerTransport({
                sessionIdGenerator: undefined,
            });
            // Clean up on request close
            res.on('close', () => {
                transport.close();
                server.close();
            });
            await server.connect(transport);
            await transport.handleRequest(req, res, req.body);
        }
        catch (error) {
            console.error('Error handling MCP request:', error);
            if (!res.headersSent) {
                res.status(500).json({
                    jsonrpc: '2.0',
                    error: { code: -32603, message: 'Internal server error' },
                    id: null,
                });
            }
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
export async function runHTTPServer(port) {
    try {
        const app = createHTTPServer();
        const serverPort = port || Number(process.env.PORT) || 8081;
        const httpServer = app.listen(serverPort, () => {
            console.error(`Modern ESPN MCP Server (v2.0) running on port ${serverPort}`);
            console.error('Features: Resources, Prompts, Tools, HTTP Streaming, Session Management');
        });
        httpServer.on('error', (error) => {
            console.error('HTTP Server error:', error);
            process.exit(1);
        });
        process.on('SIGTERM', () => {
            console.error('Shutting down gracefully...');
            httpServer.close(() => process.exit(0));
        });
        process.on('SIGINT', () => {
            console.error('Shutting down gracefully...');
            httpServer.close(() => process.exit(0));
        });
        return httpServer;
    }
    catch (error) {
        console.error('Failed to start HTTP server:', error);
        process.exit(1);
    }
}
// Auto-detect transport (compatible with both ESM and CommonJS)
let isMainModule = false;
try {
    // Check if running as ESM module
    if (typeof import.meta !== 'undefined' && import.meta.url) {
        isMainModule = import.meta.url === `file://${process.argv[1]}` ||
            import.meta.url.endsWith('/modern-server.js') ||
            import.meta.url.endsWith('\\modern-server.js');
    }
}
catch (e) {
    // Fallback for CommonJS environments
    try {
        // @ts-ignore - CommonJS check
        isMainModule = require.main === module;
    }
    catch (e2) {
        // Final fallback - check if this file is being executed directly
        isMainModule = !!(process.argv[1] && process.argv[1].includes('modern-server'));
    }
}
if (isMainModule) {
    const transport = process.env.TRANSPORT || 'stdio';
    const args = process.argv.slice(2);
    if (transport === 'http' || args.includes('--http')) {
        const portIndex = args.indexOf('--port');
        const port = portIndex !== -1 ? parseInt(args[portIndex + 1]) : undefined;
        console.error('Starting HTTP server...');
        runHTTPServer(port).catch((error) => {
            console.error('HTTP server startup error:', error);
            process.exit(1);
        });
    }
    else {
        console.error('Starting STDIO server...');
        runSTDIOServer().catch((error) => {
            console.error('STDIO server startup error:', error);
            process.exit(1);
        });
    }
}
