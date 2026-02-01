/**
 * Player career stats aggregation from completed matches (all-time, season, recent).
 * Used by upcoming match stats and player profile.
 */

import { collection, query, where, getDocs, orderBy, limit, startAfter, DocumentSnapshot } from 'firebase/firestore';
import { db } from '@/firebase/config';
import { Match, BallEvent } from '@/models/Match';

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
    bestFigures: string; // e.g., "3/25"
    fiveWickets: number;
  };
}

/**
 * Get all completed matches from Firestore
 */
const getCompletedMatches = async (scope: StatsScope, playerUid: string): Promise<Match[]> => {
  const matchesRef = collection(db, 'matches');
  
  let q = query(
    matchesRef,
    where('status', '==', 'completed')
  );
  
  // For recent, limit to last 10 matches
  if (scope === 'recent') {
    q = query(q, orderBy('updatedAt', 'desc'), limit(10));
  } else {
    // For all-time and season, get all completed matches
    q = query(q, orderBy('updatedAt', 'desc'));
  }
  
  const snapshot = await getDocs(q);
  const matches: Match[] = [];
  
  snapshot.forEach(doc => {
    const matchData = doc.data() as Match;
    // Only include matches where the player participated
    const isInTeamA = matchData.teamA.playerUids.includes(playerUid);
    const isInTeamB = matchData.teamB.playerUids.includes(playerUid);
    
    if (isInTeamA || isInTeamB) {
      matches.push({ ...matchData, id: doc.id } as any);
    }
  });
  
  return matches;
};

/**
 * Calculate batting stats from a match for a specific player
 */
const calculatePlayerBattingInMatch = (match: Match, playerUid: string) => {
  let runs = 0;
  let balls = 0;
  let fours = 0;
  let sixes = 0;
  let batted = false;
  
  // Check both innings
  const innings = [match.teamAInnings, match.teamBInnings];
  
  innings.forEach(inningsData => {
    if (inningsData && inningsData.ballEvents) {
      inningsData.ballEvents.forEach(ball => {
        if (ball.batsmanUid === playerUid) {
          batted = true;
          runs += ball.runs;
          if (!ball.isWide && !ball.isNoBall) {
            balls++;
          }
          if (ball.runs === 4) fours++;
          if (ball.runs === 6) sixes++;
        }
      });
    }
  });
  
  return { runs, balls, fours, sixes, batted };
};

/**
 * Calculate bowling stats from a match for a specific player
 */
const calculatePlayerBowlingInMatch = (match: Match, playerUid: string) => {
  let overs = 0;
  let balls = 0;
  let runs = 0;
  let wickets = 0;
  let bowled = false;
  
  // Check both innings
  const innings = [match.teamAInnings, match.teamBInnings];
  
  innings.forEach(inningsData => {
    if (inningsData && inningsData.bowlers) {
      const bowler = inningsData.bowlers.find(b => b.uid === playerUid);
      if (bowler) {
        bowled = true;
        overs += bowler.overs;
        balls += bowler.balls;
        runs += bowler.runs;
        wickets += bowler.wickets;
      }
    }
  });
  
  return { overs, balls, runs, wickets, bowled };
};

/** Result of getMatchesForPlayer: matches and optional cursor for next page. */
export interface GetMatchesForPlayerResult {
  matches: (Match & { id: string })[];
  lastDoc: DocumentSnapshot | null;
}

/**
 * Fetches completed matches in which the player participated (for recently played / match history).
 * @param playerUid - Player UID
 * @param options - limit (default 20), optional calendar year, optional cursor for pagination
 * @returns Matches (with id) and lastDoc for load-more
 */
export const getMatchesForPlayer = async (
  playerUid: string,
  options?: { limit?: number; year?: number; startAfter?: DocumentSnapshot }
): Promise<GetMatchesForPlayerResult> => {
  const { limit: limitCount = 20, year, startAfter: startAfterDoc } = options ?? {};
  const matchesRef = collection(db, 'matches');

  let q = query(
    matchesRef,
    where('status', '==', 'completed'),
    orderBy('updatedAt', 'desc'),
    limit(100)
  );
  if (startAfterDoc) {
    q = query(q, startAfter(startAfterDoc));
  }

  const snapshot = await getDocs(q);
  const all: (Match & { id: string })[] = [];

  snapshot.forEach((docSnap) => {
    const matchData = docSnap.data() as Match;
    const isInTeamA = matchData.teamA?.playerUids?.includes(playerUid);
    const isInTeamB = matchData.teamB?.playerUids?.includes(playerUid);
    if (isInTeamA || isInTeamB) {
      const matchWithId = { ...matchData, id: docSnap.id } as Match & { id: string };
      if (year !== undefined) {
        const updatedAt = matchData.updatedAt;
        const matchYear = updatedAt?.toDate?.()?.getFullYear?.() ?? new Date().getFullYear();
        if (matchYear === year) {
          all.push(matchWithId);
        }
      } else {
        all.push(matchWithId);
      }
    }
  });

  const hasMore = snapshot.docs.length >= 100;
  const lastDoc = hasMore ? snapshot.docs[snapshot.docs.length - 1] : null;
  const matches = all.slice(0, limitCount);
  return { matches, lastDoc };
};

/** Display line for a single batting or bowling performance in a match. */
export interface PlayerPerformanceInMatch {
  batting?: { runs: number; balls: number };
  bowling?: { overs: number; balls: number; runs: number; wickets: number };
}

