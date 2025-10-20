/**
 * TypeScript type definitions for ESPN API responses
 * Provides type safety and IntelliSense support throughout the codebase
 */

import { z } from 'zod';

// ============================================================================
// Base Types
// ============================================================================

export interface ESPNTeam {
  id: string;
  uid: string;
  slug: string;
  location: string;
  name: string;
  displayName: string;
  abbreviation: string;
  shortDisplayName?: string;
  color?: string;
  alternateColor?: string;
  isActive?: boolean;
  logos?: Array<{
    href: string;
    alt?: string;
    rel?: string[];
    width: number;
    height: number;
  }>;
  links?: ESPNLink[];
}

export interface ESPNLink {
  language?: string;
  rel: string[];
  href: string;
  text: string;
  shortText?: string;
  isExternal: boolean;
  isPremium: boolean;
}

export interface ESPNVenue {
  id: string;
  fullName: string;
  address: {
    city: string;
    state?: string;
    country?: string;
  };
  capacity?: number;
  indoor?: boolean;
}

// ============================================================================
// Scoreboard Types
// ============================================================================

export interface ESPNCompetitor {
  id: string;
  uid: string;
  type: string;
  order: number;
  homeAway: 'home' | 'away';
  team: ESPNTeam;
  score: string;
  linescores?: Array<{
    value: number;
  }>;
  statistics?: any[];
  leaders?: any[];
  winner?: boolean;
  records?: Array<{
    name: string;
    abbreviation?: string;
    type: string;
    summary: string;
  }>;
}

export interface ESPNCompetition {
  id: string;
  uid: string;
  date: string;
  attendance?: number;
  type: {
    id: string;
    abbreviation: string;
  };
  timeValid: boolean;
  neutralSite: boolean;
  conferenceCompetition: boolean;
  playByPlayAvailable: boolean;
  recent: boolean;
  venue?: ESPNVenue;
  competitors: ESPNCompetitor[];
  notes?: any[];
  status: ESPNStatus;
  broadcasts?: Array<{
    market: string;
    names: string[];
  }>;
  leaders?: any[];
  format?: {
    regulation: {
      periods: number;
    };
  };
  startDate?: string;
  geoBroadcasts?: any[];
  headlines?: any[];
}

export interface ESPNStatus {
  clock: number;
  displayClock: string;
  period: number;
  type: {
    id: string;
    name: string;
    state: string;
    completed: boolean;
    description: string;
    detail: string;
    shortDetail: string;
  };
}

export interface ESPNEvent {
  id: string;
  uid: string;
  date: string;
  name: string;
  shortName: string;
  season: {
    year: number;
    type: number;
    slug: string;
  };
  competitions: ESPNCompetition[];
  links?: ESPNLink[];
  weather?: any;
  status: ESPNStatus;
}

export interface ESPNScoreboard {
  leagues: Array<{
    id: string;
    uid: string;
    name: string;
    abbreviation: string;
    slug: string;
    season: {
      year: number;
      startDate: string;
      endDate: string;
      displayName: string;
      type: {
        id: string;
        type: number;
        name: string;
        abbreviation: string;
      };
    };
    logos?: any[];
    calendarType: string;
    calendarIsWhitelist: boolean;
    calendarStartDate: string;
    calendarEndDate: string;
  }>;
  season: {
    type: number;
    year: number;
  };
  week?: {
    number: number;
  };
  events: ESPNEvent[];
}

// ============================================================================
// News Types
// ============================================================================

export interface ESPNArticle {
  id: number;
  headline: string;
  description: string;
  published: string;
  type: string;
  premium?: boolean;
  links: {
    api?: {
      news?: {
        href: string;
      };
      self?: {
        href: string;
      };
    };
    web: {
      href: string;
      short?: {
        href: string;
      };
    };
    mobile?: {
      href: string;
    };
  };
  lastModified?: string;
  categories?: Array<{
    id: number;
    description: string;
    type: string;
    sportId: number;
    leagueId?: number;
    league?: {
      id: number;
      description: string;
      links: {
        api?: {
          leagues: {
            href: string;
          };
        };
        web?: {
          leagues: {
            href: string;
          };
        };
        mobile?: {
          leagues: {
            href: string;
          };
        };
      };
    };
    uid?: string;
    createDate?: string;
    teamId?: number;
    team?: any;
    athleteId?: number;
    athlete?: any;
    topicId?: number;
    guid?: string;
  }>;
  keywords?: string[];
  nowId?: string;
  related?: any[];
  allowSearch?: boolean;
  linkText?: string;
  byline?: string;
  images?: Array<{
    name: string;
    id: number;
    credit?: string;
    type: string;
    url: string;
    caption?: string;
    alt?: string;
  }>;
}

