/**
 * Shared tool handlers to eliminate code duplication
 * Provides a single source of truth for all ESPN MCP tool implementations
 */

import type {
  GetScoresParams,
  GetTeamParams,
  GetNewsParams,
  ESPNScoreboard,
  ESPNNewsResponse,
  ESPNTeamsResponse,
  ESPNStandingsResponse,
  ESPNRankingsResponse,
  ESPNGameSummary,
  ESPNAthletesResponse,
} from '../types/espn-api.js';
import { ValidationError } from '../utils/errors.js';
import { logToolCall, logToolResult, PerformanceTimer } from '../utils/logger.js';
import type { ModernESPNClient } from '../client/espn-client.js';

// ============================================================================
// Tool Handler Class
// ============================================================================

/**
 * Centralized tool handlers for ESPN MCP Server
 * Eliminates duplication between STDIO and HTTP handlers
 */
export class ESPNToolHandlers {
  constructor(private client: ModernESPNClient) {}

  /**
   * Handle get_live_scores tool
   */
  async handleGetLiveScores(args: GetScoresParams): Promise<{
    content: Array<{ type: 'text'; text: string }>;
    isError?: boolean;
  }> {
    const timer = new PerformanceTimer('get_live_scores');
    logToolCall('get_live_scores', args);

    try {
      // Validate arguments
      this.validateScoresArgs(args);

      const { sport, league, dates, week, seasontype } = args;
      let data: ESPNScoreboard;

      // Route to appropriate client method based on sport/league
      switch (sport) {
        case 'football':
          if (league === 'nfl') {
            data = await this.client.getNFLScores({ dates, week, seasontype });
          } else if (league === 'college-football') {
            data = await this.client.getCollegeFootballScores({ dates });
          } else {
            data = await this.client.getScoreboard(sport, league);
          }
          break;

        case 'basketball':
          if (league === 'nba') {
            data = await this.client.getNBAScores();
          } else if (league === 'wnba') {
            data = await this.client.getWNBAScores();
          } else if (league === 'mens-college-basketball') {
            data = await this.client.getMensCollegeBasketballScores();
          } else if (league === 'womens-college-basketball') {
            data = await this.client.getWomensCollegeBasketballScores();
          } else {
            data = await this.client.getScoreboard(sport, league);
          }
          break;

        case 'baseball':
          if (league === 'mlb') {
            data = await this.client.getMLBScores();
          } else if (league === 'college-baseball') {
            data = await this.client.getCollegeBaseballScores();
          } else {
            data = await this.client.getScoreboard(sport, league);
          }
          break;

        case 'hockey':
          if (league === 'nhl') {
            data = await this.client.getNHLScores();
          } else {
            data = await this.client.getScoreboard(sport, league);
          }
          break;

        case 'soccer':
          if (league === 'mls') {
            data = await this.client.getMLSScores();
          } else if (league === 'premier-league') {
            data = await this.client.getPremierLeagueScores();
          } else if (league === 'champions-league') {
            data = await this.client.getChampionsLeagueScores();
          } else if (league) {
            data = await this.client.getSoccerScores(league);
          } else {
            data = await this.client.getScoreboard(sport, league);
          }
          break;

        default:
          data = await this.client.getScoreboard(sport, league);
      }

      const duration = timer.end(true);
      logToolResult('get_live_scores', true, duration);

      return {
        content: [{
          type: 'text',
          text: `Live scores for ${sport}${league ? ` (${league})` : ''}:\n\n${JSON.stringify(data, null, 2)}`,
        }],
      };
    } catch (error) {
      const duration = timer.end(false);
      logToolResult('get_live_scores', false, duration);

      return {
        content: [{
          type: 'text',
          text: `Error getting live scores: ${error instanceof Error ? error.message : String(error)}`,
        }],
        isError: true,
      };
    }
  }

