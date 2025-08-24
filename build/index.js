#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ErrorCode, ListToolsRequestSchema, McpError, } from '@modelcontextprotocol/sdk/types.js';
import axios from 'axios';
const BASE_URL = 'http://site.api.espn.com/apis/site/v2/sports';
class ESPNServer {
    constructor() {
        this.server = new Server({
            name: 'espn-adventures',
            version: '0.1.0',
        }, {
            capabilities: {
                tools: {},
            },
        });
        this.axiosInstance = axios.create({
            baseURL: BASE_URL,
        });
        this.setupToolHandlers();
        this.server.onerror = (error) => console.error('[MCP Error]', error);
        process.on('SIGINT', async () => {
            await this.server.close();
            process.exit(0);
        });
    }
    setupToolHandlers() {
        this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
            tools: [
                // NFL Tools
                {
                    name: 'get_nfl_scores',
                    description: 'Get NFL scores',
                    inputSchema: {
                        type: 'object',
                        properties: {},
                    },
                },
                {
                    name: 'get_nfl_news',
                    description: 'Get NFL news',
                },
            ]
        },
            {
                name: 'get_nfl_news',
                description: 'Get NFL news',
                inputSchema: {
                    type: 'object',
                    properties: {
                        save: {
                            type: 'boolean',
                            description: 'Whether to save the results to a markdown file'
                        }
                    }
                },
            },
            {
                name: 'get_nfl_teams',
                description: 'Get all NFL teams',
                inputSchema: {
                    type: 'object',
                    properties: {
                        save: {
                            type: 'boolean',
                            description: 'Whether to save the results to a markdown file'
                        }
                    }
                },
            },
            {
                name: 'get_nfl_team',
                description: 'Get specific NFL team',
                inputSchema: {
                    type: 'object',
                    properties: {
                        team: { type: 'string', description: 'Team abbreviation' },
                        save: { type: 'boolean', description: 'Whether to save the results to a markdown file' }
                    },
                    required: ['team'],
                },
            },
            {
                name: 'get_mlb_scores',
                description: 'Get MLB scores',
                inputSchema: {
                    type: 'object',
                    properties: {
                        save: {
                            type: 'boolean',
                            description: 'Whether to save the results to a markdown file'
                        }
                    }
                },
            },
            {
                name: 'get_mlb_news',
                description: 'Get MLB news',
                inputSchema: {
                    type: 'object',
                    properties: {
                        save: {
                            type: 'boolean',
                            description: 'Whether to save the results to a markdown file'
                        }
                    }
                },
            },
            {
                name: 'get_mlb_teams',
                description: 'Get all MLB teams',
                inputSchema: { type: 'object', properties: {} },
            },
            {
                name: 'get_mlb_team',
                description: 'Get specific MLB team',
                inputSchema: {
                    type: 'object',
                    properties: {
                        team: { type: 'string', description: 'Team abbreviation' },
                    },
                    required: ['team'],
                },
            },
            {
                name: 'get_college_baseball_scores',
                description: 'Get college baseball scores',
                inputSchema: { type: 'object', properties: {} },
            },
            {
                name: 'get_nhl_scores',
                description: 'Get NHL scores',
                inputSchema: { type: 'object', properties: {} },
            },
            {
                name: 'get_nhl_news',
                description: 'Get NHL news',
                inputSchema: { type: 'object', properties: {} },
            },
            {
                name: 'get_nhl_teams',
                description: 'Get all NHL teams',
                inputSchema: { type: 'object', properties: {} },
            },
            {
                name: 'get_nhl_team',
                description: 'Get specific NHL team',
                inputSchema: {
                    type: 'object',
                    properties: {
                        team: { type: 'string', description: 'Team abbreviation' },
                    },
                    required: ['team'],
                },
            },
            {
                name: 'get_nba_scores',
                description: 'Get NBA scores',
                inputSchema: { type: 'object', properties: {} },
            },
            {
                name: 'get_nba_news',
                description: 'Get NBA news',
                inputSchema: { type: 'object', properties: {} },
            },
            {
                name: 'get_nba_teams',
                description: 'Get all NBA teams',
                inputSchema: { type: 'object', properties: {} },
            },
            {
                name: 'get_nba_team',
                description: 'Get specific NBA team',
                inputSchema: {
                    type: 'object',
                    properties: {
                        team: { type: 'string', description: 'Team abbreviation' },
                    },
                    required: ['team'],
                },
            },
            {
                name: 'get_wnba_scores',
                description: 'Get WNBA scores',
                inputSchema: { type: 'object', properties: {} },
            },
            {
                name: 'get_wnba_news',
                description: 'Get WNBA news',
                inputSchema: { type: 'object', properties: {} },
            },
            {
                name: 'get_wnba_teams',
                description: 'Get all WNBA teams',
                inputSchema: { type: 'object', properties: {} },
            },
            {
                name: 'get_wnba_team',
                description: 'Get specific WNBA team',
                inputSchema: {
                    type: 'object',
                    properties: {
                        team: { type: 'string', description: 'Team abbreviation' },
                    },
                    required: ['team'],
                },
            },
            {
                name: 'get_womens_college_basketball_scores',
                description: 'Get women\'s college basketball scores',
                inputSchema: { type: 'object', properties: {} },
            },
            {
                name: 'get_womens_college_basketball_news',
                description: 'Get women\'s college basketball news',
                inputSchema: { type: 'object', properties: {} },
            },
            {
                name: 'get_womens_college_basketball_teams',
                description: 'Get all women\'s college basketball teams',
                inputSchema: { type: 'object', properties: {} },
            },
            {
                name: 'get_womens_college_basketball_team',
                description: 'Get specific women\'s college basketball team',
                inputSchema: {
                    type: 'object',
                    properties: {
                        team: { type: 'string', description: 'Team abbreviation' },
                    },
                    required: ['team'],
                },
            },
            {
                name: 'get_mens_college_basketball_scores',
                description: 'Get men\'s college basketball scores',
                inputSchema: { type: 'object', properties: {} },
            },
            {
                name: 'get_mens_college_basketball_news',
                description: 'Get men\'s college basketball news',
                inputSchema: { type: 'object', properties: {} },
            },
            {
                name: 'get_mens_college_basketball_teams',
                description: 'Get all men\'s college basketball teams',
                inputSchema: { type: 'object', properties: {} },
            },
            {
                name: 'get_mens_college_basketball_team',
                description: 'Get specific men\'s college basketball team',
                inputSchema: {
                    type: 'object',
                    properties: {
                        team: { type: 'string', description: 'Team abbreviation' },
                    },
                    required: ['team'],
                },
            },
            {
                name: 'get_soccer_scores',
                description: 'Get soccer scores for a league',
                inputSchema: {
                    type: 'object',
                    properties: {
                        league: { type: 'string', description: 'League abbreviation' },
                    },
                    required: ['league'],
                },
            },
            {
                name: 'get_soccer_news',
                description: 'Get soccer news for a league',
                inputSchema: {
                    type: 'object',
                    properties: {
                        league: { type: 'string', description: 'League abbreviation' },
                    },
                    required: ['league'],
                },
            },
            {
                name: 'get_soccer_teams',
                description: 'Get all soccer teams for a league',
                inputSchema: {
                    type: 'object',
                    properties: {
                        league: { type: 'string', description: 'League abbreviation' },
                    },
                    required: ['league'],
                },
            },
            {
                name: 'get_college_football_news',
                description: 'Get college football news',
                inputSchema: { type: 'object', properties: {} },
            },
            {
                name: 'get_college_football_scores',
                description: 'Get college football scores',
                inputSchema: { type: 'object', properties: {} },
            },
            {
                name: 'get_college_football_game_info',
                description: 'Get college football game information',
                inputSchema: {
                    type: 'object',
                    properties: {
                        gameId: { type: 'string', description: 'Game ID' },
                    },
                    required: ['gameId'],
                },
            },
            {
                name: 'get_college_football_team_info',
                description: 'Get college football team information',
                inputSchema: {
                    type: 'object',
                    properties: {
                        team: { type: 'string', description: 'Team abbreviation' },
                    },
                    required: ['team'],
                },
            },
            {
                name: 'get_college_football_rankings',
                description: 'Get college football rankings',
                inputSchema: { type: 'object', properties: {} },
            },
            {
                name: 'get_nfl_standings',
                description: 'Get NFL standings',
                inputSchema: { type: 'object', properties: {} },
            },
            {
                name: 'get_nba_standings',
                description: 'Get NBA standings',
                inputSchema: { type: 'object', properties: {} },
            },
            {
                name: 'get_mlb_standings',
                description: 'Get MLB standings',
                inputSchema: { type: 'object', properties: {} },
            },
            {
                name: 'get_nhl_standings',
                description: 'Get NHL standings',
                inputSchema: { type: 'object', properties: {} },
            },
            {
                name: 'get_nfl_player_stats',
                description: 'Get NFL player statistics',
                inputSchema: {
                    type: 'object',
                    properties: {
                        player: { type: 'string', description: 'Player ID' },
                    },
                    required: ['player'],
                },
            },
            {
                name: 'get_nba_player_stats',
                description: 'Get NBA player statistics',
                inputSchema: {
                    type: 'object',
                    properties: {
                        player: { type: 'string', description: 'Player ID' },
                    },
                    required: ['player'],
                },
            },
            {
                name: 'get_mlb_player_stats',
                description: 'Get MLB player statistics',
                inputSchema: {
                    type: 'object',
                    properties: {
                        player: { type: 'string', description: 'Player ID' },
                    },
                    required: ['player'],
                },
            },
            {
                name: 'get_nhl_player_stats',
                description: 'Get NHL player statistics',
                inputSchema: {
                    type: 'object',
                    properties: {
                        player: { type: 'string', description: 'Player ID' },
                    },
                    required: ['player'],
                },
            },
            {
                name: 'get_nfl_player_props',
                description: 'Get NFL player props',
                inputSchema: {
                    type: 'object',
                    properties: {
                        player: { type: 'string', description: 'Player name or ID' },
                    },
                    required: ['player'],
                },
            },
        ));
    }
    ;
}
this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    let response;
    try {
        let content = '';
        switch (name) {
            case 'get_nfl_scores':
                response = await this.axiosInstance.get('/football/nfl/scoreboard');
                break;
            case 'get_nfl_news':
                response = await this.axiosInstance.get('/football/nfl/news');
                break;
            case 'get_nfl_teams':
                response = await this.axiosInstance.get('/football/nfl/teams');
                break;
            case 'get_nfl_team':
                response = await this.axiosInstance.get(`/football/nfl/teams/${args?.team}`);
                break;
            case 'get_mlb_scores':
                response = await this.axiosInstance.get('/baseball/mlb/scoreboard');
                break;
            case 'get_mlb_news':
                response = await this.axiosInstance.get('/baseball/mlb/news');
                break;
            case 'get_mlb_teams':
                response = await this.axiosInstance.get('/baseball/mlb/teams');
                break;
            case 'get_mlb_team':
                response = await this.axiosInstance.get(`/baseball/mlb/teams/${args?.team}`);
                break;
            case 'get_college_baseball_scores':
                response = await this.axiosInstance.get('/baseball/college-baseball/scoreboard');
                break;
            case 'get_nhl_scores':
                response = await this.axiosInstance.get('/hockey/nhl/scoreboard');
                break;
            case 'get_nhl_news':
                response = await this.axiosInstance.get('/hockey/nhl/news');
                break;
            case 'get_nhl_teams':
                response = await this.axiosInstance.get('/hockey/nhl/teams');
                break;
            case 'get_nhl_team':
                response = await this.axiosInstance.get(`/hockey/nhl/teams/${args?.team}`);
                break;
            case 'get_nba_scores':
                response = await this.axiosInstance.get('/basketball/nba/scoreboard');
                break;
            case 'get_nba_news':
                response = await this.axiosInstance.get('/basketball/nba/news');
                break;
            case 'get_nba_teams':
                response = await this.axiosInstance.get('/basketball/nba/teams');
                break;
            case 'get_nba_team':
                response = await this.axiosInstance.get(`/basketball/nba/teams/${args?.team}`);
                break;
            case 'get_wnba_scores':
                response = await this.axiosInstance.get('/basketball/wnba/scoreboard');
                break;
            case 'get_wnba_news':
                response = await this.axiosInstance.get('/basketball/wnba/news');
                break;
            case 'get_wnba_teams':
                response = await this.axiosInstance.get('/basketball/wnba/teams');
                break;
            case 'get_wnba_team':
                response = await this.axiosInstance.get(`/basketball/wnba/teams/${args?.team}`);
                break;
            case 'get_womens_college_basketball_scores':
                response = await this.axiosInstance.get('/basketball/womens-college-basketball/scoreboard');
                break;
            case 'get_womens_college_basketball_news':
                response = await this.axiosInstance.get('/basketball/womens-college-basketball/news');
                break;
            case 'get_womens_college_basketball_teams':
                response = await this.axiosInstance.get('/basketball/womens-college-basketball/teams');
                break;
            case 'get_womens_college_basketball_team':
                response = await this.axiosInstance.get(`/basketball/womens-college-basketball/teams/${args?.team}`);
                break;
            case 'get_mens_college_basketball_scores':
                response = await this.axiosInstance.get('/basketball/mens-college-basketball/scoreboard');
                break;
            case 'get_mens_college_basketball_news':
                response = await this.axiosInstance.get('/basketball/mens-college-basketball/news');
                break;
            case 'get_mens_college_basketball_teams':
                response = await this.axiosInstance.get('/basketball/mens-college-basketball/teams');
                break;
            case 'get_mens_college_basketball_team':
                response = await this.axiosInstance.get(`/basketball/mens-college-basketball/teams/${args?.team}`);
                break;
            case 'get_soccer_scores':
                response = await this.axiosInstance.get(`/soccer/${args?.league}/scoreboard`);
                break;
            case 'get_soccer_news':
                response = await this.axiosInstance.get(`/soccer/${args?.league}/news`);
                break;
            case 'get_soccer_teams':
                response = await this.axiosInstance.get(`/soccer/${args?.league}/teams`);
                break;
            case 'get_college_football_news':
                response = await this.axiosInstance.get('/football/college-football/news');
                break;
            case 'get_college_football_scores':
                response = await this.axiosInstance.get('/football/college-football/scoreboard');
                break;
            case 'get_college_football_game_info':
                response = await this.axiosInstance.get(`/football/college-football/summary?event=${args?.gameId}`);
                break;
            case 'get_college_football_team_info':
                response = await this.axiosInstance.get(`/football/college-football/teams/${args?.team}`);
                break;
            case 'get_college_football_rankings':
                response = await this.axiosInstance.get('/football/college-football/rankings');
                break;
            case 'get_nfl_standings':
                response = await this.axiosInstance.get('/football/nfl/standings');
                content = createMarkdownTitle('Standings', 'NFL');
                response.data.standings.forEach((div) => {
                    content += formatStandings(div);
                });
                break;
            case 'get_nba_standings':
                response = await this.axiosInstance.get('/basketball/nba/standings');
                content = createMarkdownTitle('Standings', 'NBA');
                if (response.data.groups) {
                    response.data.groups.forEach((group) => {
                        content += formatStandings({
                            name: group.name,
                            teams: group.standings.entries.map((entry) => ({
                                name: entry.team.name,
                                record: {
                                    wins: entry.stats.find((s) => s.name === 'wins')?.value || 0,
                                    losses: entry.stats.find((s) => s.name === 'losses')?.value || 0,
                                    percentage: entry.stats.find((s) => s.name === 'winPercent')?.value || 0,
                                    gamesBack: entry.stats.find((s) => s.name === 'gamesBack')?.value || '-',
                                    last10: `${entry.stats.find((s) => s.name === 'last10Wins')?.value || 0}-${entry.stats.find((s) => s.name === 'last10Losses')?.value || 0}`,
                                    streak: entry.stats.find((s) => s.name === 'streak')?.value || '-'
                                }
                            }))
                        });
                    });
                }
                break;
            case 'get_mlb_standings':
                response = await this.axiosInstance.get('/baseball/mlb/standings');
                content = createMarkdownTitle('Standings', 'MLB');
                if (response.data.groups) {
                    response.data.groups.forEach((group) => {
                        content += formatStandings({
                            name: group.name,
                            teams: group.standings.entries.map((entry) => ({
                                name: entry.team.name,
                                record: {
                                    wins: entry.stats.find((s) => s.name === 'wins')?.value || 0,
                                    losses: entry.stats.find((s) => s.name === 'losses')?.value || 0,
                                    percentage: entry.stats.find((s) => s.name === 'winPercent')?.value || 0,
                                    gamesBack: entry.stats.find((s) => s.name === 'gamesBack')?.value || '-',
                                    last10: `${entry.stats.find((s) => s.name === 'last10Wins')?.value || 0}-${entry.stats.find((s) => s.name === 'last10Losses')?.value || 0}`,
                                    streak: entry.stats.find((s) => s.name === 'streak')?.value || '-'
                                }
                            }))
                        });
                    });
                }
                break;
            case 'get_nhl_standings':
                response = await this.axiosInstance.get('/hockey/nhl/standings');
                content = createMarkdownTitle('Standings', 'NHL');
                if (response.data.groups) {
                    response.data.groups.forEach((group) => {
                        content += formatStandings({
                            name: group.name,
                            teams: group.standings.entries.map((entry) => ({
                                name: entry.team.name,
                                record: {
                                    wins: entry.stats.find((s) => s.name === 'wins')?.value || 0,
                                    losses: entry.stats.find((s) => s.name === 'losses')?.value || 0,
                                    percentage: entry.stats.find((s) => s.name === 'winPercent')?.value || 0,
                                    gamesBack: entry.stats.find((s) => s.name === 'gamesBack')?.value || '-',
                                    last10: `${entry.stats.find((s) => s.name === 'last10Wins')?.value || 0}-${entry.stats.find((s) => s.name === 'last10Losses')?.value || 0}`,
                                    streak: entry.stats.find((s) => s.name === 'streak')?.value || '-'
                                }
                            }))
                        });
                    });
                }
                break;
            case 'get_nfl_player_stats':
                response = await this.axiosInstance.get(`/football/nfl/athletes/${args?.player}/stats`);
                content = createMarkdownTitle('Player Statistics', 'NFL');
                content += formatPlayerStats(response.data);
                break;
            case 'get_nba_player_stats':
                response = await this.axiosInstance.get(`/basketball/nba/athletes/${args?.player}/stats`);
                content = createMarkdownTitle('Player Statistics', 'NBA');
                content += formatPlayerStats(response.data);
                break;
            case 'get_mlb_player_stats':
                response = await this.axiosInstance.get(`/baseball/mlb/athletes/${args?.player}/stats`);
                content = createMarkdownTitle('Player Statistics', 'MLB');
                content += formatPlayerStats(response.data);
                break;
            case 'get_nhl_player_stats':
                response = await this.axiosInstance.get(`/hockey/nhl/athletes/${args?.player}/stats`);
                content = createMarkdownTitle('Player Statistics', 'NHL');
                content += formatPlayerStats(response.data);
                break;
            case 'get_nfl_player_props':
                response = await this.axiosInstance.get(`/football/nfl/players/${args?.player}/props`);
                content = createMarkdownTitle('Player Props', 'NFL');
                content += response.data.props.map((prop) => formatPlayerProps(prop)).join('\n');
                return {
                    content: [
                        {
                            type: 'text',
                            text: content + '\n\nExported to: ' + exportToMarkdown(content, 'props', 'NFL'),
                        },
                    ],
                };
            default:
                throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
        }
        // Extract league name from the tool name
        const league = name.split('_')[1]?.toUpperCase() || 'SPORTS';
        const type = name.split('_')[2] || 'data';
        // Create markdown content based on the response type
        content = createMarkdownTitle(type, league);
        if (name.includes('scores')) {
            content += response.data.events.map((event) => formatScore(event)).join('\n\n');
        }
        else if (name.includes('news')) {
            content += response.data.articles.map((article) => formatNews(article)).join('\n\n');
        }
        else if (name.includes('team') && !name.includes('teams')) {
            content += formatTeam(response.data.team);
        }
        else if (name.includes('teams')) {
            content += response.data.sports[0].leagues[0].teams
                .map((team) => formatTeam(team.team))
                .join('\n\n');
        }
        else if (name.includes('rankings')) {
            content += response.data.rankings[0].ranks
                .map((rank) => formatRanking(rank))
                .join('\n\n');
        }
        // Only export to markdown if save is true
        if (args?.save) {
            const markdownPath = exportToMarkdown(content, type, league);
            return {
                content: [
                    {
                        type: 'text',
                        text: content + '\n\nExported to: ' + markdownPath,
                    },
                ],
            };
        }
        return {
            content: [
                {
                    type: 'text',
                    text: content,
                },
            ],
        };
    }
    catch (error) {
        if (axios.isAxiosError(error)) {
            return {
                content: [
                    {
                        type: 'text',
                        text: `ESPN API error: ${error.response?.data.message ?? error.message}`,
                    },
                ],
                isError: true,
            };
        }
        throw error;
    }
});
async;
run();
{
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('ESPN MCP server running on stdio');
}
const server = new EspnServer();
server.run().catch(console.error);
