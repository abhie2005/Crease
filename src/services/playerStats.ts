import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '@/firebase/config';
import { Match, BallEvent } from '@/models/Match';

export type StatsScope = 'all-time' | 'season' | 'recent';

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

/**
 * Get career statistics for a player
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
 * Get career stats for multiple players in parallel
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
