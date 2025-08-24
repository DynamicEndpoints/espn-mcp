/**
 * ESPN MCP Server - Core Module with Lazy Loading
 * Complete implementation with intelligent caching and multiple transport options
 */
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
// Lazy Loading Cache Implementation
class LazyCache {
    cache = new Map();
    activeLoads = new Map();
    async get(key, loader, ttl = 300000 // 5 minutes default
    ) {
        // Check if we have valid cached data
        const cached = this.cache.get(key);
        if (cached && Date.now() - cached.timestamp < cached.ttl) {
            return cached.data;
        }
        // Check if we're already loading this data
        if (this.activeLoads.has(key)) {
            return this.activeLoads.get(key);
        }
        // Start loading the data
        const loadPromise = loader().then((data) => {
            // Cache the result
            this.cache.set(key, {
                data,
                timestamp: Date.now(),
                ttl
            });
            // Remove from active loads
            this.activeLoads.delete(key);
            return data;
        }).catch((error) => {
            // Remove from active loads on error
            this.activeLoads.delete(key);
            throw error;
        });
        this.activeLoads.set(key, loadPromise);
        return loadPromise;
    }
    clear() {
        this.cache.clear();
        this.activeLoads.clear();
    }
    size() {
        return this.cache.size;
    }
    getStats() {
        return {
            size: this.cache.size,
            activeLoads: this.activeLoads.size,
            keys: Array.from(this.cache.keys())
        };
    }
}
// ESPN Tool Definitions
const ESPN_TOOLS = [
    // NFL Tools
    {
        name: 'get_nfl_scores',
        description: 'Get NFL scores with lazy loading',
        inputSchema: {
            type: 'object',
            properties: {
                save: { type: 'boolean', description: 'Whether to save results to markdown' }
            },
        },
    },
    {
        name: 'get_nfl_news',
        description: 'Get NFL news with lazy loading',
        inputSchema: {
            type: 'object',
            properties: {
                save: { type: 'boolean', description: 'Whether to save results to markdown' }
            },
        },
    },
    {
        name: 'get_nfl_teams',
        description: 'Get all NFL teams with lazy loading',
        inputSchema: {
            type: 'object',
            properties: {
                save: { type: 'boolean', description: 'Whether to save results to markdown' }
            },
        },
    },
    {
        name: 'get_nfl_standings',
        description: 'Get NFL standings with lazy loading',
        inputSchema: { type: 'object', properties: {} },
    },
    // NBA Tools
    {
        name: 'get_nba_scores',
        description: 'Get NBA scores with lazy loading',
        inputSchema: { type: 'object', properties: {} },
    },
    {
        name: 'get_nba_news',
        description: 'Get NBA news with lazy loading',
        inputSchema: { type: 'object', properties: {} },
    },
    {
        name: 'get_nba_teams',
        description: 'Get all NBA teams with lazy loading',
        inputSchema: { type: 'object', properties: {} },
    },
    {
        name: 'get_nba_standings',
        description: 'Get NBA standings with lazy loading',
        inputSchema: { type: 'object', properties: {} },
    },
    // MLB Tools
    {
        name: 'get_mlb_scores',
        description: 'Get MLB scores with lazy loading',
        inputSchema: { type: 'object', properties: {} },
    },
    {
        name: 'get_mlb_news',
        description: 'Get MLB news with lazy loading',
        inputSchema: { type: 'object', properties: {} },
    },
    {
        name: 'get_mlb_teams',
        description: 'Get all MLB teams with lazy loading',
        inputSchema: { type: 'object', properties: {} },
    },
    {
        name: 'get_mlb_standings',
        description: 'Get MLB standings with lazy loading',
        inputSchema: { type: 'object', properties: {} },
    },
    // NHL Tools
    {
        name: 'get_nhl_scores',
        description: 'Get NHL scores with lazy loading',
        inputSchema: { type: 'object', properties: {} },
    },
    {
        name: 'get_nhl_news',
        description: 'Get NHL news with lazy loading',
        inputSchema: { type: 'object', properties: {} },
    },
    {
        name: 'get_nhl_teams',
        description: 'Get all NHL teams with lazy loading',
        inputSchema: { type: 'object', properties: {} },
    },
    {
        name: 'get_nhl_standings',
        description: 'Get NHL standings with lazy loading',
        inputSchema: { type: 'object', properties: {} },
    },
    // College Football
    {
        name: 'get_college_football_scores',
        description: 'Get college football scores with lazy loading',
        inputSchema: { type: 'object', properties: {} },
    },
    {
        name: 'get_college_football_news',
        description: 'Get college football news with lazy loading',
        inputSchema: { type: 'object', properties: {} },
    },
    {
        name: 'get_college_football_rankings',
        description: 'Get college football rankings with lazy loading',
        inputSchema: { type: 'object', properties: {} },
    },
    // Cache Management Tools
    {
        name: 'get_cache_stats',
        description: 'Get current cache statistics and performance metrics',
        inputSchema: { type: 'object', properties: {} },
    },
    {
        name: 'clear_cache',
        description: 'Clear all cached data to force fresh API calls',
        inputSchema: { type: 'object', properties: {} },
    },
];
// Lazy ESPN Service
class LazyESPNService {
    cache = new LazyCache();
    baseURL = 'http://site.api.espn.com/apis/site/v2/sports';
    // Cache TTL per sport type (milliseconds)
    cacheTTL = {
        nfl: 180000, // 3 minutes - moderate pace
        nba: 60000, // 1 minute - fast-paced
        mlb: 120000, // 2 minutes - moderate pace
        nhl: 120000, // 2 minutes - moderate pace
        cfb: 300000, // 5 minutes - slower updates
        soccer: 240000, // 4 minutes - moderate pace
        default: 300000 // 5 minutes fallback
    };
    getTTL(toolName) {
        // Extract sport from tool name
        const sport = this.extractSport(toolName);
        return this.cacheTTL[sport] || this.cacheTTL.default;
    }
    extractSport(toolName) {
        if (toolName.includes('nfl'))
            return 'nfl';
        if (toolName.includes('nba'))
            return 'nba';
        if (toolName.includes('mlb'))
            return 'mlb';
        if (toolName.includes('nhl'))
            return 'nhl';
        if (toolName.includes('college_football') || toolName.includes('cfb'))
            return 'cfb';
        if (toolName.includes('soccer'))
            return 'soccer';
        return 'default';
    }
    async fetchData(url) {
        // Simple fetch implementation without axios dependency
        const fullUrl = `${this.baseURL}${url}`;
        try {
            const response = await fetch(fullUrl);
            if (!response.ok) {
                throw new Error(`ESPN API error: ${response.status} ${response.statusText}`);
            }
            return await response.json();
        }
        catch (error) {
            throw new Error(`Failed to fetch ESPN data: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    async callTool(name, args) {
        // Handle cache management tools
        if (name === 'get_cache_stats') {
            return {
                stats: this.cache.getStats(),
                uptime: Math.floor(process.uptime()),
                memory: process.memoryUsage(),
                cacheTTL: this.cacheTTL
            };
        }
        if (name === 'clear_cache') {
            this.cache.clear();
            return { message: 'Cache cleared successfully' };
        }
        const cacheKey = `${name}:${JSON.stringify(args)}`;
        const ttl = this.getTTL(name);
        return this.cache.get(cacheKey, () => this.fetchESPNData(name, args), ttl);
    }
    async fetchESPNData(name, args) {
        let url = '';
        switch (name) {
            // NFL
            case 'get_nfl_scores':
                url = '/football/nfl/scoreboard';
                break;
            case 'get_nfl_news':
                url = '/football/nfl/news';
                break;
            case 'get_nfl_teams':
                url = '/football/nfl/teams';
                break;
            case 'get_nfl_standings':
                url = '/football/nfl/standings';
                break;
            // NBA
            case 'get_nba_scores':
                url = '/basketball/nba/scoreboard';
                break;
            case 'get_nba_news':
                url = '/basketball/nba/news';
                break;
            case 'get_nba_teams':
                url = '/basketball/nba/teams';
                break;
            case 'get_nba_standings':
                url = '/basketball/nba/standings';
                break;
            // MLB
            case 'get_mlb_scores':
                url = '/baseball/mlb/scoreboard';
                break;
            case 'get_mlb_news':
                url = '/baseball/mlb/news';
                break;
            case 'get_mlb_teams':
                url = '/baseball/mlb/teams';
                break;
            case 'get_mlb_standings':
                url = '/baseball/mlb/standings';
                break;
            // NHL
            case 'get_nhl_scores':
                url = '/hockey/nhl/scoreboard';
                break;
            case 'get_nhl_news':
                url = '/hockey/nhl/news';
                break;
            case 'get_nhl_teams':
                url = '/hockey/nhl/teams';
                break;
            case 'get_nhl_standings':
                url = '/hockey/nhl/standings';
                break;
            // College Football
            case 'get_college_football_scores':
                url = '/football/college-football/scoreboard';
                break;
            case 'get_college_football_news':
                url = '/football/college-football/news';
                break;
            case 'get_college_football_rankings':
                url = '/football/college-football/rankings';
                break;
            default:
                throw new Error(`Unknown tool: ${name}`);
        }
        const data = await this.fetchData(url);
        // Format the response based on the data type
        return this.formatResponse(name, data);
    }
    formatResponse(toolName, data) {
        const date = new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        let content = `# ESPN ${this.getLeagueFromTool(toolName)} ${this.getTypeFromTool(toolName)}\n\n`;
        content += `*Updated: ${date}*\n\n`;
        try {
            if (toolName.includes('scores') && data.events) {
                content += '## Scores\n\n';
                data.events.slice(0, 10).forEach((event) => {
                    const competition = event.competitions?.[0];
                    if (competition) {
                        const homeTeam = competition.competitors?.find((c) => c.homeAway === 'home');
                        const awayTeam = competition.competitors?.find((c) => c.homeAway === 'away');
                        const status = event.status?.type?.description || 'Unknown';
                        content += `### ${awayTeam?.team?.name || 'Away'} vs ${homeTeam?.team?.name || 'Home'}\n`;
                        content += `**Score:** ${awayTeam?.score || '0'} - ${homeTeam?.score || '0'}\n`;
                        content += `**Status:** ${status}\n`;
                        if (competition.venue?.fullName) {
                            content += `**Venue:** ${competition.venue.fullName}\n`;
                        }
                        content += '\n';
                    }
                });
            }
            else if (toolName.includes('news') && data.articles) {
                content += '## Latest News\n\n';
                data.articles.slice(0, 10).forEach((article) => {
                    content += `### ${article.headline || 'No Title'}\n`;
                    content += `${article.description || 'No description available'}\n\n`;
                    if (article.published) {
                        const pubDate = new Date(article.published).toLocaleDateString();
                        content += `*Published: ${pubDate}*\n`;
                    }
                    if (article.links?.web?.href) {
                        content += `[Read more](${article.links.web.href})\n`;
                    }
                    content += '\n---\n\n';
                });
            }
            else if (toolName.includes('teams') && data.sports?.[0]?.leagues?.[0]?.teams) {
                content += '## Teams\n\n';
                data.sports[0].leagues[0].teams.slice(0, 32).forEach((teamData) => {
                    const team = teamData.team;
                    content += `### ${team.displayName || team.name}\n`;
                    content += `**Location:** ${team.location || 'N/A'}\n`;
                    content += `**Abbreviation:** ${team.abbreviation || 'N/A'}\n`;
                    if (team.venue?.fullName) {
                        content += `**Home Venue:** ${team.venue.fullName}\n`;
                    }
                    content += '\n';
                });
            }
            else if (toolName.includes('standings')) {
                content += '## Standings\n\n';
                if (data.groups) {
                    data.groups.forEach((group) => {
                        content += `### ${group.name}\n\n`;
                        content += '| Team | W | L | PCT |\n';
                        content += '|------|---|---|-----|\n';
                        group.standings?.entries?.forEach((entry) => {
                            const team = entry.team;
                            const wins = entry.stats?.find((s) => s.name === 'wins')?.value || 0;
                            const losses = entry.stats?.find((s) => s.name === 'losses')?.value || 0;
                            const pct = entry.stats?.find((s) => s.name === 'winPercent')?.value || '0.000';
                            content += `| ${team.name} | ${wins} | ${losses} | ${pct} |\n`;
                        });
                        content += '\n';
                    });
                }
            }
            else if (toolName.includes('rankings') && data.rankings?.[0]?.ranks) {
                content += '## Rankings\n\n';
                data.rankings[0].ranks.slice(0, 25).forEach((rank) => {
                    content += `${rank.current}. **${rank.team?.name || 'Unknown'}** (${rank.recordSummary || 'No record'})\n`;
                });
                content += '\n';
            }
            else {
                content += '## Raw Data\n\n';
                content += '```json\n';
                content += JSON.stringify(data, null, 2).slice(0, 2000);
                content += '\n```\n';
            }
        }
        catch (error) {
            content += `## Error Processing Data\n\n`;
            content += `Error: ${error instanceof Error ? error.message : String(error)}\n\n`;
            content += '### Raw Response\n\n';
            content += '```json\n';
            content += JSON.stringify(data, null, 2).slice(0, 1000);
            content += '\n```\n';
        }
        return content;
    }
    getLeagueFromTool(toolName) {
        if (toolName.includes('nfl'))
            return 'NFL';
        if (toolName.includes('nba'))
            return 'NBA';
        if (toolName.includes('mlb'))
            return 'MLB';
        if (toolName.includes('nhl'))
            return 'NHL';
        if (toolName.includes('college_football'))
            return 'College Football';
        return 'Sports';
    }
    getTypeFromTool(toolName) {
        if (toolName.includes('scores'))
            return 'Scores';
        if (toolName.includes('news'))
            return 'News';
        if (toolName.includes('teams'))
            return 'Teams';
        if (toolName.includes('standings'))
            return 'Standings';
        if (toolName.includes('rankings'))
            return 'Rankings';
        return 'Data';
    }
    getCacheStats() {
        return this.cache.getStats();
    }
    clearCache() {
        this.cache.clear();
    }
}
// Create the ESPN service instance
const espnService = new LazyESPNService();
// Create and configure the server
const server = new Server({
    name: 'espn-mcp-lazy',
    version: '0.2.0',
}, {
    capabilities: {
        tools: {},
    },
});
// List tools handler
server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: ESPN_TOOLS.map(tool => ({
            name: tool.name,
            description: tool.description,
            inputSchema: tool.inputSchema
        }))
    };
});
// Call tool handler with lazy loading
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    try {
        // Use the lazy service to call the tool
        const result = await espnService.callTool(name, args || {});
        return {
            content: [
                {
                    type: 'text',
                    text: typeof result === 'string' ? result : JSON.stringify(result, null, 2),
                },
            ],
        };
    }
    catch (error) {
        return {
            content: [
                {
                    type: 'text',
                    text: `Error: ${error instanceof Error ? error.message : String(error)}`,
                },
            ],
            isError: true,
        };
    }
});
// Transport factory function
export function createTransport(type = 'stdio') {
    switch (type) {
        case 'stdio':
            return new StdioServerTransport();
        default:
            throw new Error(`Unknown transport type: ${type}`);
    }
}
// Main function for STDIO server
export async function main() {
    const transport = createTransport('stdio');
    await server.connect(transport);
    console.error('ESPN MCP Lazy Server running on stdio');
    console.error('Enhanced with intelligent caching and performance monitoring');
}
// Export for testing and other modules
export { server, espnService, ESPN_TOOLS };
// Start server if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch((error) => {
        console.error('Server error:', error);
        process.exit(1);
    });
}
