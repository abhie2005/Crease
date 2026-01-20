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
    
    // Update batsman stats
    const batsmanIndex = currentBatsmen.findIndex((b: any) => b.uid === batsmanUid);
    if (batsmanIndex !== -1) {
      currentBatsmen[batsmanIndex].runs += runs;
      currentBatsmen[batsmanIndex].balls += 1;
    }
    
    // Advance ball count
    let newBalls = currentInnings.balls + 1;
    let newOvers = currentInnings.overs;
    
    if (newBalls >= 6) {
      newBalls = 0;
      newOvers += 1;
      // Rotate strike at end of over
      currentBatsmen.forEach((b: any) => b.isOnStrike = !b.isOnStrike);
    } else if (runs % 2 === 1) {
      // Rotate strike on odd runs
      currentBatsmen.forEach((b: any) => b.isOnStrike = !b.isOnStrike);
    }
    
    const newInnings = {
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
      ]
    };
    
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
    
    const newInnings = {
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
      ]
    };
    
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
    
    const newInnings = {
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
      ]
    };
    
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
    
    // Advance ball count
    let newBalls = currentInnings.balls + 1;
    let newOvers = currentInnings.overs;
    
    if (newBalls >= 6) {
      newBalls = 0;
      newOvers += 1;
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
    
    const newInnings = {
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
      ]
    };
    
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
        currentBatsmen: [], // Will be set by toss/setup for 2nd innings
        updatedAt: serverTimestamp()
      });
    }
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
