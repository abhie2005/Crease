/**
 * Derived match statistics: batting, bowling, partnerships, fall of wickets, extras, over summary.
 * Used by match stats UI components.
 */

import { InningsScore, BallEvent, Batsman, Bowler } from '@/models/Match';

/** Batting stats for one player in an innings. */
export interface BattingStats {
  uid: string;
  runs: number;
  balls: number;
  strikeRate: number;
  fours: number;
  sixes: number;
  dots: number;
  isOut: boolean;
}

/** Bowling stats for one bowler in an innings. */
export interface BowlingStats {
  uid: string;
  overs: number;
  balls: number;
  runs: number;
  wickets: number;
  economy: number;
  dots: number;
  wides: number;
  noBalls: number;
  maidens: number;
}

/** Partnership between two batsmen. */
export interface Partnership {
  runs: number;
  wicketNumber: number;
  batsman1Uid: string;
  batsman2Uid: string;
  batsman1Runs: number;
  batsman2Runs: number;
  balls: number;
}

/** Fall of wicket entry (score, overs, batsman). */
export interface FallOfWicket {
  wicketNumber: number;
  score: number;
  overs: number;
  balls: number;
  batsmanUid: string;
}

/** Extras breakdown (wides, no-balls, total). */
export interface ExtrasBreakdown {
  wides: number;
  noBalls: number;
  total: number;
}

/** Runs and wickets per over. */
export interface OverSummary {
  overNumber: number;
  runs: number;
  wickets: number;
}

/**
 * Calculates batting statistics for a player from innings data.
 * @param innings - Innings score and ball events
 * @param playerUid - Player UID
 * @param currentBatsmen - Current batsmen (for live innings)
 * @returns Batting stats
 */
export const calculateBattingStats = (
  innings: InningsScore,
  playerUid: string,
  currentBatsmen: Batsman[]
): BattingStats => {
  // Check if player is currently batting
  const currentBatsman = currentBatsmen.find(b => b.uid === playerUid);
  
  if (currentBatsman) {
    // Calculate stats from current batsman data and ball events
    let fours = 0;
    let sixes = 0;
    let dots = 0;
    
    innings.ballEvents.forEach(ball => {
      if (ball.batsmanUid === playerUid) {
        if (ball.runs === 4) fours++;
        if (ball.runs === 6) sixes++;
        if (ball.runs === 0 || ball.isDot) dots++;
      }
    });
    
    const strikeRate = currentBatsman.balls > 0 
      ? (currentBatsman.runs / currentBatsman.balls) * 100 
      : 0;
    
    return {
      uid: playerUid,
      runs: currentBatsman.runs,
      balls: currentBatsman.balls,
      strikeRate: parseFloat(strikeRate.toFixed(2)),
      fours,
      sixes,
      dots,
      isOut: false
    };
  }
  
  // Calculate from ball events for players who got out or completed batting
  let runs = 0;
  let balls = 0;
  let fours = 0;
  let sixes = 0;
  let dots = 0;
  let isOut = false;
  
  innings.ballEvents.forEach(ball => {
    if (ball.batsmanUid === playerUid) {
      runs += ball.runs;
      // Only count as a ball if it's not a wide or no-ball
      if (!ball.isWide && !ball.isNoBall) {
        balls++;
      }
      if (ball.runs === 4) fours++;
      if (ball.runs === 6) sixes++;
      if ((ball.runs === 0 || ball.isDot) && !ball.isWide && !ball.isNoBall) dots++;
      if (ball.isWicket) isOut = true;
    }
  });
  
  const strikeRate = balls > 0 ? (runs / balls) * 100 : 0;
  
  return {
    uid: playerUid,
    runs,
    balls,
    strikeRate: parseFloat(strikeRate.toFixed(2)),
    fours,
    sixes,
    dots,
    isOut
  };
};

/**
 * Calculates bowling statistics for a bowler from innings data.
 * @param innings - Innings score and bowlers
 * @param bowlerUid - Bowler UID
 * @returns Bowling stats
 */