/**
 * Returns one player's batting and/or bowling performance in a match (for pinned display).
 * @param match - Match document (with teamAInnings, teamBInnings)
 * @param playerUid - Player UID
 * @returns Batting (runs, balls) and/or bowling (overs, balls, runs, wickets) if they played
 */
export const getPlayerPerformanceInMatch = (
  match: Match,
  playerUid: string
): PlayerPerformanceInMatch => {
  const battingData = calculatePlayerBattingInMatch(match, playerUid);
  const bowlingData = calculatePlayerBowlingInMatch(match, playerUid);
  const result: PlayerPerformanceInMatch = {};
  if (battingData.batted) {
    result.batting = { runs: battingData.runs, balls: battingData.balls };
  }
  if (bowlingData.bowled) {
    result.bowling = {
      overs: bowlingData.overs,
      balls: bowlingData.balls,
      runs: bowlingData.runs,
      wickets: bowlingData.wickets
    };
  }
  return result;
};

/**
 * Fetches career batting and bowling stats for a player from completed matches.
 * @param playerUid - Player UID
 * @param scope - all-time, season, or recent (default all-time)
 * @returns Aggregated career stats
 */
export const getPlayerCareerStats = async (
  playerUid: string,
  scope: StatsScope = 'all-time'
): Promise<PlayerCareerStats> => {
  const matches = await getCompletedMatches(scope, playerUid);
  
  // Initialize stats
  const stats: PlayerCareerStats = {
    batting: {
      matches: 0,
      innings: 0,
      runs: 0,
      highScore: 0,
      average: 0,
      strikeRate: 0,
      fifties: 0,
      hundreds: 0,
      fours: 0,
      sixes: 0
    },
    bowling: {
      matches: 0,
      innings: 0,
      overs: 0,
      runs: 0,
      wickets: 0,
      average: 0,
      economy: 0,
      bestFigures: '0/0',
      fiveWickets: 0
    }
  };
  
  let totalBalls = 0;
  let battingInnings = 0;
  let bowlingInnings = 0;
  let bestBowlingWickets = 0;
  let bestBowlingRuns = 999;
  
  // Process each match
  matches.forEach(match => {
    // Batting stats
    const battingData = calculatePlayerBattingInMatch(match, playerUid);
    if (battingData.batted) {
      battingInnings++;
      stats.batting.runs += battingData.runs;
      totalBalls += battingData.balls;
      stats.batting.fours += battingData.fours;
      stats.batting.sixes += battingData.sixes;
      
      if (battingData.runs > stats.batting.highScore) {
        stats.batting.highScore = battingData.runs;
      }
      
      if (battingData.runs >= 50 && battingData.runs < 100) {
        stats.batting.fifties++;
      } else if (battingData.runs >= 100) {
        stats.batting.hundreds++;
      }
    }
    
    // Bowling stats
    const bowlingData = calculatePlayerBowlingInMatch(match, playerUid);
    if (bowlingData.bowled) {
      bowlingInnings++;
      stats.bowling.overs += bowlingData.overs;
      const extraBalls = bowlingData.balls / 6;
      stats.bowling.runs += bowlingData.runs;
      stats.bowling.wickets += bowlingData.wickets;
      
      // Check for best figures
      if (bowlingData.wickets > bestBowlingWickets || 
          (bowlingData.wickets === bestBowlingWickets && bowlingData.runs < bestBowlingRuns)) {
        bestBowlingWickets = bowlingData.wickets;
        bestBowlingRuns = bowlingData.runs;
      }
      
      // Check for 5-wicket haul
      if (bowlingData.wickets >= 5) {
        stats.bowling.fiveWickets++;
      }
    }
  });
  
  // Set match and innings counts
  stats.batting.matches = matches.length;
  stats.batting.innings = battingInnings;
  stats.bowling.matches = matches.length;
  stats.bowling.innings = bowlingInnings;
  
  // Calculate derived stats
  if (battingInnings > 0) {
    stats.batting.average = parseFloat((stats.batting.runs / battingInnings).toFixed(2));
  }
  
  if (totalBalls > 0) {
    stats.batting.strikeRate = parseFloat(((stats.batting.runs / totalBalls) * 100).toFixed(2));
  }
  
  if (stats.bowling.wickets > 0) {
    stats.bowling.average = parseFloat((stats.bowling.runs / stats.bowling.wickets).toFixed(2));
  }
  
  if (stats.bowling.overs > 0) {
    stats.bowling.economy = parseFloat((stats.bowling.runs / stats.bowling.overs).toFixed(2));
  }
  
  stats.bowling.bestFigures = `${bestBowlingWickets}/${bestBowlingRuns === 999 ? 0 : bestBowlingRuns}`;
  
  return stats;
};

/**
 * Fetches career stats for multiple players in parallel.
 * @param playerUids - Array of player UIDs
 * @param scope - all-time, season, or recent (default all-time)
 * @returns Map of uid to PlayerCareerStats (skips failed fetches)
 */
export const getMultiplePlayersCareerStats = async (
  playerUids: string[],
  scope: StatsScope = 'all-time'
): Promise<Record<string, PlayerCareerStats>> => {
  const statsPromises = playerUids.map(uid => 
    getPlayerCareerStats(uid, scope).catch(error => {
      console.error(`Error fetching stats for player ${uid}:`, error);
      return null;
    })
  );
  
  const results = await Promise.all(statsPromises);
  
  const statsMap: Record<string, PlayerCareerStats> = {};
  playerUids.forEach((uid, index) => {
    if (results[index]) {
      statsMap[uid] = results[index]!;
    }
  });
  
  return statsMap;
};