export interface ESPNNewsResponse {
  header?: string;
  link?: {
    language: string;
    rel: string[];
    href: string;
    text: string;
    shortText: string;
    isExternal: boolean;
    isPremium: boolean;
  };
  articles: ESPNArticle[];
  resultsOffset: number;
  resultsLimit: number;
  resultsCount: number;
}

// ============================================================================
// Teams Types
// ============================================================================

export interface ESPNTeamDetails extends ESPNTeam {
  venue?: ESPNVenue;
  groups?: {
    id: string;
    parent: {
      id: string;
    };
    isConference: boolean;
  };
  rank?: number;
  statistics?: any[];
  leaders?: any[];
  links?: ESPNLink[];
  injuries?: any[];
  notes?: any[];
  againstTheSpreadRecords?: any[];
  oddsRecords?: any[];
  franchise?: {
    id: string;
    uid: string;
    slug: string;
    location: string;
    name: string;
    abbreviation: string;
    displayName: string;
    shortDisplayName: string;
    color: string;
    isActive: boolean;
    venue: ESPNVenue;
  };
  nextEvent?: any[];
  standingSummary?: string;
  record?: {
    items: Array<{
      description: string;
      type: string;
      summary: string;
      stats: Array<{
        name: string;
        value: number;
      }>;
    }>;
  };
}

export interface ESPNTeamsResponse {
  sports: Array<{
    id: string;
    uid: string;
    name: string;
    slug: string;
    leagues: Array<{
      id: string;
      uid: string;
      name: string;
      abbreviation: string;
      shortName: string;
      slug: string;
      teams: Array<{
        team: ESPNTeamDetails;
      }>;
      year: number;
      season: {
        year: number;
        displayName: string;
      };
    }>;
  }>;
}

// ============================================================================
// Standings Types
// ============================================================================

export interface ESPNStandingsEntry {
  team: ESPNTeam;
  stats: Array<{
    name: string;
    displayName: string;
    shortDisplayName: string;
    description: string;
    abbreviation: string;
    type: string;
    value: number;
    displayValue: string;
  }>;
}

export interface ESPNStandingsGroup {
  id?: string;
  name: string;
  abbreviation?: string;
  standings: {
    entries: ESPNStandingsEntry[];
  };
}

export interface ESPNStandingsResponse {
  uid: string;
  id: string;
  name: string;
  abbreviation: string;
  standings?: any;
  children?: ESPNStandingsGroup[];
  groups?: ESPNStandingsGroup[];
  message?: string;
  fullViewLink?: string;
  recommendation?: string;
  sport?: string;
  league?: string;
  alternativeEndpoint?: string;
}

// ============================================================================
// Rankings Types (College Football)
// ============================================================================

export interface ESPNRankingTeam {
  id: string;
  uid: string;
  location: string;
  name: string;
  abbreviation: string;
  displayName: string;
  shortDisplayName: string;
  logo: string;
  logos?: Array<{
    href: string;
    alt: string;
    rel: string[];
    width: number;
    height: number;
  }>;
}

export interface ESPNRank {
  current: number;
  previous?: number;
  points?: number;
  firstPlaceVotes?: number;
  trend?: string;
  recordSummary?: string;
  team: ESPNRankingTeam;
}

export interface ESPNRankings {
  id: string;
  name: string;
  shortName: string;
  headline: string;
  ranks: ESPNRank[];
}

export interface ESPNRankingsResponse {
  rankings: ESPNRankings[];
}

// ============================================================================
// Athlete Types
// ============================================================================

export interface ESPNAthlete {
  id: string;
  uid: string;
  guid: string;
  type?: string;
  firstName: string;
  lastName: string;
  fullName: string;
  displayName: string;
  shortName: string;
  weight?: number;
  displayWeight?: string;
  height?: number;
  displayHeight?: string;
  age?: number;
  dateOfBirth?: string;
  birthPlace?: {
    city?: string;
    state?: string;
    country?: string;
  };
  citizenship?: string;
  slug?: string;
  jersey?: string;
  position?: {
    id: string;
    name: string;
    displayName: string;
    abbreviation: string;
  };
  team?: ESPNTeam;
  headshot?: {
    href: string;
    alt?: string;
  };
  links?: ESPNLink[];
  statistics?: any;
  status?: {
    id: string;
    name: string;
    type: string;
    abbreviation: string;
  };
}