export const calculateBowlingStats = (
  innings: InningsScore,
  bowlerUid: string
): BowlingStats => {
  const bowler = innings.bowlers?.find(b => b.uid === bowlerUid);
  
  if (!bowler) {
    return {
      uid: bowlerUid,
      overs: 0,
      balls: 0,
      runs: 0,
      wickets: 0,
      economy: 0,
      dots: 0,
      wides: 0,
      noBalls: 0,
      maidens: 0
    };
  }
  
  // Count dots, wides, no-balls from ball events
  // Note: We need to track which balls were bowled by this bowler
  // This is complex as ballEvents don't currently store bowler info
  // For now, we'll use the bowler data and estimate from ball events
  
  let dots = 0;
  let wides = 0;
  let noBalls = 0;
  
  // We can't accurately determine which balls were bowled by which bowler
  // from the current data structure, so we'll make best estimates
  // This could be improved by adding bowlerUid to BallEvent in the future
  
  const totalOversDecimal = bowler.overs + (bowler.balls / 6);
  const economy = totalOversDecimal > 0 ? bowler.runs / totalOversDecimal : 0;
  
  return {
    uid: bowlerUid,
    overs: bowler.overs,
    balls: bowler.balls,
    runs: bowler.runs,
    wickets: bowler.wickets,
    economy: parseFloat(economy.toFixed(2)),
    dots,
    wides,
    noBalls,
    maidens: bowler.maidens || 0
  };
};

/**
 * Calculates partnerships from innings ball events.
 * @param innings - Innings score and ball events
 * @param currentBatsmen - Current batsmen (for live)
 * @returns Array of partnerships
 */
export const calculatePartnerships = (
  innings: InningsScore,
  currentBatsmen: Batsman[]
): Partnership[] => {
  const partnerships: Partnership[] = [];
  
  if (!innings.ballEvents || innings.ballEvents.length === 0) {
    return partnerships;
  }
  
  let currentPartnership: Partial<Partnership> = {
    runs: 0,
    wicketNumber: 1,
    batsman1Uid: undefined,
    batsman2Uid: undefined,
    batsman1Runs: 0,
    batsman2Runs: 0,
    balls: 0
  };
  
  let activeBatsmen = new Set<string>();
  
  innings.ballEvents.forEach((ball, index) => {
    if (ball.batsmanUid) {
      activeBatsmen.add(ball.batsmanUid);
      
      // Initialize partnership batsmen if not set
      if (!currentPartnership.batsman1Uid) {
        currentPartnership.batsman1Uid = ball.batsmanUid;
      } else if (!currentPartnership.batsman2Uid && ball.batsmanUid !== currentPartnership.batsman1Uid) {
        currentPartnership.batsman2Uid = ball.batsmanUid;
      }
      
      // Add runs to partnership
      currentPartnership.runs! += ball.runs;
      currentPartnership.balls! += (!ball.isWide && !ball.isNoBall) ? 1 : 0;
      
      // Track individual batsman contributions
      if (ball.batsmanUid === currentPartnership.batsman1Uid) {
        currentPartnership.batsman1Runs! += ball.runs;
      } else if (ball.batsmanUid === currentPartnership.batsman2Uid) {
        currentPartnership.batsman2Runs! += ball.runs;
      }
      
      // If wicket, end partnership
      if (ball.isWicket && currentPartnership.batsman1Uid && currentPartnership.batsman2Uid) {
        partnerships.push({
          runs: currentPartnership.runs!,
          wicketNumber: currentPartnership.wicketNumber!,
          batsman1Uid: currentPartnership.batsman1Uid,
          batsman2Uid: currentPartnership.batsman2Uid,
          batsman1Runs: currentPartnership.batsman1Runs!,
          batsman2Runs: currentPartnership.batsman2Runs!,
          balls: currentPartnership.balls!
        });
        
        // Start new partnership
        currentPartnership = {
          runs: 0,
          wicketNumber: currentPartnership.wicketNumber! + 1,
          batsman1Uid: ball.batsmanUid === currentPartnership.batsman1Uid 
            ? currentPartnership.batsman2Uid 
            : currentPartnership.batsman1Uid,
          batsman2Uid: undefined,
          batsman1Runs: 0,
          batsman2Runs: 0,
          balls: 0
        };
      }
    }
  });
  
  // Add current partnership if it exists
  if (currentPartnership.batsman1Uid && currentPartnership.batsman2Uid && currentPartnership.runs! > 0) {
    partnerships.push({
      runs: currentPartnership.runs!,
      wicketNumber: currentPartnership.wicketNumber!,
      batsman1Uid: currentPartnership.batsman1Uid,
      batsman2Uid: currentPartnership.batsman2Uid,
      batsman1Runs: currentPartnership.batsman1Runs!,
      batsman2Runs: currentPartnership.batsman2Runs!,
      balls: currentPartnership.balls!
    });
  }
  
  return partnerships;
};

