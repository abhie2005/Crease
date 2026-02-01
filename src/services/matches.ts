/**
 * Match subscription, CRUD, live scoring, and search.
 * Used by home screen, match detail, umpire panel, and search.
 */

import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  addDoc,
  deleteDoc,
  getDocs,
  doc,
  getDoc,
  runTransaction,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { matchesCollection, matchDoc } from '@/firebase/firestore';
import { db, auth } from '@/firebase/config';
import { Match, MatchStatus, Team, Score } from '@/models/Match';

/**
 * Subscribes to the matches list (ordered by updatedAt desc).
 * @param callback - Called with matches array on each update
 * @param maxResults - Max number of matches (default 50)
 * @returns Unsubscribe function
 */
export const subscribeToMatches = (
  callback: (matches: Match[]) => void,
  maxResults: number = 50
): (() => void) => {
  const q = query(
    matchesCollection,
    orderBy('updatedAt', 'desc'),
    limit(maxResults)
  );

  return onSnapshot(q, (snapshot) => {
    const matches: Match[] = [];
    snapshot.forEach((doc) => {
      matches.push({ ...doc.data(), id: doc.id } as any);
    });
    callback(matches);
  });
};

/**
 * Subscribes to a single match document by ID.
 * @param matchId - Match document ID
 * @param callback - Called with match or null on each update
 * @returns Unsubscribe function
 */
export const subscribeToMatch = (
  matchId: string,
  callback: (match: Match | null) => void
): (() => void) => {
  const matchRef = matchDoc(matchId);
  
  return onSnapshot(matchRef, (snapshot) => {
    if (snapshot.exists()) {
      callback({ ...snapshot.data(), id: snapshot.id } as any);
    } else {
      callback(null);
    }
  });
};

/**
 * Fetches a single match by ID (one-shot, for pinned performance etc.).
 * @param matchId - Match document ID
 * @returns Match with id or null if not found
 */
export const getMatch = async (matchId: string): Promise<(Match & { id: string }) | null> => {
  const matchRef = matchDoc(matchId);
  const snapshot = await getDoc(matchRef);
  if (!snapshot.exists()) return null;
  return { ...snapshot.data(), id: snapshot.id } as any;
};

/**
 * Creates a new match document (status: upcoming).
 * @param createdBy - UID of creator
 * @param umpireUid - UID of assigned umpire
 * @param teamA - Team A definition
 * @param teamB - Team B definition
 * @param totalOvers - Max overs per innings
 * @param scheduledDate - Optional scheduled start time
 * @returns New match document ID
 */
export const createMatch = async (
  createdBy: string,
  umpireUid: string,
  teamA: Team,
  teamB: Team,
  totalOvers: number,
  scheduledDate?: Date
): Promise<string> => {
  const matchData: any = {
    status: 'upcoming',
    createdBy,
    umpireUid,
    teamA,
    teamB,
    totalOvers,
    currentInnings: 1,
    currentBatsmen: [],
    teamAInnings: {
      runs: 0,
      wickets: 0,
      overs: 0,
      balls: 0,
      ballEvents: []
    },
    teamBInnings: {
      runs: 0,
      wickets: 0,
      overs: 0,
      balls: 0,
      ballEvents: []
    },
    score: {
      runs: 0,
      wickets: 0,
      overs: 0,
      balls: 0
    },
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };

  // Only add scheduledDate if it's provided (Firestore doesn't accept undefined)
  if (scheduledDate) {
    matchData.scheduledDate = Timestamp.fromDate(scheduledDate);
  }

  const docRef = await addDoc(matchesCollection, matchData);
  return docRef.id;
};

/**
 * Updates legacy score field (runs, wickets, overs, balls) in a transaction.
 * @param matchId - Match document ID
 * @param scoreUpdate - Partial score to merge
 */
export const updateMatchScore = async (
  matchId: string,
  scoreUpdate: Partial<Score>
): Promise<void> => {
  const matchRef = matchDoc(matchId);
  
  await runTransaction(db, async (transaction) => {
    const matchSnap = await transaction.get(matchRef);
    
    if (!matchSnap.exists()) {
      throw new Error('Match not found');
    }
    
    const currentMatch = matchSnap.data();
    const currentScore = currentMatch.score;
    
    const newScore: Score = {
      runs: scoreUpdate.runs !== undefined ? scoreUpdate.runs : currentScore.runs,
      wickets: scoreUpdate.wickets !== undefined ? scoreUpdate.wickets : currentScore.wickets,
      overs: scoreUpdate.overs !== undefined ? scoreUpdate.overs : currentScore.overs,
      balls: scoreUpdate.balls !== undefined ? scoreUpdate.balls : currentScore.balls
    };
    
    transaction.update(matchRef, {
      score: newScore,
      updatedAt: serverTimestamp()
    });
  });
};

