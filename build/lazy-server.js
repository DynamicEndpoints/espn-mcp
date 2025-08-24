#!/usr/bin/env node
import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import axios from 'axios';
import { formatScore, formatNews, formatTeam, formatStandings, createMarkdownTitle } from './formatters.js';
import { exportToMarkdown } from './markdown.js';
const BASE_URL = 'http://site.api.espn.com/apis/site/v2/sports';
class LazyCache {
    constructor(defaultTTL = 300000) {
        this.cache = new Map();
        this.defaultTTL = defaultTTL;
    }
    get(key) {
        const entry = this.cache.get(key);
        if (!entry)
            return null;
        if (Date.now() > entry.expiry) {
            this.cache.delete(key);
            return null;
        }
        return entry.data;
    }
    set(key, data, ttl = this.defaultTTL) {
        this.cache.set(key, {
            data,
            timestamp: Date.now(),
            expiry: Date.now() + ttl
        });
    }
    clear() {
        this.cache.clear();
    }
    size() {
        return this.cache.size;
    }
}
class LazyAPIService {
    constructor() {
        this.loadingPromises = new Map();
        this.axiosInstance = axios.create({
            baseURL: BASE_URL,
            timeout: 10000,
            headers: {
                'User-Agent': 'ESPN-MCP-Server/1.0.0'
            }
        });
        this.cache = new LazyCache();
    }
    async lazyFetch(endpoint, ttl) {
        const cacheKey = endpoint;
        // Check cache first
        const cached = this.cache.get(cacheKey);
        if (cached) {
            return cached;
        }
        // Check if already loading
        if (this.loadingPromises.has(cacheKey)) {
            return await this.loadingPromises.get(cacheKey);
        }
        // Start loading
        const loadingPromise = this.axiosInstance.get(endpoint)
            .then((response) => {
            this.cache.set(cacheKey, response.data, ttl);
            return response.data;
        })
            .finally(() => {
            this.loadingPromises.delete(cacheKey);
        });
        this.loadingPromises.set(cacheKey, loadingPromise);
        return await loadingPromise;
    }
    getCacheStats() {
        return {
            size: this.cache.size(),
            activeLoads: this.loadingPromises.size
        };
    }
    clearCache() {
        this.cache.clear();
        this.loadingPromises.clear();
    }
}
class ESPNLazyServer {
    constructor() {
        this.server = new McpServer({
            name: 'espn-lazy-adventures',
            version: '2.0.0',
        });
        this.apiService = new LazyAPIService();
        this.setupLazyHandlers();
        this.setupErrorHandlers();
    }
    setupLazyHandlers() {
        // Sports configuration with lazy loading
        const sportsConfig = {
            nfl: { path: 'football/nfl', cache: 180000 }, // 3 minutes
            mlb: { path: 'baseball/mlb', cache: 120000 }, // 2 minutes
            nba: { path: 'basketball/nba', cache: 60000 }, // 1 minute
            nhl: { path: 'hockey/nhl', cache: 120000 },
            cfb: { path: 'football/college-football', cache: 300000 }, // 5 minutes
            wnba: { path: 'basketball/wnba', cache: 180000 },
            soccer: { path: 'soccer', cache: 240000 }
        };
        // Register lazy-loaded sports resources
        Object.entries(sportsConfig).forEach(([sport, config]) => {
            this.server.registerResource(`${sport}-data`, new ResourceTemplate(`espn://${sport}/{type}`, {
                list: undefined,
                complete: {
                    type: (value) => {
                        return ['scores', 'news', 'teams', 'standings'].filter(t => t.startsWith(value));
                    }
                }
            }), {
                title: `${sport.toUpperCase()} Data`,
                description: `Lazy-loaded ${sport.toUpperCase()} sports data`,
                mimeType: 'application/json'
            }, async (uri, { type }) => {
                const endpoint = `/${config.path}/${type}`;
                const data = await this.apiService.lazyFetch(endpoint, config.cache);
                return {
                    contents: [{
                            uri: uri.href,
                            text: JSON.stringify(data, null, 2),
                            mimeType: 'application/json'
                        }]
                };
            });
        });
        // Register universal sports tool with lazy loading
        this.server.registerTool('get-sports-data', {
            title: 'Get Sports Data',
            description: 'Lazy-loaded sports data with intelligent caching',
            inputSchema: {
                sport: z.enum(['nfl', 'mlb', 'nba', 'nhl', 'cfb', 'wnba']),
                type: z.enum(['scores', 'news', 'teams', 'standings']),
                team: z.string().optional(),
                format: z.enum(['json', 'markdown']).default('markdown'),
                save: z.boolean().default(false)
            }
        }, async ({ sport, type, team, format, save }) => {
            try {
                const config = sportsConfig[sport];
                let endpoint = `/${config.path}/${type}`;
                if (team && type === 'teams') {
                    endpoint = `/${config.path}/teams/${team}`;
                }
                const data = await this.apiService.lazyFetch(endpoint, config.cache);
                if (format === 'json') {
                    return {
                        content: [{
                                type: 'text',
                                text: JSON.stringify(data, null, 2)
                            }]
                    };
                }
                // Format as markdown
                let content = createMarkdownTitle(type, sport.toUpperCase());
                if (type === 'scores' && data.events) {
                    content += data.events.map((event) => formatScore(event)).join('\n\n');
                }
                else if (type === 'news' && data.articles) {
                    content += data.articles.map((article) => formatNews(article)).join('\n\n');
                }
                else if (type === 'teams' && data.sports?.[0]?.leagues?.[0]?.teams) {
                    content += data.sports[0].leagues[0].teams
                        .map((team) => formatTeam(team.team))
                        .join('\n\n');
                }
                else if (type === 'standings' && data.standings) {
                    data.standings.forEach((div) => {
                        content += formatStandings(div);
                    });
                }
                // Add cache stats
                const stats = this.apiService.getCacheStats();
                content += `\n\n---\n*Cache: ${stats.size} entries, ${stats.activeLoads} loading*`;
                if (save) {
                    const filePath = exportToMarkdown(content, type, sport.toUpperCase());
                    content += `\n\nSaved to: ${filePath}`;
                }
                return {
                    content: [{
                            type: 'text',
                            text: content
                        }]
                };
            }
            catch (error) {
                return {
                    content: [{
                            type: 'text',
                            text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
                        }],
                    isError: true
                };
            }
        });
        // Cache management tool
        this.server.registerTool('cache-stats', {
            title: 'Cache Statistics',
            description: 'View cache performance and statistics',
            inputSchema: {
                action: z.enum(['stats', 'clear']).default('stats')
            }
        }, async ({ action }) => {
            if (action === 'clear') {
                this.apiService.clearCache();
                return {
                    content: [{
                            type: 'text',
                            text: 'Cache cleared successfully!'
                        }]
                };
            }
            const stats = this.apiService.getCacheStats();
            return {
                content: [{
                        type: 'text',
                        text: `## Cache Statistics\n\n- **Cached entries:** ${stats.size}\n- **Active loads:** ${stats.activeLoads}\n- **Server uptime:** ${Math.floor(process.uptime())} seconds`
                    }]
            };
        });
        // Health check resource
        this.server.registerResource('health', 'espn://health', {
            title: 'Server Health',
            description: 'Server health and performance metrics',
            mimeType: 'application/json'
        }, async () => {
            const stats = this.apiService.getCacheStats();
            const health = {
                status: 'healthy',
                uptime: process.uptime(),
                memory: process.memoryUsage(),
                cache: stats,
                timestamp: new Date().toISOString()
            };
            return {
                contents: [{
                        uri: 'espn://health',
                        text: JSON.stringify(health, null, 2),
                        mimeType: 'application/json'
                    }]
            };
        });
    }
    setupErrorHandlers() {
        this.server.server.onerror = (error) => {
            console.error('[MCP Error]', error);
        };
        process.on('SIGINT', async () => {
            console.log('\nShutting down gracefully...');
            this.apiService.clearCache();
            await this.server.close();
            process.exit(0);
        });
        process.on('unhandledRejection', (reason, promise) => {
            console.error('Unhandled Rejection at:', promise, 'reason:', reason);
        });
    }
    getServer() {
        return this.server;
    }
    getCacheStats() {
        return this.apiService.getCacheStats();
    }
    clearCache() {
        this.apiService.clearCache();
    }
    async run() {
        try {
            this.transport = new StdioServerTransport();
            await this.server.connect(this.transport);
            console.error('ESPN Lazy MCP server running on stdio with intelligent caching');
        }
        catch (error) {
            console.error('Failed to start server:', error);
            process.exit(1);
        }
    }
}
const server = new ESPNLazyServer();
server.run().catch(console.error);
export { ESPNLazyServer };
