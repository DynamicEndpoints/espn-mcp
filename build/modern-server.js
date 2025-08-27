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
    // Football
    async getCollegeFootballNews() {
        return this.fetchData('/football/college-football/news');
    }
    async getCollegeFootballScores(params = {}) {
        let url = '/football/college-football/scoreboard';
        const q = [];
        if (params.calendar)
            q.push(`calendar=${params.calendar}`);
        if (params.dates)
            q.push(`dates=${params.dates}`);
        if (q.length)
            url += '?' + q.join('&');
        return this.fetchData(url);
    }
    async getCollegeFootballGameSummary(gameId) {
        return this.fetchData(`/football/college-football/summary?event=${gameId}`);
    }
    async getCollegeFootballTeam(team) {
        return this.fetchData(`/football/college-football/teams/${team}`);
    }
    async getCollegeFootballRankings() {
        return this.fetchData('/football/college-football/rankings');
    }
    async getNFLNews() {
        return this.fetchData('/football/nfl/news');
    }
    async getNFLScores(params = {}) {
        let url = '/football/nfl/scoreboard';
        const q = [];
        if (params.seasontype)
            q.push(`seasontype=${params.seasontype}`);
        if (params.week)
            q.push(`week=${params.week}`);
        if (params.dates)
            q.push(`dates=${params.dates}`);
        if (q.length)
            url += '?' + q.join('&');
        return this.fetchData(url);
    }
    async getNFLTeams() {
        return this.fetchData('/football/nfl/teams');
    }
    async getNFLTeam(team) {
        return this.fetchData(`/football/nfl/teams/${team}`);
    }
    // Baseball
    async getMLBScores() {
        return this.fetchData('/baseball/mlb/scoreboard');
    }
    async getMLBNews() {
        return this.fetchData('/baseball/mlb/news');
    }
    async getMLBTeams() {
        return this.fetchData('/baseball/mlb/teams');
    }
    async getMLBTeam(team) {
        return this.fetchData(`/baseball/mlb/teams/${team}`);
    }
    async getCollegeBaseballScores() {
        return this.fetchData('/baseball/college-baseball/scoreboard');
    }
    // Hockey
    async getNHLScores() {
        return this.fetchData('/hockey/nhl/scoreboard');
    }
    async getNHLNews() {
        return this.fetchData('/hockey/nhl/news');
    }
    async getNHLTeams() {
        return this.fetchData('/hockey/nhl/teams');
    }
    async getNHLTeam(team) {
        return this.fetchData(`/hockey/nhl/teams/${team}`);
    }
    // Basketball
    async getNBAScores() {
        return this.fetchData('/basketball/nba/scoreboard');
    }
    async getNBANews() {
        return this.fetchData('/basketball/nba/news');
    }
    async getNBATeams() {
        return this.fetchData('/basketball/nba/teams');
    }
    async getNBATeam(team) {
        return this.fetchData(`/basketball/nba/teams/${team}`);
    }
    async getWNBAScores() {
        return this.fetchData('/basketball/wnba/scoreboard');
    }
    async getWNBANews() {
        return this.fetchData('/basketball/wnba/news');
    }
    async getWNBATeams() {
        return this.fetchData('/basketball/wnba/teams');
    }
    async getWNBATeam(team) {
        return this.fetchData(`/basketball/wnba/teams/${team}`);
    }
    async getWomensCollegeBasketballScores() {
        return this.fetchData('/basketball/womens-college-basketball/scoreboard');
    }
    async getWomensCollegeBasketballNews() {
        return this.fetchData('/basketball/womens-college-basketball/news');
    }
    async getWomensCollegeBasketballTeams() {
        return this.fetchData('/basketball/womens-college-basketball/teams');
    }
    async getWomensCollegeBasketballTeam(team) {
        return this.fetchData(`/basketball/womens-college-basketball/teams/${team}`);
    }
    async getMensCollegeBasketballScores() {
        return this.fetchData('/basketball/mens-college-basketball/scoreboard');
    }
    async getMensCollegeBasketballNews() {
        return this.fetchData('/basketball/mens-college-basketball/news');
    }
    async getMensCollegeBasketballTeams() {
        return this.fetchData('/basketball/mens-college-basketball/teams');
    }
    async getMensCollegeBasketballTeam(team) {
        return this.fetchData(`/basketball/mens-college-basketball/teams/${team}`);
    }
    // Soccer (generic, league required)
    async getSoccerScores(league) {
        return this.fetchData(`/soccer/${league}/scoreboard`);
    }
    async getMLSScores() {
        return this.fetchData('/soccer/mls/scoreboard');
    }
    async getPremierLeagueScores() {
        return this.fetchData('/soccer/eng.1/scoreboard');
    }
    async getChampionsLeagueScores() {
        return this.fetchData('/soccer/uefa.champions/scoreboard');
    }
    async getSoccerNews(league) {
        return this.fetchData(`/soccer/${league}/news`);
    }
    async getSoccerTeams(league) {
        return this.fetchData(`/soccer/${league}/teams`);
    }
    async getSoccerTeam(league, team) {
        return this.fetchData(`/soccer/${league}/teams/${team}`);
    }
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
        try {
            const leagueParam = league ? `/${league}` : '';
            const standingsData = await this.fetchData(`/${sport}${leagueParam}/standings`);
            // Check if we got minimal response (just a link)
            if (standingsData?.fullViewLink && !standingsData.standings) {
                // Return informative response about the limitation
                return {
                    message: "ESPN API provides limited standings data via this endpoint",
                    fullViewLink: standingsData.fullViewLink,
                    recommendation: "Use the fullViewLink to access complete standings on ESPN's website",
                    sport: sport,
                    league: league,
                    alternativeEndpoint: `/${sport}${leagueParam}/teams can provide team information`
                };
            }
            return standingsData;
        }
        catch (error) {
            console.error('Error fetching standings:', error);
            throw new Error(`Failed to fetch standings: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async getNews(sport) {
        const sportParam = sport ? `/${sport}` : '';
        return this.fetchData(`${sportParam}/news`);
    }
    async getAthletes(sport, league) {
        try {
            // Get all teams first
            const leagueParam = league ? `/${league}` : '';
            const teamsData = await this.fetchData(`/${sport}${leagueParam}/teams`);
            if (!teamsData?.sports?.[0]?.leagues?.[0]?.teams) {
                throw new Error('No teams found');
            }
            const teams = teamsData.sports[0].leagues[0].teams;
            const allAthletes = [];
            // Get roster for each team
            for (const team of teams) {
                try {
                    const rosterData = await this.fetchData(`/${sport}${leagueParam}/teams/${team.id}/roster`);
                    if (rosterData?.athletes) {
                        // Add team info to each athlete
                        const athletesWithTeam = rosterData.athletes.map((athlete) => ({
                            ...athlete,
                            team: {
                                id: team.id,
                                name: team.displayName,
                                abbreviation: team.abbreviation
                            }
                        }));
                        allAthletes.push(...athletesWithTeam);
                    }
                }
                catch (teamError) {
                    // Continue if individual team roster fails
                    console.warn(`Failed to fetch roster for team ${team.id}:`, teamError);
                }
            }
            return {
                athletes: allAthletes,
                count: allAthletes.length,
                sport: sport,
                league: league
            };
        }
        catch (error) {
            console.error('Error fetching athletes:', error);
            throw new Error(`Failed to fetch athletes: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    onResourceUpdate(callback) {
        this.cache.on('resourceUpdated', callback);
    }
    // Generic fallback methods for unsupported combinations
    async getTeamDetails(sport, league, team) {
        return this.fetchData(`/${sport}/${league}/teams/${team}`);
    }
    async getCollegeBaseballTeam(team) {
        return this.fetchData(`/baseball/college-baseball/teams/${team}`);
    }
    async getCollegeBaseballTeams() {
        return this.fetchData('/baseball/college-baseball/teams');
    }
    async getCollegeFootballTeams() {
        return this.fetchData('/football/college-football/teams');
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
                        "wnba", "mlb", "college-baseball", "nhl", "mls", "premier-league", "champions-league"]
                },
                dates: {
                    type: "string",
                    description: "Date in YYYYMMDD format (optional)",
                    pattern: "^\\d{8}$"
                },
                week: {
                    type: "string",
                    description: "NFL week number (optional, for NFL only)"
                },
                seasontype: {
                    type: "string",
                    description: "Season type (1=preseason, 2=regular, 3=postseason) (optional, for NFL only)",
                    enum: ["1", "2", "3"]
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
                    description: "Specific league (optional)",
                    enum: ["nfl", "college-football", "nba", "mens-college-basketball", "womens-college-basketball",
                        "wnba", "mlb", "college-baseball", "nhl"]
                }
            },
            required: ["sport"]
        }
    },
    {
        name: "get_specific_team",
        description: "Get detailed information about a specific team by team abbreviation",
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
                    description: "Specific league",
                    enum: ["nfl", "college-football", "nba", "mens-college-basketball", "womens-college-basketball",
                        "wnba", "mlb", "nhl"]
                },
                team: {
                    type: "string",
                    description: "Team abbreviation (e.g., 'all' for Allegheny, 'gt' for Georgia Tech, 'patriots' for New England)"
                }
            },
            required: ["sport", "league", "team"]
        }
    },
    {
        name: "get_college_football_rankings",
        description: "Get current college football rankings",
        inputSchema: {
            type: "object",
            properties: {},
            additionalProperties: false
        }
    },
    {
        name: "get_game_summary",
        description: "Get detailed game summary information for a specific game",
        inputSchema: {
            type: "object",
            properties: {
                sport: {
                    type: "string",
                    enum: ["football"],
                    description: "The sport (currently only football supported)"
                },
                league: {
                    type: "string",
                    enum: ["college-football"],
                    description: "The league (currently only college-football supported)"
                },
                gameId: {
                    type: "string",
                    description: "Game identifier (e.g., '400934572' for 2017 Army vs Navy)"
                }
            },
            required: ["sport", "league", "gameId"]
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
                    description: "Specific sport for news (optional, defaults to general sports)",
                    enum: ["football", "basketball", "baseball", "hockey"]
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
                    const { sport, league, dates, week, seasontype } = args;
                    let data;
                    // Use specific ESPN endpoints for each sport/league combination
                    switch (sport) {
                        case "football":
                            if (league === "nfl") {
                                data = await espnClient.getNFLScores({ dates, week, seasontype });
                            }
                            else if (league === "college-football") {
                                data = await espnClient.getCollegeFootballScores({ dates });
                            }
                            else {
                                data = await espnClient.getScoreboard(sport, league);
                            }
                            break;
                        case "basketball":
                            if (league === "nba") {
                                data = await espnClient.getNBAScores();
                            }
                            else if (league === "wnba") {
                                data = await espnClient.getWNBAScores();
                            }
                            else if (league === "mens-college-basketball") {
                                data = await espnClient.getMensCollegeBasketballScores();
                            }
                            else if (league === "womens-college-basketball") {
                                data = await espnClient.getWomensCollegeBasketballScores();
                            }
                            else {
                                data = await espnClient.getScoreboard(sport, league);
                            }
                            break;
                        case "baseball":
                            if (league === "mlb") {
                                data = await espnClient.getMLBScores();
                            }
                            else if (league === "college-baseball") {
                                data = await espnClient.getCollegeBaseballScores();
                            }
                            else {
                                data = await espnClient.getScoreboard(sport, league);
                            }
                            break;
                        case "hockey":
                            if (league === "nhl") {
                                data = await espnClient.getNHLScores();
                            }
                            else {
                                data = await espnClient.getScoreboard(sport, league);
                            }
                            break;
                        case "soccer":
                            if (league) {
                                data = await espnClient.getSoccerScores(league);
                            }
                            else {
                                data = await espnClient.getScoreboard(sport, league);
                            }
                            break;
                        default:
                            data = await espnClient.getScoreboard(sport, league);
                    }
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
                    let data;
                    // Use specific ESPN endpoints for each sport/league combination
                    switch (sport) {
                        case "football":
                            if (league === "nfl") {
                                data = await espnClient.getNFLTeams();
                            }
                            else {
                                data = await espnClient.getTeams(sport, league);
                            }
                            break;
                        case "basketball":
                            if (league === "nba") {
                                data = await espnClient.getNBATeams();
                            }
                            else if (league === "wnba") {
                                data = await espnClient.getWNBATeams();
                            }
                            else if (league === "mens-college-basketball") {
                                data = await espnClient.getMensCollegeBasketballTeams();
                            }
                            else if (league === "womens-college-basketball") {
                                data = await espnClient.getWomensCollegeBasketballTeams();
                            }
                            else {
                                data = await espnClient.getTeams(sport, league);
                            }
                            break;
                        case "baseball":
                            if (league === "mlb") {
                                data = await espnClient.getMLBTeams();
                            }
                            else {
                                data = await espnClient.getTeams(sport, league);
                            }
                            break;
                        case "hockey":
                            if (league === "nhl") {
                                data = await espnClient.getNHLTeams();
                            }
                            else {
                                data = await espnClient.getTeams(sport, league);
                            }
                            break;
                        case "soccer":
                            if (league) {
                                data = await espnClient.getSoccerTeams(league);
                            }
                            else {
                                data = await espnClient.getTeams(sport, league);
                            }
                            break;
                        default:
                            data = await espnClient.getTeams(sport, league);
                    }
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
                    let data;
                    // Use specific ESPN endpoints for each sport
                    switch (sport) {
                        case "football":
                            // For football, we'll get both NFL and college football news
                            const [nflNews, cfbNews] = await Promise.all([
                                espnClient.getNFLNews().catch(() => null),
                                espnClient.getCollegeFootballNews().catch(() => null)
                            ]);
                            data = { nfl: nflNews, collegefootball: cfbNews };
                            break;
                        case "basketball":
                            // For basketball, get NBA, WNBA, and college basketball news
                            const [nbaNews, wnbaNews, mensCbbNews, womensCbbNews] = await Promise.all([
                                espnClient.getNBANews().catch(() => null),
                                espnClient.getWNBANews().catch(() => null),
                                espnClient.getMensCollegeBasketballNews().catch(() => null),
                                espnClient.getWomensCollegeBasketballNews().catch(() => null)
                            ]);
                            data = { nba: nbaNews, wnba: wnbaNews, menscollege: mensCbbNews, womenscollege: womensCbbNews };
                            break;
                        case "baseball":
                            data = await espnClient.getMLBNews();
                            break;
                        case "hockey":
                            data = await espnClient.getNHLNews();
                            break;
                        case "soccer":
                            // For soccer, get news from major leagues
                            const [premierLeagueNews, mlsNews, championsLeagueNews, laLigaNews] = await Promise.all([
                                espnClient.getSoccerNews('eng.1').catch(() => null),
                                espnClient.getSoccerNews('usa.1').catch(() => null),
                                espnClient.getSoccerNews('uefa.champions').catch(() => null),
                                espnClient.getSoccerNews('esp.1').catch(() => null)
                            ]);
                            data = {
                                premierLeague: premierLeagueNews,
                                mls: mlsNews,
                                championsLeague: championsLeagueNews,
                                laLiga: laLigaNews
                            };
                            break;
                        default:
                            data = await espnClient.getNews(sport);
                    }
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
                case "get_specific_team": {
                    const { sport, league, team } = args;
                    let data;
                    switch (sport) {
                        case "football":
                            if (league === "college-football") {
                                data = await espnClient.getCollegeFootballTeam(team);
                            }
                            else if (league === "nfl") {
                                data = await espnClient.getNFLTeam(team);
                            }
                            else {
                                data = await espnClient.getTeamDetails(sport, league, team);
                            }
                            break;
                        case "basketball":
                            if (league === "nba") {
                                data = await espnClient.getNBATeam(team);
                            }
                            else if (league === "wnba") {
                                data = await espnClient.getWNBATeam(team);
                            }
                            else if (league === "mens-college-basketball") {
                                data = await espnClient.getMensCollegeBasketballTeam(team);
                            }
                            else if (league === "womens-college-basketball") {
                                data = await espnClient.getWomensCollegeBasketballTeam(team);
                            }
                            else {
                                data = await espnClient.getTeamDetails(sport, league, team);
                            }
                            break;
                        case "baseball":
                            if (league === "mlb") {
                                data = await espnClient.getMLBTeam(team);
                            }
                            else if (league === "college-baseball") {
                                data = await espnClient.getCollegeBaseballTeam(team);
                            }
                            else {
                                data = await espnClient.getTeamDetails(sport, league, team);
                            }
                            break;
                        case "hockey":
                            if (league === "nhl") {
                                data = await espnClient.getNHLTeam(team);
                            }
                            else {
                                data = await espnClient.getTeamDetails(sport, league, team);
                            }
                            break;
                        default:
                            data = await espnClient.getTeamDetails(sport, league, team);
                    }
                    return {
                        content: [
                            {
                                type: "text",
                                text: `Team information for ${team} in ${sport} (${league}):\n\n${JSON.stringify(data, null, 2)}`
                            }
                        ]
                    };
                }
                case "get_college_football_rankings": {
                    const data = await espnClient.getCollegeFootballRankings();
                    return {
                        content: [
                            {
                                type: "text",
                                text: `College Football Rankings:\n\n${JSON.stringify(data, null, 2)}`
                            }
                        ]
                    };
                }
                case "get_game_summary": {
                    const { sport, league, gameId } = args;
                    if (sport === "football" && league === "college-football") {
                        const data = await espnClient.getCollegeFootballGameSummary(gameId);
                        return {
                            content: [
                                {
                                    type: "text",
                                    text: `Game Summary for ${gameId}:\n\n${JSON.stringify(data, null, 2)}`
                                }
                            ]
                        };
                    }
                    else {
                        throw new Error(`Game summary only supported for college football currently`);
                    }
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
                    const [nflScores, nbaScores, mlbScores, nhlScores] = await Promise.all([
                        espnClient.getNFLScores().catch(() => null),
                        espnClient.getNBAScores().catch(() => null),
                        espnClient.getMLBScores().catch(() => null),
                        espnClient.getNHLScores().catch(() => null)
                    ]);
                    contents = [{
                            uri,
                            mimeType: "application/json",
                            text: JSON.stringify({
                                lastUpdated: new Date().toISOString(),
                                nfl: nflScores,
                                nba: nbaScores,
                                mlb: mlbScores,
                                nhl: nhlScores
                            }, null, 2)
                        }];
                    break;
                }
                case "espn://breaking-news": {
                    const [nflNews, nbaNews, mlbNews, nhlNews] = await Promise.all([
                        espnClient.getNFLNews().catch(() => null),
                        espnClient.getNBANews().catch(() => null),
                        espnClient.getMLBNews().catch(() => null),
                        espnClient.getNHLNews().catch(() => null)
                    ]);
                    contents = [{
                            uri,
                            mimeType: "application/json",
                            text: JSON.stringify({
                                lastUpdated: new Date().toISOString(),
                                nfl: nflNews,
                                nba: nbaNews,
                                mlb: mlbNews,
                                nhl: nhlNews
                            }, null, 2)
                        }];
                    break;
                }
                case "espn://trending-athletes": {
                    const [nflTeams, nbaTeams, mlbTeams, nhlTeams] = await Promise.all([
                        espnClient.getNFLTeams().catch(() => null),
                        espnClient.getNBATeams().catch(() => null),
                        espnClient.getMLBTeams().catch(() => null),
                        espnClient.getNHLTeams().catch(() => null)
                    ]);
                    contents = [{
                            uri,
                            mimeType: "application/json",
                            text: JSON.stringify({
                                lastUpdated: new Date().toISOString(),
                                nfl: nflTeams,
                                nba: nbaTeams,
                                mlb: mlbTeams,
                                nhl: nhlTeams
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
                                lastUpdated: new Date().toISOString(),
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
                const { sport, league, dates, week, seasontype } = args;
                const espnClient = new ModernESPNClient();
                let data;
                // Use specific ESPN endpoints for each sport/league combination
                switch (sport) {
                    case "football":
                        if (league === "nfl") {
                            data = await espnClient.getNFLScores({ dates, week, seasontype });
                        }
                        else if (league === "college-football") {
                            data = await espnClient.getCollegeFootballScores({ dates });
                        }
                        else {
                            data = await espnClient.getScoreboard(sport, league);
                        }
                        break;
                    case "basketball":
                        if (league === "nba") {
                            data = await espnClient.getNBAScores();
                        }
                        else if (league === "wnba") {
                            data = await espnClient.getWNBAScores();
                        }
                        else if (league === "mens-college-basketball") {
                            data = await espnClient.getMensCollegeBasketballScores();
                        }
                        else if (league === "womens-college-basketball") {
                            data = await espnClient.getWomensCollegeBasketballScores();
                        }
                        else {
                            data = await espnClient.getScoreboard(sport, league);
                        }
                        break;
                    case "baseball":
                        if (league === "mlb") {
                            data = await espnClient.getMLBScores();
                        }
                        else if (league === "college-baseball") {
                            data = await espnClient.getCollegeBaseballScores();
                        }
                        else {
                            data = await espnClient.getScoreboard(sport, league);
                        }
                        break;
                    case "hockey":
                        if (league === "nhl") {
                            data = await espnClient.getNHLScores();
                        }
                        else {
                            data = await espnClient.getScoreboard(sport, league);
                        }
                        break;
                    case "soccer":
                        if (league === "mls") {
                            data = await espnClient.getMLSScores();
                        }
                        else if (league === "premier-league") {
                            data = await espnClient.getPremierLeagueScores();
                        }
                        else if (league === "champions-league") {
                            data = await espnClient.getChampionsLeagueScores();
                        }
                        else {
                            data = await espnClient.getSoccerScores('mls');
                        }
                        break;
                    default:
                        data = await espnClient.getScoreboard(sport, league);
                }
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
                let data;
                // Use specific ESPN endpoints for each sport/league combination
                switch (sport) {
                    case "football":
                        if (league === "nfl") {
                            data = await espnClient.getNFLTeams();
                        }
                        else if (league === "college-football") {
                            data = await espnClient.getCollegeFootballTeams();
                        }
                        else {
                            data = await espnClient.getTeams(sport, league);
                        }
                        break;
                    case "basketball":
                        if (league === "nba") {
                            data = await espnClient.getNBATeams();
                        }
                        else if (league === "wnba") {
                            data = await espnClient.getWNBATeams();
                        }
                        else if (league === "mens-college-basketball") {
                            data = await espnClient.getMensCollegeBasketballTeams();
                        }
                        else if (league === "womens-college-basketball") {
                            data = await espnClient.getWomensCollegeBasketballTeams();
                        }
                        else {
                            data = await espnClient.getTeams(sport, league);
                        }
                        break;
                    case "baseball":
                        if (league === "mlb") {
                            data = await espnClient.getMLBTeams();
                        }
                        else if (league === "college-baseball") {
                            data = await espnClient.getCollegeBaseballTeams();
                        }
                        else {
                            data = await espnClient.getTeams(sport, league);
                        }
                        break;
                    case "hockey":
                        if (league === "nhl") {
                            data = await espnClient.getNHLTeams();
                        }
                        else {
                            data = await espnClient.getTeams(sport, league);
                        }
                        break;
                    case "soccer":
                        if (league) {
                            data = await espnClient.getSoccerTeams(league);
                        }
                        else {
                            data = await espnClient.getTeams(sport, league);
                        }
                        break;
                    default:
                        data = await espnClient.getTeams(sport, league);
                }
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
                let data;
                switch (sport) {
                    case "football":
                        // For football, we'll get both NFL and college football news
                        const [nflNews, cfbNews] = await Promise.all([
                            espnClient.getNFLNews().catch(() => null),
                            espnClient.getCollegeFootballNews().catch(() => null)
                        ]);
                        data = { nfl: nflNews, collegefootball: cfbNews };
                        break;
                    case "basketball":
                        // For basketball, get NBA, WNBA, and college basketball news
                        const [nbaNews, wnbaNews, mensCbbNews, womensCbbNews] = await Promise.all([
                            espnClient.getNBANews().catch(() => null),
                            espnClient.getWNBANews().catch(() => null),
                            espnClient.getMensCollegeBasketballNews().catch(() => null),
                            espnClient.getWomensCollegeBasketballNews().catch(() => null)
                        ]);
                        data = { nba: nbaNews, wnba: wnbaNews, menscollege: mensCbbNews, womenscollege: womensCbbNews };
                        break;
                    case "baseball":
                        data = await espnClient.getMLBNews();
                        break;
                    case "hockey":
                        data = await espnClient.getNHLNews();
                        break;
                    default:
                        data = await espnClient.getNews(sport);
                }
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
            case "get_specific_team": {
                const { sport, league, team } = args;
                const espnClient = new ModernESPNClient();
                let data;
                switch (sport) {
                    case "football":
                        if (league === "college-football") {
                            data = await espnClient.getCollegeFootballTeam(team);
                        }
                        else if (league === "nfl") {
                            data = await espnClient.getNFLTeam(team);
                        }
                        else {
                            data = await espnClient.getTeamDetails(sport, league, team);
                        }
                        break;
                    case "basketball":
                        if (league === "nba") {
                            data = await espnClient.getNBATeam(team);
                        }
                        else if (league === "wnba") {
                            data = await espnClient.getWNBATeam(team);
                        }
                        else if (league === "mens-college-basketball") {
                            data = await espnClient.getMensCollegeBasketballTeam(team);
                        }
                        else if (league === "womens-college-basketball") {
                            data = await espnClient.getWomensCollegeBasketballTeam(team);
                        }
                        else {
                            data = await espnClient.getTeamDetails(sport, league, team);
                        }
                        break;
                    case "baseball":
                        if (league === "mlb") {
                            data = await espnClient.getMLBTeam(team);
                        }
                        else if (league === "college-baseball") {
                            data = await espnClient.getCollegeBaseballTeam(team);
                        }
                        else {
                            data = await espnClient.getTeamDetails(sport, league, team);
                        }
                        break;
                    case "hockey":
                        if (league === "nhl") {
                            data = await espnClient.getNHLTeam(team);
                        }
                        else {
                            data = await espnClient.getTeamDetails(sport, league, team);
                        }
                        break;
                    default:
                        data = await espnClient.getTeamDetails(sport, league, team);
                }
                espnClient.destroy();
                return {
                    content: [
                        {
                            type: "text",
                            text: `Team information for ${team} in ${sport} (${league}):\n\n${JSON.stringify(data, null, 2)}`
                        }
                    ]
                };
            }
            case "get_college_football_rankings": {
                const espnClient = new ModernESPNClient();
                const data = await espnClient.getCollegeFootballRankings();
                espnClient.destroy();
                return {
                    content: [
                        {
                            type: "text",
                            text: `College Football Rankings:\n\n${JSON.stringify(data, null, 2)}`
                        }
                    ]
                };
            }
            case "get_game_summary": {
                const { sport, league, gameId } = args;
                const espnClient = new ModernESPNClient();
                if (sport === "football" && league === "college-football") {
                    const data = await espnClient.getCollegeFootballGameSummary(gameId);
                    espnClient.destroy();
                    return {
                        content: [
                            {
                                type: "text",
                                text: `Game Summary for ${gameId}:\n\n${JSON.stringify(data, null, 2)}`
                            }
                        ]
                    };
                }
                else {
                    espnClient.destroy();
                    throw new Error(`Game summary only supported for college football currently`);
                }
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