/**
 * Updates match status (upcoming | live | completed).
 * @param matchId - Match document ID
 * @param status - New status
 */
export const updateMatchStatus = async (
  matchId: string,
  status: MatchStatus
): Promise<void> => {
  const matchRef = matchDoc(matchId);
  
  await runTransaction(db, async (transaction) => {
    const matchSnap = await transaction.get(matchRef);
    
    if (!matchSnap.exists()) {
      throw new Error('Match not found');
    }
    
    transaction.update(matchRef, {
      status,
      updatedAt: serverTimestamp()
    });
  });
};

/**
 * Records toss result and sets batting team and opening batsmen; sets status to live.
 * @param matchId - Match document ID
 * @param tossWonBy - Which team won toss
 * @param tossDecision - Bat or bowl
 * @param battingTeam - Which team is batting first
 * @param openingBatsmen - Opening pair with strike flag
 */
export const updateToss = async (
  matchId: string,
  tossWonBy: 'teamA' | 'teamB',
  tossDecision: 'bat' | 'bowl',
  battingTeam: 'teamA' | 'teamB',
  openingBatsmen: { uid: string; isOnStrike: boolean }[]
): Promise<void> => {
  const matchRef = matchDoc(matchId);
  
  const currentBatsmen = openingBatsmen.map(b => ({
    uid: b.uid,
    runs: 0,
    balls: 0,
    isOnStrike: b.isOnStrike
  }));
  
  await runTransaction(db, async (transaction) => {
    const matchSnap = await transaction.get(matchRef);
    
    if (!matchSnap.exists()) {
      throw new Error('Match not found');
    }
    
    transaction.update(matchRef, {
      tossWonBy,
      tossDecision,
      battingTeam,
      currentBatsmen,
      status: 'live',
      updatedAt: serverTimestamp()
    });
  });
};

/**
 * Records runs off a ball and updates innings, batsmen, and bowler stats in a transaction.
 * @param matchId - Match document ID
 * @param runs - Runs scored (0-6)
 * @param batsmanUid - UID of batsman who scored
 */
export const addRuns = async (
  matchId: string,
  runs: number,
  batsmanUid: string
): Promise<void> => {
  const matchRef = matchDoc(matchId);
  
  await runTransaction(db, async (transaction) => {
    const matchSnap = await transaction.get(matchRef);
    
    if (!matchSnap.exists()) {
      throw new Error('Match not found');
    }
    
    const match = matchSnap.data() as any;
    const currentInnings = match.battingTeam === 'teamA' ? match.teamAInnings : match.teamBInnings;
    const currentBatsmen = [...match.currentBatsmen];
    
    // Check if innings is already complete before advancing ball
    const totalBallsBowled = currentInnings.overs * 6 + currentInnings.balls;
    const maxBalls = match.totalOvers * 6;
    if (totalBallsBowled >= maxBalls) {
      throw new Error('Innings already complete - all overs bowled');
    }
    
    // Update batsman stats
    const batsmanIndex = currentBatsmen.findIndex((b: any) => b.uid === batsmanUid);
    if (batsmanIndex !== -1) {
      currentBatsmen[batsmanIndex].runs += runs;
      currentBatsmen[batsmanIndex].balls += 1;
    }
    
    // Update bowler stats
    let bowlers = currentInnings.bowlers || [];
    const currentBowlerUid = currentInnings.currentBowlerUid;
    let newCurrentBowlerUid = currentBowlerUid;
    let newLastBowlerUid = currentInnings.lastBowlerUid;
    
    if (currentBowlerUid) {
      const bowlerIndex = bowlers.findIndex((b: any) => b.uid === currentBowlerUid);
      if (bowlerIndex !== -1) {
        bowlers[bowlerIndex].runs += runs;
        bowlers[bowlerIndex].balls += 1;
      }
    }
    
    // Advance ball count
    let newBalls = currentInnings.balls + 1;
    let newOvers = currentInnings.overs;
    
    if (newBalls >= 6) {
      newBalls = 0;
      newOvers += 1;
      
      // Update bowler: complete the over
      if (currentBowlerUid && bowlers.length > 0) {
        const bowlerIndex = bowlers.findIndex((b: any) => b.uid === currentBowlerUid);
        if (bowlerIndex !== -1) {
          bowlers[bowlerIndex].overs += 1;
          bowlers[bowlerIndex].balls = 0;
        }
      }
      
      // Move current bowler to last bowler, clear current
      newLastBowlerUid = currentBowlerUid;
      newCurrentBowlerUid = undefined;
      
      // Rotate strike at end of over
      currentBatsmen.forEach((b: any) => b.isOnStrike = !b.isOnStrike);
    } else if (runs % 2 === 1) {
      // Rotate strike on odd runs
      currentBatsmen.forEach((b: any) => b.isOnStrike = !b.isOnStrike);
    }
    
    const newInnings: any = {
      runs: currentInnings.runs + runs,
      wickets: currentInnings.wickets,
      overs: newOvers,
      balls: newBalls,
      ballEvents: [
        ...currentInnings.ballEvents,
        {
          runs,
          batsmanUid,
          isDot: runs === 0,
          timestamp: Date.now()
        }
      ],
      bowlers
    };
    
    // Only add these fields if they have values (Firestore doesn't accept undefined)
    if (newCurrentBowlerUid !== undefined) {
      newInnings.currentBowlerUid = newCurrentBowlerUid;
    }
    if (newLastBowlerUid !== undefined) {
      newInnings.lastBowlerUid = newLastBowlerUid;
    }
    
    const updates: any = {
      currentBatsmen,
      updatedAt: serverTimestamp()
    };
    
    if (match.battingTeam === 'teamA') {
      updates.teamAInnings = newInnings;
    } else {
      updates.teamBInnings = newInnings;
    }
    
    transaction.update(matchRef, updates);
  });
};

