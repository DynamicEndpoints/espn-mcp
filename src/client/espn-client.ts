/**
 * Refactored ESPN API Client with improved organization and error handling
 */

import { EventEmitter } from 'events';
import type { Config } from '../config/index.js';
import { getSportTtl } from '../config/index.js';
import { EnhancedCache } from '../utils/cache.js';
import {
  ESPNAPIError,
  TimeoutError,
  withRetry,
  CircuitBreaker,
  isRetryableError,
} from '../utils/errors.js';
import {
  logger,
  logAPIRequest,
  logAPIResponse,
  PerformanceTimer,
} from '../utils/logger.js';
import type {
  ESPNScoreboard,
  ESPNNewsResponse,
  ESPNTeamsResponse,
  ESPNStandingsResponse,
  ESPNRankingsResponse,
  ESPNGameSummary,
  ESPNAthletesResponse,
} from '../types/espn-api.js';
import {
  ScoreboardSchema,
  NewsResponseSchema,
} from '../types/espn-api.js';

// ============================================================================
// ModernESPNClient
// ============================================================================

/**
 * Modern ESPN API client with comprehensive error handling and caching
 */
export class ModernESPNClient extends EventEmitter {
  // Class properties
  private cache: EnhancedCache;
  private baseUrl: string;
  private requestTimeout: number;
  private circuitBreaker: CircuitBreaker;

  constructor(private config: Config) {
    super();

    // Initialize cache
    this.cache = new EnhancedCache(
      config.cache.defaultTtl,
      config.cache.maxSize,
      config.cache.maxMemory
    );

    // Initialize configuration
    this.baseUrl = config.espn.baseUrl;
    this.requestTimeout = config.espn.requestTimeout;

    // Initialize circuit breaker
    this.circuitBreaker = new CircuitBreaker('espn-api', {
      failureThreshold: 5,
      successThreshold: 2,
      timeout: 60000,
      onStateChange: (from, to) => {
        logger.warn({
          type: 'circuit_breaker_state_change',
          from,
          to,
        }, `Circuit breaker state changed: ${from} -> ${to}`);
        this.emit('circuitBreakerStateChange', from, to);
      },
    });

    // Forward cache events
    this.cache.on('hit', (key) => this.emit('cacheHit', key));
    this.cache.on('miss', (key) => this.emit('cacheMiss', key));
    this.cache.on('set', (key, value) => this.emit('cacheSet', key, value));
    this.cache.on('evict', (key, value) => this.emit('cacheEvict', key, value));

    logger.debug({
      type: 'espn_client_init',
      baseUrl: this.baseUrl,
      cacheSize: config.cache.maxSize,
      timeout: this.requestTimeout,
    }, 'ESPN client initialized');
  }

  // ============================================================================
  // Core Fetch Methods
  // ============================================================================

  /**
   * Fetch data from ESPN API with retry and circuit breaker
   */
  async fetchData(
    endpoint: string,
    options: {
      signal?: AbortSignal;
      validateSchema?: any;
      ttl?: number;
    } = {}
  ): Promise<any> {
    const { signal, validateSchema, ttl } = options;

    // Determine TTL based on endpoint
    const cacheTtl = ttl || this.getTtlForEndpoint(endpoint);

    // Try cache first
    return this.cache.get(
      endpoint,
      async () => {
        // Use circuit breaker
        return this.circuitBreaker.execute(async () => {
          // Use retry logic
          return withRetry(
            async () => this.performFetch(endpoint, signal, validateSchema),
            {
              maxRetries: this.config.espn.maxRetries,
              baseDelay: this.config.espn.retryDelay,
              onRetry: (error, attempt) => {
                logger.warn({
                  type: 'api_retry',
                  endpoint,
                  attempt,
                  error: error.message,
                }, `Retrying ESPN API request (attempt ${attempt})`);
              },
            }
          );
        });
      },
      cacheTtl
    );
  }

