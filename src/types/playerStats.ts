/**
 * Player career stats and match history types.
 */

import type { DocumentSnapshot } from 'firebase/firestore';
import type { Match } from './match';

/** Scope for career stats: all-time, season, or recent (last 10 matches). */
export type StatsScope = 'all-time' | 'season' | 'recent';

/** Aggregated batting and bowling career stats for a player. */
export interface PlayerCareerStats {
  batting: {
    matches: number;
    innings: number;
    runs: number;
    highScore: number;
    average: number;
    strikeRate: number;
    fifties: number;
    hundreds: number;
    fours: number;
    sixes: number;
  };
  bowling: {
    matches: number;
    innings: number;
    overs: number;
    runs: number;
    wickets: number;
    average: number;
    economy: number;
    bestFigures: string;
    fiveWickets: number;
  };
}

/** Result of getMatchesForPlayer: matches and optional cursor for next page. */
export interface GetMatchesForPlayerResult {
  matches: (Match & { id: string })[];
  lastDoc: DocumentSnapshot | null;
}

/** Display line for a single batting or bowling performance in a match. */
export interface PlayerPerformanceInMatch {
  batting?: { runs: number; balls: number };
  bowling?: { overs: number; balls: number; runs: number; wickets: number };
}