/**
 * Records a dot ball (0 runs) via addRuns.
 * @param matchId - Match document ID
 * @param batsmanUid - UID of batsman on strike
 */
export const addDotBall = async (
  matchId: string,
  batsmanUid: string
): Promise<void> => {
  await addRuns(matchId, 0, batsmanUid);
};

/**
 * Records a wide (1 + extra runs); does not advance ball count.
 * @param matchId - Match document ID
 * @param extraRuns - Extra runs (e.g. 0 for just wide)
 */
export const addWide = async (
  matchId: string,
  extraRuns: number
): Promise<void> => {
  const matchRef = matchDoc(matchId);
  
  await runTransaction(db, async (transaction) => {
    const matchSnap = await transaction.get(matchRef);
    
    if (!matchSnap.exists()) {
      throw new Error('Match not found');
    }
    
    const match = matchSnap.data() as any;
    const currentInnings = match.battingTeam === 'teamA' ? match.teamAInnings : match.teamBInnings;
    
    const totalRuns = 1 + extraRuns;
    
    // Update bowler runs (wide counts as runs conceded)
    let bowlers = currentInnings.bowlers || [];
    const currentBowlerUid = currentInnings.currentBowlerUid;
    
    if (currentBowlerUid) {
      const bowlerIndex = bowlers.findIndex((b: any) => b.uid === currentBowlerUid);
      if (bowlerIndex !== -1) {
        bowlers[bowlerIndex].runs += totalRuns;
      }
    }
    
    const newInnings: any = {
      runs: currentInnings.runs + totalRuns,
      wickets: currentInnings.wickets,
      overs: currentInnings.overs,
      balls: currentInnings.balls, // Don't advance ball count
      ballEvents: [
        ...currentInnings.ballEvents,
        {
          runs: totalRuns,
          isWide: true,
          timestamp: Date.now()
        }
      ],
      bowlers
    };
    
    // Preserve bowler fields
    if (currentInnings.currentBowlerUid !== undefined) {
      newInnings.currentBowlerUid = currentInnings.currentBowlerUid;
    }
    if (currentInnings.lastBowlerUid !== undefined) {
      newInnings.lastBowlerUid = currentInnings.lastBowlerUid;
    }
    
    const updates: any = {
      updatedAt: serverTimestamp()
    };
    
    if (match.battingTeam === 'teamA') {
      updates.teamAInnings = newInnings;
    } else {
      updates.teamBInnings = newInnings;
    }
    
    transaction.update(matchRef, updates);
  });
};

/**
 * Records a no-ball (1 + extra runs); does not advance ball count.
 * @param matchId - Match document ID
 * @param extraRuns - Extra runs (e.g. 0 for just no-ball)
 */