  /**
   * Perform the actual fetch request
   */
  private async performFetch(
    endpoint: string,
    signal?: AbortSignal,
    validateSchema?: any
  ): Promise<any> {
    const timer = new PerformanceTimer('espn_api_request');
    const url = `${this.baseUrl}${endpoint}`;

    logAPIRequest(endpoint);

    // Create abort controller with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.requestTimeout);

    // Use provided signal if available
    if (signal) {
      signal.addEventListener('abort', () => controller.abort());
    }

    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'ESPN-MCP-Server/2.0',
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip, deflate',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const duration = timer.getDuration();
      logAPIResponse(endpoint, response.status, duration);

      // Handle non-OK responses
      if (!response.ok) {
        throw new ESPNAPIError(
          `ESPN API error: ${response.status} ${response.statusText}`,
          response.status,
          endpoint,
          ESPNAPIError.isRetryable(response.status)
        );
      }

      // Parse JSON
      const data = await response.json();

      // Validate schema if provided
      if (validateSchema) {
        try {
          validateSchema.parse(data);
        } catch (error) {
          logger.warn({
            type: 'schema_validation_failed',
            endpoint,
            error,
          }, 'Schema validation failed, but continuing with data');
        }
      }

      timer.end(true);
      return data;
    } catch (error) {
      clearTimeout(timeoutId);
      timer.end(false);

      // Handle abort errors
      if (error instanceof Error && error.name === 'AbortError') {
        throw new TimeoutError(
          `ESPN API request timeout after ${this.requestTimeout}ms`,
          this.requestTimeout
        );
      }

      // Re-throw ESPN API errors
      if (error instanceof ESPNAPIError) {
        throw error;
      }

      // Wrap other errors
      throw new ESPNAPIError(
        `ESPN API request failed: ${error instanceof Error ? error.message : String(error)}`,
        0,
        endpoint,
        true // Network errors are retryable
      );
    }
  }

  /**
   * Determine TTL based on endpoint
   */
  private getTtlForEndpoint(endpoint: string): number {
    // Extract sport from endpoint
    const parts = endpoint.split('/');
    const sport = parts[1] || 'default';

    return getSportTtl(sport, this.config);
  }

  // ============================================================================
  // Generic Sport Methods
  // ============================================================================

  async getScoreboard(sport: string, league?: string): Promise<ESPNScoreboard> {
    const leagueParam = league ? `/${league}` : '';
    return this.fetchData(`/${sport}${leagueParam}/scoreboard`, {
      validateSchema: ScoreboardSchema,
    });
  }

  async getTeams(sport: string, league?: string): Promise<ESPNTeamsResponse> {
    const leagueParam = league ? `/${league}` : '';
    return this.fetchData(`/${sport}${leagueParam}/teams`);
  }

  async getStandings(sport: string, league?: string): Promise<ESPNStandingsResponse> {
    try {
      const leagueParam = league ? `/${league}` : '';
      const standingsData = await this.fetchData(`/${sport}${leagueParam}/standings`);

      // Check if we got minimal response (just a link)
      if (standingsData?.fullViewLink && !standingsData.standings) {
        return {
          ...standingsData,
          message: 'ESPN API provides limited standings data via this endpoint',
          recommendation: 'Use the fullViewLink to access complete standings on ESPN\'s website',
          sport,
          league,
          alternativeEndpoint: `/${sport}${leagueParam}/teams can provide team information`,
        };
      }

      return standingsData;
    } catch (error) {
      logger.error({
        type: 'standings_error',
        sport,
        league,
        error,
      }, 'Error fetching standings');
      throw error;
    }
  }

  async getNews(sport?: string): Promise<ESPNNewsResponse> {
    const sportParam = sport ? `/${sport}` : '';
    return this.fetchData(`${sportParam}/news`, {
      validateSchema: NewsResponseSchema,
    });
  }

  async getAthletes(sport: string, league?: string): Promise<ESPNAthletesResponse> {
    try {
      const leagueParam = league ? `/${league}` : '';
      const teamsData = await this.fetchData(`/${sport}${leagueParam}/teams`);

      if (!teamsData?.sports?.[0]?.leagues?.[0]?.teams) {
        throw new ESPNAPIError('No teams found', 404, `/${sport}${leagueParam}/teams`);
      }

      const teams = teamsData.sports[0].leagues[0].teams;
      const allAthletes: any[] = [];

      // Get roster for each team (in parallel with concurrency limit)
      const CONCURRENCY = 5;
      for (let i = 0; i < teams.length; i += CONCURRENCY) {
        const batch = teams.slice(i, i + CONCURRENCY);

        const results = await Promise.allSettled(
          batch.map(async (teamData: any) => {
            const rosterData = await this.fetchData(
              `/${sport}${leagueParam}/teams/${teamData.team.id}/roster`
            );

            if (rosterData?.athletes) {
              return rosterData.athletes.map((athlete: any) => ({
                ...athlete,
                team: {
                  id: teamData.team.id,
                  name: teamData.team.displayName,
                  abbreviation: teamData.team.abbreviation,
                },
              }));
            }
            return [];
          })
        );

        results.forEach((result) => {
          if (result.status === 'fulfilled') {
            allAthletes.push(...result.value);
          }
        });
      }

      return {
        athletes: allAthletes,
        count: allAthletes.length,
        sport,
        league,
      };
    } catch (error) {
      logger.error({
        type: 'athletes_error',
        sport,
        league,
        error,
      }, 'Error fetching athletes');
      throw error;
    }
  }

  async getTeamDetails(sport: string, league: string, team: string): Promise<any> {
    return this.fetchData(`/${sport}/${league}/teams/${team}`);
  }

  // ============================================================================
  // NFL Methods
  // ============================================================================

  async getNFLNews(): Promise<ESPNNewsResponse> {
    return this.fetchData('/football/nfl/news', {
      validateSchema: NewsResponseSchema,
    });
  }

  async getNFLScores(params: {
    dates?: string;
    week?: string;
    seasontype?: string;
  } = {}): Promise<ESPNScoreboard> {
    let url = '/football/nfl/scoreboard';
    const queryParams: string[] = [];

    if (params.seasontype) queryParams.push(`seasontype=${params.seasontype}`);
    if (params.week) queryParams.push(`week=${params.week}`);
    if (params.dates) queryParams.push(`dates=${params.dates}`);

    if (queryParams.length > 0) {
      url += '?' + queryParams.join('&');
    }

    return this.fetchData(url, { validateSchema: ScoreboardSchema });
  }

  async getNFLTeams(): Promise<ESPNTeamsResponse> {
    return this.fetchData('/football/nfl/teams');
  }

  async getNFLTeam(team: string): Promise<any> {
    return this.fetchData(`/football/nfl/teams/${team}`);
  }

  // ============================================================================
  // College Football Methods
  // ============================================================================

  async getCollegeFootballNews(): Promise<ESPNNewsResponse> {
    return this.fetchData('/football/college-football/news', {
      validateSchema: NewsResponseSchema,
    });
  }

  async getCollegeFootballScores(params: {
    calendar?: string;
    dates?: string;
  } = {}): Promise<ESPNScoreboard> {
    let url = '/football/college-football/scoreboard';
    const queryParams: string[] = [];

    if (params.calendar) queryParams.push(`calendar=${params.calendar}`);
    if (params.dates) queryParams.push(`dates=${params.dates}`);

    if (queryParams.length > 0) {
      url += '?' + queryParams.join('&');
    }

    return this.fetchData(url, { validateSchema: ScoreboardSchema });
  }

  async getCollegeFootballGameSummary(gameId: string): Promise<ESPNGameSummary> {
    return this.fetchData(`/football/college-football/summary?event=${gameId}`);
  }

  async getCollegeFootballTeam(team: string): Promise<any> {
    return this.fetchData(`/football/college-football/teams/${team}`);
  }

  async getCollegeFootballTeams(): Promise<ESPNTeamsResponse> {
    return this.fetchData('/football/college-football/teams');
  }

  async getCollegeFootballRankings(): Promise<ESPNRankingsResponse> {
    return this.fetchData('/football/college-football/rankings');
  }

  // ============================================================================
  // NBA Methods
  // ============================================================================

  async getNBAScores(): Promise<ESPNScoreboard> {
    return this.fetchData('/basketball/nba/scoreboard', {
      validateSchema: ScoreboardSchema,
    });
  }

  async getNBANews(): Promise<ESPNNewsResponse> {
    return this.fetchData('/basketball/nba/news', {
      validateSchema: NewsResponseSchema,
    });
  }

  async getNBATeams(): Promise<ESPNTeamsResponse> {
    return this.fetchData('/basketball/nba/teams');
  }

  async getNBATeam(team: string): Promise<any> {
    return this.fetchData(`/basketball/nba/teams/${team}`);
  }

  // ============================================================================
  // WNBA Methods
  // ============================================================================

  async getWNBAScores(): Promise<ESPNScoreboard> {
    return this.fetchData('/basketball/wnba/scoreboard', {
      validateSchema: ScoreboardSchema,
    });
  }

  async getWNBANews(): Promise<ESPNNewsResponse> {
    return this.fetchData('/basketball/wnba/news', {
      validateSchema: NewsResponseSchema,
    });
  }

  async getWNBATeams(): Promise<ESPNTeamsResponse> {
    return this.fetchData('/basketball/wnba/teams');
  }

  async getWNBATeam(team: string): Promise<any> {
    return this.fetchData(`/basketball/wnba/teams/${team}`);
  }

  // ============================================================================
  // College Basketball Methods
  // ============================================================================

  async getMensCollegeBasketballScores(): Promise<ESPNScoreboard> {
    return this.fetchData('/basketball/mens-college-basketball/scoreboard', {
      validateSchema: ScoreboardSchema,
    });
  }

  async getMensCollegeBasketballNews(): Promise<ESPNNewsResponse> {
    return this.fetchData('/basketball/mens-college-basketball/news', {
      validateSchema: NewsResponseSchema,
    });
  }

  async getMensCollegeBasketballTeams(): Promise<ESPNTeamsResponse> {
    return this.fetchData('/basketball/mens-college-basketball/teams');
  }

  async getMensCollegeBasketballTeam(team: string): Promise<any> {
    return this.fetchData(`/basketball/mens-college-basketball/teams/${team}`);
  }

  async getWomensCollegeBasketballScores(): Promise<ESPNScoreboard> {
    return this.fetchData('/basketball/womens-college-basketball/scoreboard', {
      validateSchema: ScoreboardSchema,
    });
  }

  async getWomensCollegeBasketballNews(): Promise<ESPNNewsResponse> {
    return this.fetchData('/basketball/womens-college-basketball/news', {
      validateSchema: NewsResponseSchema,
    });
  }

  async getWomensCollegeBasketballTeams(): Promise<ESPNTeamsResponse> {
    return this.fetchData('/basketball/womens-college-basketball/teams');
  }

  async getWomensCollegeBasketballTeam(team: string): Promise<any> {
    return this.fetchData(`/basketball/womens-college-basketball/teams/${team}`);
  }

  // ============================================================================
  // MLB Methods
  // ============================================================================

  async getMLBScores(): Promise<ESPNScoreboard> {
    return this.fetchData('/baseball/mlb/scoreboard', {
      validateSchema: ScoreboardSchema,
    });
  }

  async getMLBNews(): Promise<ESPNNewsResponse> {
    return this.fetchData('/baseball/mlb/news', {
      validateSchema: NewsResponseSchema,
    });
  }

  async getMLBTeams(): Promise<ESPNTeamsResponse> {
    return this.fetchData('/baseball/mlb/teams');
  }

  async getMLBTeam(team: string): Promise<any> {
    return this.fetchData(`/baseball/mlb/teams/${team}`);
  }

  async getCollegeBaseballScores(): Promise<ESPNScoreboard> {
    return this.fetchData('/baseball/college-baseball/scoreboard', {
      validateSchema: ScoreboardSchema,
    });
  }

  async getCollegeBaseballTeam(team: string): Promise<any> {
    return this.fetchData(`/baseball/college-baseball/teams/${team}`);
  }

  async getCollegeBaseballTeams(): Promise<ESPNTeamsResponse> {
    return this.fetchData('/baseball/college-baseball/teams');
  }

  // ============================================================================
  // NHL Methods
  // ============================================================================

  async getNHLScores(): Promise<ESPNScoreboard> {
    return this.fetchData('/hockey/nhl/scoreboard', {
      validateSchema: ScoreboardSchema,
    });
  }

  async getNHLNews(): Promise<ESPNNewsResponse> {
    return this.fetchData('/hockey/nhl/news', {
      validateSchema: NewsResponseSchema,
    });
  }

  async getNHLTeams(): Promise<ESPNTeamsResponse> {
    return this.fetchData('/hockey/nhl/teams');
  }

  async getNHLTeam(team: string): Promise<any> {
    return this.fetchData(`/hockey/nhl/teams/${team}`);
  }

  // ============================================================================
  // Soccer Methods
  // ============================================================================

  async getSoccerScores(league: string): Promise<ESPNScoreboard> {
    return this.fetchData(`/soccer/${league}/scoreboard`, {
      validateSchema: ScoreboardSchema,
    });
  }

  async getMLSScores(): Promise<ESPNScoreboard> {
    return this.fetchData('/soccer/usa.1/scoreboard', {
      validateSchema: ScoreboardSchema,
    });
  }

  async getPremierLeagueScores(): Promise<ESPNScoreboard> {
    return this.fetchData('/soccer/eng.1/scoreboard', {
      validateSchema: ScoreboardSchema,
    });
  }

  async getChampionsLeagueScores(): Promise<ESPNScoreboard> {
    return this.fetchData('/soccer/uefa.champions/scoreboard', {
      validateSchema: ScoreboardSchema,
    });
  }

  async getSoccerNews(league: string): Promise<ESPNNewsResponse> {
    return this.fetchData(`/soccer/${league}/news`, {
      validateSchema: NewsResponseSchema,
    });
  }

  async getSoccerTeams(league: string): Promise<ESPNTeamsResponse> {
    return this.fetchData(`/soccer/${league}/teams`);
  }

  async getSoccerTeam(league: string, team: string): Promise<any> {
    return this.fetchData(`/soccer/${league}/teams/${team}`);
  }

  // ============================================================================
  // Cache Management
  // ============================================================================

  getCacheStats() {
    return this.cache.getStats();
  }

  clearCache(): void {
    this.cache.clear();
    logger.info({ type: 'cache_cleared' }, 'ESPN client cache cleared');
  }

  invalidateCache(pattern: string): number {
    const count = this.cache.deletePattern(pattern);
    logger.info({
      type: 'cache_invalidated',
      pattern,
      count,
    }, `Invalidated ${count} cache entries matching pattern: ${pattern}`);
    return count;
  }

  // ============================================================================
  // Lifecycle
  // ============================================================================

  async destroy(): Promise<void> {
    logger.info({ type: 'espn_client_destroy' }, 'Destroying ESPN client');

    this.cache.destroy();
    this.removeAllListeners();

    // Reset circuit breaker
    this.circuitBreaker.reset();
  }
}
