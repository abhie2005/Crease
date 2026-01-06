import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  addDoc,
  doc,
  getDoc,
  runTransaction,
  serverTimestamp
} from 'firebase/firestore';
import { matchesCollection, matchDoc } from '@/firebase/firestore';
import { db } from '@/firebase/config';
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
  teamB: Team
): Promise<string> => {
  const matchData: Omit<Match, 'id'> = {
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
    createdAt: serverTimestamp() as any,
    updatedAt: serverTimestamp() as any
  };

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