/**
 * Calculates fall of wickets from innings ball events.
 * @param innings - Innings score and ball events
 * @returns Array of fall-of-wicket entries
 */
export const calculateFallOfWickets = (
  innings: InningsScore
): FallOfWicket[] => {
  const fallOfWickets: FallOfWicket[] = [];
  
  if (!innings.ballEvents || innings.ballEvents.length === 0) {
    return fallOfWickets;
  }
  
  let currentScore = 0;
  let currentOvers = 0;
  let currentBalls = 0;
  let wicketCount = 0;
  
  innings.ballEvents.forEach(ball => {
    currentScore += ball.runs;
    
    // Count balls for overs
    if (!ball.isWide && !ball.isNoBall) {
      currentBalls++;
      if (currentBalls === 6) {
        currentOvers++;
        currentBalls = 0;
      }
    }
    
    if (ball.isWicket && ball.batsmanUid) {
      wicketCount++;
      fallOfWickets.push({
        wicketNumber: wicketCount,
        score: currentScore,
        overs: currentOvers,
        balls: currentBalls,
        batsmanUid: ball.batsmanUid
      });
    }
  });
  
  return fallOfWickets;
};

/**
 * Calculates extras (wides, no-balls) from innings ball events.
 * @param innings - Innings score and ball events
 * @returns Extras breakdown
 */
export const calculateExtras = (
  innings: InningsScore
): ExtrasBreakdown => {
  let wides = 0;
  let noBalls = 0;
  
  if (innings.ballEvents) {
    innings.ballEvents.forEach(ball => {
      if (ball.isWide) wides += ball.runs;
      if (ball.isNoBall) noBalls += ball.runs;
    });
  }
  
  return {
    wides,
    noBalls,
    total: wides + noBalls
  };
};

/**
 * Calculates runs and wickets per over for charts.
 * @param innings - Innings score and ball events
 * @returns Over summary array
 */
export const calculateOverSummary = (
  innings: InningsScore
): OverSummary[] => {
  const overSummaries: OverSummary[] = [];
  
  if (!innings.ballEvents || innings.ballEvents.length === 0) {
    return overSummaries;
  }
  
  let currentOver = 0;
  let currentOverRuns = 0;
  let currentOverWickets = 0;
  let legalBalls = 0;
  
  innings.ballEvents.forEach((ball, index) => {
    currentOverRuns += ball.runs;
    if (ball.isWicket) currentOverWickets++;
    
    // Count legal deliveries
    if (!ball.isWide && !ball.isNoBall) {
      legalBalls++;
      
      // Complete over after 6 legal deliveries
      if (legalBalls === 6) {
        overSummaries.push({
          overNumber: currentOver + 1,
          runs: currentOverRuns,
          wickets: currentOverWickets
        });
        
        currentOver++;
        currentOverRuns = 0;
        currentOverWickets = 0;
        legalBalls = 0;
      }
    }
  });
  
  // Add incomplete over if exists
  if (legalBalls > 0) {
    overSummaries.push({
      overNumber: currentOver + 1,
      runs: currentOverRuns,
      wickets: currentOverWickets
    });
  }
  
  return overSummaries;
};

/**
 * Returns all batsman UIDs who batted in the innings (including current).
 * @param innings - Innings score and ball events
 * @param currentBatsmen - Current batsmen
 * @returns Array of UIDs
 */
export const getAllBatsmenInInnings = (
  innings: InningsScore,
  currentBatsmen: Batsman[]
): string[] => {
  const batsmenUids = new Set<string>();
  
  // Add current batsmen
  currentBatsmen.forEach(batsman => batsmenUids.add(batsman.uid));
  
  // Add batsmen from ball events
  if (innings.ballEvents) {
    innings.ballEvents.forEach(ball => {
      if (ball.batsmanUid) {
        batsmenUids.add(ball.batsmanUid);
      }
    });
  }
  
  return Array.from(batsmenUids);
};

/**
 * Returns all bowler UIDs who bowled in the innings.
 * @param innings - Innings score and bowlers
 * @returns Array of UIDs
 */
export const getAllBowlersInInnings = (
  innings: InningsScore
): string[] => {
  if (!innings.bowlers) return [];
  return innings.bowlers.map(bowler => bowler.uid);
};