export const addNoBall = async (
  matchId: string,
  extraRuns: number
): Promise<void> => {
  const matchRef = matchDoc(matchId);
  
  await runTransaction(db, async (transaction) => {
    const matchSnap = await transaction.get(matchRef);
    
    if (!matchSnap.exists()) {
      throw new Error('Match not found');
    }
    
    const match = matchSnap.data() as any;
    const currentInnings = match.battingTeam === 'teamA' ? match.teamAInnings : match.teamBInnings;
    
    const totalRuns = 1 + extraRuns;
    
    // Update bowler runs (no ball counts as runs conceded)
    let bowlers = currentInnings.bowlers || [];
    const currentBowlerUid = currentInnings.currentBowlerUid;
    
    if (currentBowlerUid) {
      const bowlerIndex = bowlers.findIndex((b: any) => b.uid === currentBowlerUid);
      if (bowlerIndex !== -1) {
        bowlers[bowlerIndex].runs += totalRuns;
      }
    }
    
    const newInnings: any = {
      runs: currentInnings.runs + totalRuns,
      wickets: currentInnings.wickets,
      overs: currentInnings.overs,
      balls: currentInnings.balls, // Don't advance ball count
      ballEvents: [
        ...currentInnings.ballEvents,
        {
          runs: totalRuns,
          isNoBall: true,
          timestamp: Date.now()
        }
      ],
      bowlers
    };
    
    // Preserve bowler fields
    if (currentInnings.currentBowlerUid !== undefined) {
      newInnings.currentBowlerUid = currentInnings.currentBowlerUid;
    }
    if (currentInnings.lastBowlerUid !== undefined) {
      newInnings.lastBowlerUid = currentInnings.lastBowlerUid;
    }
    
    const updates: any = {
      updatedAt: serverTimestamp()
    };
    
    if (match.battingTeam === 'teamA') {
      updates.teamAInnings = newInnings;
    } else {
      updates.teamBInnings = newInnings;
    }
    
    transaction.update(matchRef, updates);
  });
};

/**
 * Records a wicket: dismisses one batsman, brings in new one, updates bowler stats.
 * @param matchId - Match document ID
 * @param dismissedBatsmanUid - UID of dismissed batsman
 * @param newBatsmanUid - UID of incoming batsman
 */
export const addWicket = async (
  matchId: string,
  dismissedBatsmanUid: string,
  newBatsmanUid: string
): Promise<void> => {
  const matchRef = matchDoc(matchId);
  
  await runTransaction(db, async (transaction) => {
    const matchSnap = await transaction.get(matchRef);
    
    if (!matchSnap.exists()) {
      throw new Error('Match not found');
    }
    
    const match = matchSnap.data() as any;
    const currentInnings = match.battingTeam === 'teamA' ? match.teamAInnings : match.teamBInnings;
    const currentBatsmen = [...match.currentBatsmen];
    
    // Find dismissed batsman and preserve on-strike status
    const dismissedIndex = currentBatsmen.findIndex((b: any) => b.uid === dismissedBatsmanUid);
    const wasOnStrike = dismissedIndex !== -1 ? currentBatsmen[dismissedIndex].isOnStrike : false;
    
    // Update batsman - add one ball faced for dismissed batsman
    if (dismissedIndex !== -1) {
      currentBatsmen[dismissedIndex].balls += 1;
    }
    
    // Update bowler stats - increment wicket count and balls bowled
    let bowlers = currentInnings.bowlers || [];
    const currentBowlerUid = currentInnings.currentBowlerUid;
    let newCurrentBowlerUid = currentBowlerUid;
    let newLastBowlerUid = currentInnings.lastBowlerUid;
    
    if (currentBowlerUid) {
      const bowlerIndex = bowlers.findIndex((b: any) => b.uid === currentBowlerUid);
      if (bowlerIndex !== -1) {
        bowlers[bowlerIndex].wickets += 1;
        bowlers[bowlerIndex].balls += 1;
      }
    }
    
    // Advance ball count
    let newBalls = currentInnings.balls + 1;
    let newOvers = currentInnings.overs;
    
    if (newBalls >= 6) {
      newBalls = 0;
      newOvers += 1;
      
      // Update bowler: complete the over
      if (currentBowlerUid && bowlers.length > 0) {
        const bowlerIndex = bowlers.findIndex((b: any) => b.uid === currentBowlerUid);
        if (bowlerIndex !== -1) {
          bowlers[bowlerIndex].overs += 1;
          bowlers[bowlerIndex].balls = 0;
        }
      }
      
      // Move current bowler to last bowler, clear current
      newLastBowlerUid = currentBowlerUid;
      newCurrentBowlerUid = undefined;
    }
    
    // Replace dismissed batsman with new batsman (preserve strike)
    if (dismissedIndex !== -1) {
      currentBatsmen[dismissedIndex] = {
        uid: newBatsmanUid,
        runs: 0,
        balls: 0,
        isOnStrike: wasOnStrike
      };
    }
    
    const newInnings: any = {
      runs: currentInnings.runs,
      wickets: currentInnings.wickets + 1,
      overs: newOvers,
      balls: newBalls,
      ballEvents: [
        ...currentInnings.ballEvents,
        {
          runs: 0,
          isWicket: true,
          batsmanUid: dismissedBatsmanUid,
          timestamp: Date.now()
        }
      ],
      bowlers
    };
    
    // Only add these fields if they have values (Firestore doesn't accept undefined)
    if (newCurrentBowlerUid !== undefined) {
      newInnings.currentBowlerUid = newCurrentBowlerUid;
    }
    if (newLastBowlerUid !== undefined) {
      newInnings.lastBowlerUid = newLastBowlerUid;
    }
    
    const updates: any = {
      currentBatsmen,
      updatedAt: serverTimestamp()
    };
    
    if (match.battingTeam === 'teamA') {
      updates.teamAInnings = newInnings;
    } else {
      updates.teamBInnings = newInnings;
    }
    
    transaction.update(matchRef, updates);
  });
};

