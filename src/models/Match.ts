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

export interface BallEvent {
  runs: number;
  isWide?: boolean;
  isNoBall?: boolean;
  isWicket?: boolean;
  isDot?: boolean;
  batsmanUid?: string;
  timestamp: number;
}

export interface Batsman {
  uid: string;
  runs: number;
  balls: number;
  isOnStrike: boolean;
}

export interface InningsScore {
  runs: number;
  wickets: number;
  overs: number;
  balls: number;
  ballEvents: BallEvent[];
}

export interface Match {
  status: MatchStatus;
  createdBy: string; // uid
  umpireUid: string; // uid
  teamA: Team;
  teamB: Team;
  score: Score; // DEPRECATED: kept for backward compatibility
  scheduledDate?: Timestamp; // Optional scheduled date/time
  createdAt: Timestamp;
  updatedAt: Timestamp;
  
  // NEW: Cricket match fields
  totalOvers: number;
  tossWonBy?: 'teamA' | 'teamB';
  tossDecision?: 'bat' | 'bowl';
  currentInnings: 1 | 2;
  battingTeam?: 'teamA' | 'teamB';
  currentBatsmen: Batsman[];
  teamAInnings: InningsScore;
  teamBInnings: InningsScore;
}

