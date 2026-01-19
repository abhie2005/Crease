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
  scheduledDate?: Date
): Promise<string> => {
  const matchData: any = {
    status: 'upcoming',
    createdBy,
    umpireUid,
    teamA,
    teamB,
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