/**
 * Switches to second innings or marks match completed if already in second innings.
 * @param matchId - Match document ID
 */
export const switchInnings = async (matchId: string): Promise<void> => {
  const matchRef = matchDoc(matchId);
  
  await runTransaction(db, async (transaction) => {
    const matchSnap = await transaction.get(matchRef);
    
    if (!matchSnap.exists()) {
      throw new Error('Match not found');
    }
    
    const match = matchSnap.data() as any;
    
    if (match.currentInnings === 2) {
      // Match is complete
      transaction.update(matchRef, {
        status: 'completed',
        currentBatsmen: [],
        updatedAt: serverTimestamp()
      });
    } else {
      // Switch to 2nd innings
      const newBattingTeam = match.battingTeam === 'teamA' ? 'teamB' : 'teamA';
      
      transaction.update(matchRef, {
        currentInnings: 2,
        battingTeam: newBattingTeam,
        currentBatsmen: [], // Will be set by setupSecondInnings
        updatedAt: serverTimestamp()
      });
    }
  });
};

/**
 * Sets opening batsmen for the second innings (after switchInnings).
 * @param matchId - Match document ID
 * @param openingBatsmen - Opening pair with strike flag
 */
export const setupSecondInnings = async (
  matchId: string,
  openingBatsmen: { uid: string; isOnStrike: boolean }[]
): Promise<void> => {
  const matchRef = matchDoc(matchId);
  
  const currentBatsmen = openingBatsmen.map(b => ({
    uid: b.uid,
    runs: 0,
    balls: 0,
    isOnStrike: b.isOnStrike
  }));
  
  await runTransaction(db, async (transaction) => {
    const matchSnap = await transaction.get(matchRef);
    
    if (!matchSnap.exists()) {
      throw new Error('Match not found');
    }
    
    transaction.update(matchRef, {
      currentBatsmen,
      updatedAt: serverTimestamp()
    });
  });
};

/**
 * Sets the current bowler for the ongoing over (enforces no consecutive overs).
 * @param matchId - Match document ID
 * @param bowlerUid - UID of bowler from bowling team
 */