export interface ESPNAthletesResponse {
  athletes: Array<ESPNAthlete & { team: ESPNTeam }>;
  count: number;
  sport: string;
  league?: string;
}

// ============================================================================
// Game Summary Types
// ============================================================================

export interface ESPNGameSummary {
  boxscore?: {
    teams: any[];
    players: any[];
  };
  format?: any;
  gameInfo?: {
    venue?: ESPNVenue;
    attendance?: number;
    officials?: any[];
    temperature?: any;
  };
  drives?: any;
  leaders?: any[];
  plays?: any[];
  winprobability?: any[];
  scoringPlays?: any[];
  standings?: any;
  odds?: any[];
  predictor?: any;
  pickcenter?: any[];
  againstTheSpread?: any[];
  header?: any;
  broadcasts?: any[];
  competitions?: ESPNCompetition[];
}

// ============================================================================
// Zod Validation Schemas
// ============================================================================

export const TeamSchema = z.object({
  id: z.string(),
  name: z.string(),
  displayName: z.string(),
  abbreviation: z.string(),
  location: z.string().optional(),
  color: z.string().optional(),
  alternateColor: z.string().optional(),
});

export const CompetitorSchema = z.object({
  id: z.string(),
  homeAway: z.enum(['home', 'away']),
  team: TeamSchema,
  score: z.string().optional(),
  winner: z.boolean().optional(),
});

export const StatusSchema = z.object({
  displayClock: z.string().optional(),
  type: z.object({
    id: z.string(),
    name: z.string(),
    state: z.string(),
    completed: z.boolean(),
    description: z.string(),
    detail: z.string().optional(),
    shortDetail: z.string().optional(),
  }),
});

export const CompetitionSchema = z.object({
  id: z.string(),
  competitors: z.array(CompetitorSchema),
  status: StatusSchema,
  venue: z.object({
    fullName: z.string(),
    address: z.object({
      city: z.string(),
      state: z.string().optional(),
    }).optional(),
  }).optional(),
  broadcasts: z.array(z.object({
    names: z.array(z.string()),
  })).optional(),
});

export const EventSchema = z.object({
  id: z.string(),
  date: z.string(),
  name: z.string(),
  shortName: z.string().optional(),
  competitions: z.array(CompetitionSchema),
  status: StatusSchema,
});

export const ScoreboardSchema = z.object({
  events: z.array(EventSchema),
  leagues: z.array(z.any()).optional(),
  season: z.any().optional(),
  week: z.any().optional(),
});

export const ArticleSchema = z.object({
  id: z.number(),
  headline: z.string(),
  description: z.string(),
  published: z.string(),
  premium: z.boolean().optional(),
  byline: z.string().optional(),
  links: z.object({
    web: z.object({
      href: z.string(),
    }),
  }),
});

export const NewsResponseSchema = z.object({
  articles: z.array(ArticleSchema),
  resultsCount: z.number().optional(),
  resultsLimit: z.number().optional(),
});

// ============================================================================
// Type Guards
// ============================================================================

export function isESPNScoreboard(data: any): data is ESPNScoreboard {
  try {
    ScoreboardSchema.parse(data);
    return true;
  } catch {
    return false;
  }
}

export function isESPNNewsResponse(data: any): data is ESPNNewsResponse {
  try {
    NewsResponseSchema.parse(data);
    return true;
  } catch {
    return false;
  }
}

// ============================================================================
// Helper Types
// ============================================================================

export type Sport = 'football' | 'basketball' | 'baseball' | 'hockey' | 'soccer' | 'tennis' | 'golf';

export type League =
  | 'nfl'
  | 'college-football'
  | 'nba'
  | 'wnba'
  | 'mens-college-basketball'
  | 'womens-college-basketball'
  | 'mlb'
  | 'college-baseball'
  | 'nhl'
  | 'mls'
  | 'premier-league'
  | 'champions-league';

export type SeasonType = '1' | '2' | '3'; // 1=preseason, 2=regular, 3=postseason

export interface GetScoresParams {
  sport: Sport;
  league?: League;
  dates?: string; // YYYYMMDD
  week?: string;
  seasontype?: SeasonType;
}

export interface GetTeamParams {
  sport: Sport;
  league?: League;
  team?: string;
}

export interface GetNewsParams {
  sport?: Sport;
  limit?: number;
}