  /**
   * Handle get_team_information tool
   */
  async handleGetTeamInformation(args: GetTeamParams): Promise<{
    content: Array<{ type: 'text'; text: string }>;
    isError?: boolean;
  }> {
    const timer = new PerformanceTimer('get_team_information');
    logToolCall('get_team_information', args);

    try {
      const { sport, league } = args;
      let data: ESPNTeamsResponse;

      // Route to appropriate client method
      switch (sport) {
        case 'football':
          if (league === 'nfl') {
            data = await this.client.getNFLTeams();
          } else if (league === 'college-football') {
            data = await this.client.getCollegeFootballTeams();
          } else {
            data = await this.client.getTeams(sport, league);
          }
          break;

        case 'basketball':
          if (league === 'nba') {
            data = await this.client.getNBATeams();
          } else if (league === 'wnba') {
            data = await this.client.getWNBATeams();
          } else if (league === 'mens-college-basketball') {
            data = await this.client.getMensCollegeBasketballTeams();
          } else if (league === 'womens-college-basketball') {
            data = await this.client.getWomensCollegeBasketballTeams();
          } else {
            data = await this.client.getTeams(sport, league);
          }
          break;

        case 'baseball':
          if (league === 'mlb') {
            data = await this.client.getMLBTeams();
          } else if (league === 'college-baseball') {
            data = await this.client.getCollegeBaseballTeams();
          } else {
            data = await this.client.getTeams(sport, league);
          }
          break;

        case 'hockey':
          if (league === 'nhl') {
            data = await this.client.getNHLTeams();
          } else {
            data = await this.client.getTeams(sport, league);
          }
          break;

        case 'soccer':
          if (league) {
            data = await this.client.getSoccerTeams(league);
          } else {
            data = await this.client.getTeams(sport, league);
          }
          break;

        default:
          data = await this.client.getTeams(sport, league);
      }

      const duration = timer.end(true);
      logToolResult('get_team_information', true, duration);

      return {
        content: [{
          type: 'text',
          text: `Team information for ${sport}${league ? ` (${league})` : ''}:\n\n${JSON.stringify(data, null, 2)}`,
        }],
      };
    } catch (error) {
      const duration = timer.end(false);
      logToolResult('get_team_information', false, duration);

      return {
        content: [{
          type: 'text',
          text: `Error getting team information: ${error instanceof Error ? error.message : String(error)}`,
        }],
        isError: true,
      };
    }
  }

  /**
   * Handle get_specific_team tool
   */
  async handleGetSpecificTeam(args: GetTeamParams & { team: string }): Promise<{
    content: Array<{ type: 'text'; text: string }>;
    isError?: boolean;
  }> {
    const timer = new PerformanceTimer('get_specific_team');
    logToolCall('get_specific_team', args);

    try {
      const { sport, league, team } = args;

      if (!team) {
        throw new ValidationError('Team abbreviation is required', 'team', team);
      }

      let data: any;

      // Route to appropriate client method
      switch (sport) {
        case 'football':
          if (league === 'college-football') {
            data = await this.client.getCollegeFootballTeam(team);
          } else if (league === 'nfl') {
            data = await this.client.getNFLTeam(team);
          } else {
            data = await this.client.getTeamDetails(sport, league!, team);
          }
          break;

        case 'basketball':
          if (league === 'nba') {
            data = await this.client.getNBATeam(team);
          } else if (league === 'wnba') {
            data = await this.client.getWNBATeam(team);
          } else if (league === 'mens-college-basketball') {
            data = await this.client.getMensCollegeBasketballTeam(team);
          } else if (league === 'womens-college-basketball') {
            data = await this.client.getWomensCollegeBasketballTeam(team);
          } else {
            data = await this.client.getTeamDetails(sport, league!, team);
          }
          break;

        case 'baseball':
          if (league === 'mlb') {
            data = await this.client.getMLBTeam(team);
          } else if (league === 'college-baseball') {
            data = await this.client.getCollegeBaseballTeam(team);
          } else {
            data = await this.client.getTeamDetails(sport, league!, team);
          }
          break;

        case 'hockey':
          if (league === 'nhl') {
            data = await this.client.getNHLTeam(team);
          } else {
            data = await this.client.getTeamDetails(sport, league!, team);
          }
          break;

        case 'soccer':
          if (league) {
            data = await this.client.getSoccerTeam(league, team);
          } else {
            data = await this.client.getTeamDetails(sport, league!, team);
          }
          break;

        default:
          data = await this.client.getTeamDetails(sport, league!, team);
      }

      const duration = timer.end(true);
      logToolResult('get_specific_team', true, duration);

      return {
        content: [{
          type: 'text',
          text: `Team information for ${team} in ${sport} (${league}):\n\n${JSON.stringify(data, null, 2)}`,
        }],
      };
    } catch (error) {
      const duration = timer.end(false);
      logToolResult('get_specific_team', false, duration);

      return {
        content: [{
          type: 'text',
          text: `Error getting specific team: ${error instanceof Error ? error.message : String(error)}`,
        }],
        isError: true,
      };
    }
  }