export const selectBowler = async (
  matchId: string,
  bowlerUid: string
): Promise<void> => {
  const matchRef = matchDoc(matchId);
  
  await runTransaction(db, async (transaction) => {
    const matchSnap = await transaction.get(matchRef);
    if (!matchSnap.exists()) throw new Error('Match not found');
    
    const match = matchSnap.data() as any;
    const currentInnings = match.battingTeam === 'teamA' ? match.teamAInnings : match.teamBInnings;
    const bowlingTeam = match.battingTeam === 'teamA' ? match.teamB : match.teamA;
    
    // Validate bowler is from bowling team
    if (!bowlingTeam.playerUids.includes(bowlerUid)) {
      throw new Error('Bowler must be from the bowling team');
    }
    
    // Check rotation rule: can't bowl if they bowled last over
    if (currentInnings.lastBowlerUid === bowlerUid) {
      throw new Error('Bowler cannot bowl consecutive overs - must take a 1-over break');
    }
    
    // Initialize or update bowler stats
    let bowlers = currentInnings.bowlers || [];
    let bowlerIndex = bowlers.findIndex((b: any) => b.uid === bowlerUid);
    
    if (bowlerIndex === -1) {
      // New bowler
      bowlers.push({
        uid: bowlerUid,
        overs: 0,
        balls: 0,
        runs: 0,
        wickets: 0,
        maidens: 0
      });
      bowlerIndex = bowlers.length - 1;
    }
    
    // Update current bowler
    const updates: any = {
      updatedAt: serverTimestamp()
    };
    
    if (match.battingTeam === 'teamA') {
      updates.teamAInnings = {
        ...currentInnings,
        currentBowlerUid: bowlerUid,
        bowlers
      };
    } else {
      updates.teamBInnings = {
        ...currentInnings,
        currentBowlerUid: bowlerUid,
        bowlers
      };
    }
    
    transaction.update(matchRef, updates);
  });
};

/**
 * Search matches by team names (substring match on teamA/teamB names).
 * Uses in-memory filtering on recent 100 matches.
 * @param searchQuery - Search string
 * @returns Matching matches with id attached
 */
export const searchMatches = async (searchQuery: string): Promise<Match[]> => {
  const q = query(
    matchesCollection,
    orderBy('updatedAt', 'desc'),
    limit(100)
  );

  const snapshot = await getDocs(q);
  const matches: Match[] = [];
  const normalizedQuery = searchQuery.toLowerCase().trim();

  snapshot.forEach((doc) => {
    const data = doc.data() as Match;
    const teamA = data.teamA.name.toLowerCase();
    const teamB = data.teamB.name.toLowerCase();

    if (teamA.includes(normalizedQuery) || teamB.includes(normalizedQuery)) {
      matches.push({ ...data, id: doc.id } as any);
    }
  });

  return matches;
};

/**
 * Returns unique team names matching the query, with last match ID for each.
 * In-memory filter on recent 200 matches.
 * @param searchQuery - Search string
 * @returns Array of { name, lastMatchId }
 */
export const getUniqueTeams = async (searchQuery: string): Promise<{ name: string; lastMatchId: string }[]> => {
  const q = query(
    matchesCollection,
    orderBy('updatedAt', 'desc'),
    limit(200)
  );

  const snapshot = await getDocs(q);
  const teamMap = new Map<string, string>();
  const normalizedQuery = searchQuery.toLowerCase().trim();

  snapshot.forEach((doc) => {
    const data = doc.data() as Match;
    const teamA = data.teamA.name;
    const teamB = data.teamB.name;

    if (teamA.toLowerCase().includes(normalizedQuery) && !teamMap.has(teamA)) {
      teamMap.set(teamA, doc.id);
    }
    if (teamB.toLowerCase().includes(normalizedQuery) && !teamMap.has(teamB)) {
      teamMap.set(teamB, doc.id);
    }
  });

  return Array.from(teamMap.entries()).map(([name, lastMatchId]) => ({
    name,
    lastMatchId
  }));
};

/**
 * Fetches recent matches for a team (exact name match), up to limitCount.
 * @param teamName - Exact team name
 * @param limitCount - Max matches to return (default 1)
 * @returns Matches with id attached
 */
export const getMatchesForTeam = async (teamName: string, limitCount: number = 1): Promise<Match[]> => {
  const matchesRef = collection(db, 'matches');
  const q = query(
    matchesRef,
    orderBy('updatedAt', 'desc'),
    limit(100) // Search in recent 100 matches
  );

  const snapshot = await getDocs(q);
  const teamMatches: Match[] = [];
  const normalizedTeamName = teamName.toLowerCase();

  snapshot.forEach((doc) => {
    if (teamMatches.length >= limitCount) return;
    const data = doc.data() as Match;
    if (data.teamA.name.toLowerCase() === normalizedTeamName || 
        data.teamB.name.toLowerCase() === normalizedTeamName) {
      teamMatches.push({ ...data, id: doc.id } as any);
    }
  });

  return teamMatches;
};

/**
 * Deletes a match document by ID.
 * @param matchId - Match document ID
 */
export const deleteMatch = async (matchId: string): Promise<void> => {
  const matchRef = matchDoc(matchId);
  try {
    await deleteDoc(matchRef);
  } catch (error: any) {
    throw error;
  }
};
