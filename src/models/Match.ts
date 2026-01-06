import { Timestamp } from 'firebase/firestore';

export type MatchStatus = 'upcoming' | 'live' | 'completed';

export interface Team {
  name: string;
  playerUids: string[];
}

export interface Score {
  runs: number;
  wickets: number;
  overs: number;
  balls: number;
}

export interface Match {
  status: MatchStatus;
  createdBy: string; // uid
  umpireUid: string; // uid
  teamA: Team;
  teamB: Team;
  score: Score;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