  /**
   * Handle get_league_standings tool
   */
  async handleGetLeagueStandings(args: { sport: string; league?: string }): Promise<{
    content: Array<{ type: 'text'; text: string }>;
    isError?: boolean;
  }> {
    const timer = new PerformanceTimer('get_league_standings');
    logToolCall('get_league_standings', args);

    try {
      const { sport, league } = args;
      const data: ESPNStandingsResponse = await this.client.getStandings(sport, league);

      const duration = timer.end(true);
      logToolResult('get_league_standings', true, duration);

      return {
        content: [{
          type: 'text',
          text: `Standings for ${sport}${league ? ` (${league})` : ''}:\n\n${JSON.stringify(data, null, 2)}`,
        }],
      };
    } catch (error) {
      const duration = timer.end(false);
      logToolResult('get_league_standings', false, duration);

      return {
        content: [{
          type: 'text',
          text: `Error getting standings: ${error instanceof Error ? error.message : String(error)}`,
        }],
        isError: true,
      };
    }
  }

  /**
   * Handle get_sports_news tool
   */
  async handleGetSportsNews(args: GetNewsParams): Promise<{
    content: Array<{ type: 'text'; text: string }>;
    isError?: boolean;
  }> {
    const timer = new PerformanceTimer('get_sports_news');
    logToolCall('get_sports_news', args);

    try {
      const { sport, limit = 10 } = args;
      let data: any;

      if (!sport) {
        // General news
        data = await this.client.getNews();
      } else {
        // Sport-specific news
        switch (sport) {
          case 'football': {
            const [nflNews, cfbNews] = await Promise.all([
              this.client.getNFLNews().catch(() => null),
              this.client.getCollegeFootballNews().catch(() => null),
            ]);
            data = { nfl: nflNews, collegefootball: cfbNews };
            break;
          }

          case 'basketball': {
            const [nbaNews, wnbaNews, mensCbbNews, womensCbbNews] = await Promise.all([
              this.client.getNBANews().catch(() => null),
              this.client.getWNBANews().catch(() => null),
              this.client.getMensCollegeBasketballNews().catch(() => null),
              this.client.getWomensCollegeBasketballNews().catch(() => null),
            ]);
            data = {
              nba: nbaNews,
              wnba: wnbaNews,
              menscollege: mensCbbNews,
              womenscollege: womensCbbNews,
            };
            break;
          }

          case 'baseball':
            data = await this.client.getMLBNews();
            break;

          case 'hockey':
            data = await this.client.getNHLNews();
            break;

          case 'soccer': {
            const [premierLeagueNews, mlsNews, championsLeagueNews, laLigaNews] = await Promise.all([
              this.client.getSoccerNews('eng.1').catch(() => null),
              this.client.getSoccerNews('usa.1').catch(() => null),
              this.client.getSoccerNews('uefa.champions').catch(() => null),
              this.client.getSoccerNews('esp.1').catch(() => null),
            ]);
            data = {
              premierLeague: premierLeagueNews,
              mls: mlsNews,
              championsLeague: championsLeagueNews,
              laLiga: laLigaNews,
            };
            break;
          }

          default:
            data = await this.client.getNews(sport);
        }
      }

      const duration = timer.end(true);
      logToolResult('get_sports_news', true, duration);

      return {
        content: [{
          type: 'text',
          text: `Sports news${sport ? ` for ${sport}` : ''}:\n\n${JSON.stringify(data, null, 2)}`,
        }],
      };
    } catch (error) {
      const duration = timer.end(false);
      logToolResult('get_sports_news', false, duration);

      return {
        content: [{
          type: 'text',
          text: `Error getting sports news: ${error instanceof Error ? error.message : String(error)}`,
        }],
        isError: true,
      };
    }
  }

