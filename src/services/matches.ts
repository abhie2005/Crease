import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  addDoc,
  deleteDoc,
  doc,
  getDoc,
  runTransaction,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { matchesCollection, matchDoc } from '@/firebase/firestore';
import { db, auth } from '@/firebase/config';
import { Match, MatchStatus, Team, Score } from '@/models/Match';

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

export const addDotBall = async (
  matchId: string,
  batsmanUid: string
): Promise<void> => {
  await addRuns(matchId, 0, batsmanUid);
};

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

export const deleteMatch = async (matchId: string): Promise<void> => {
  // #region agent log
  const currentUser = auth.currentUser;
  fetch('http://127.0.0.1:7242/ingest/9a7e5339-61cc-4cc7-b07b-4ed757a68704',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'src/services/matches.ts:deleteMatch',message:'deleteMatch called',data:{matchId,hasCurrentUser:!!currentUser,currentUserId:currentUser?.uid,currentUserEmail:currentUser?.email},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
  // #endregion
  const matchRef = matchDoc(matchId);
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/9a7e5339-61cc-4cc7-b07b-4ed757a68704',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'src/services/matches.ts:deleteMatch',message:'Before deleteDoc call',data:{matchId,matchRefPath:matchRef.path},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
  // #endregion
  try {
    await deleteDoc(matchRef);
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/9a7e5339-61cc-4cc7-b07b-4ed757a68704',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'src/services/matches.ts:deleteMatch',message:'deleteDoc succeeded',data:{matchId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'G'})}).catch(()=>{});
    // #endregion
  } catch (error: any) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/9a7e5339-61cc-4cc7-b07b-4ed757a68704',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'src/services/matches.ts:deleteMatch:catch',message:'deleteDoc failed',data:{matchId,errorMessage:error?.message,errorCode:error?.code,errorName:error?.name,errorStack:error?.stack},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H'})}).catch(()=>{});
    // #endregion
    throw error;
  }
};