  /**
   * Handle search_athletes tool
   */
  async handleSearchAthletes(args: { sport: string; league?: string }): Promise<{
    content: Array<{ type: 'text'; text: string }>;
    isError?: boolean;
  }> {
    const timer = new PerformanceTimer('search_athletes');
    logToolCall('search_athletes', args);

    try {
      const { sport, league } = args;
      const data: ESPNAthletesResponse = await this.client.getAthletes(sport, league);

      const duration = timer.end(true);
      logToolResult('search_athletes', true, duration);

      return {
        content: [{
          type: 'text',
          text: `Athletes for ${sport}${league ? ` (${league})` : ''}:\n\n${JSON.stringify(data, null, 2)}`,
        }],
      };
    } catch (error) {
      const duration = timer.end(false);
      logToolResult('search_athletes', false, duration);

      return {
        content: [{
          type: 'text',
          text: `Error searching athletes: ${error instanceof Error ? error.message : String(error)}`,
        }],
        isError: true,
      };
    }
  }

  /**
   * Handle get_college_football_rankings tool
   */
  async handleGetCollegeFootballRankings(): Promise<{
    content: Array<{ type: 'text'; text: string }>;
    isError?: boolean;
  }> {
    const timer = new PerformanceTimer('get_college_football_rankings');
    logToolCall('get_college_football_rankings', {});

    try {
      const data: ESPNRankingsResponse = await this.client.getCollegeFootballRankings();

      const duration = timer.end(true);
      logToolResult('get_college_football_rankings', true, duration);

      return {
        content: [{
          type: 'text',
          text: `College Football Rankings:\n\n${JSON.stringify(data, null, 2)}`,
        }],
      };
    } catch (error) {
      const duration = timer.end(false);
      logToolResult('get_college_football_rankings', false, duration);

      return {
        content: [{
          type: 'text',
          text: `Error getting rankings: ${error instanceof Error ? error.message : String(error)}`,
        }],
        isError: true,
      };
    }
  }

  /**
   * Handle get_game_summary tool
   */
  async handleGetGameSummary(args: {
    sport: string;
    league: string;
    gameId: string;
  }): Promise<{
    content: Array<{ type: 'text'; text: string }>;
    isError?: boolean;
  }> {
    const timer = new PerformanceTimer('get_game_summary');
    logToolCall('get_game_summary', args);

    try {
      const { sport, league, gameId } = args;

      if (sport === 'football' && league === 'college-football') {
        const data: ESPNGameSummary = await this.client.getCollegeFootballGameSummary(gameId);

        const duration = timer.end(true);
        logToolResult('get_game_summary', true, duration);

        return {
          content: [{
            type: 'text',
            text: `Game Summary for ${gameId}:\n\n${JSON.stringify(data, null, 2)}`,
          }],
        };
      }

      throw new ValidationError('Game summary only supported for college football currently');
    } catch (error) {
      const duration = timer.end(false);
      logToolResult('get_game_summary', false, duration);

      return {
        content: [{
          type: 'text',
          text: `Error getting game summary: ${error instanceof Error ? error.message : String(error)}`,
        }],
        isError: true,
      };
    }
  }

  // ============================================================================
  // Validation Helpers
  // ============================================================================

  private validateScoresArgs(args: GetScoresParams): void {
    if (!args.sport) {
      throw new ValidationError('Sport is required', 'sport', args.sport);
    }

    // Validate date format if provided
    if (args.dates && !/^\d{8}$/.test(args.dates)) {
      throw new ValidationError(
        'Date must be in YYYYMMDD format',
        'dates',
        args.dates
      );
    }

    // Validate week number for NFL
    if (args.week) {
      const week = parseInt(args.week);
      if (isNaN(week) || week < 1 || week > 18) {
        throw new ValidationError(
          'Week must be a number between 1 and 18',
          'week',
          args.week
        );
      }
    }

    // Validate season type
    if (args.seasontype && !['1', '2', '3'].includes(args.seasontype)) {
      throw new ValidationError(
        'Season type must be 1 (preseason), 2 (regular), or 3 (postseason)',
        'seasontype',
        args.seasontype
      );
    }
  }
}
