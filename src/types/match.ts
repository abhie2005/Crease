/**
 * Match and related cricket types (teams, innings, ball events).
 */

import { Timestamp } from 'firebase/firestore';

/** Match lifecycle status. */
export type MatchStatus = 'upcoming' | 'live' | 'completed';

/** Team definition with name and player UIDs. */
export interface Team {
  name: string;
  playerUids: string[];
}

/** Legacy score summary (runs, wickets, overs, balls). */
export interface Score {
  runs: number;
  wickets: number;
  overs: number;
  balls: number;
}

/** Single ball outcome for an over. */
export interface BallEvent {
  runs: number;
  isWide?: boolean;
  isNoBall?: boolean;
  isWicket?: boolean;
  isDot?: boolean;
  batsmanUid?: string;
  timestamp: number;
}

/** Batsman state in the current partnership. */
export interface Batsman {
  uid: string;
  runs: number;
  balls: number;
  isOnStrike: boolean;
}

/** Bowler stats for an innings. */
export interface Bowler {
  uid: string;
  overs: number;
  balls: number;
  runs: number;
  wickets: number;
  maidens: number;
}

/** Full innings score and ball-by-ball data. */
export interface InningsScore {
  runs: number;
  wickets: number;
  overs: number;
  balls: number;
  ballEvents: BallEvent[];
  currentBowlerUid?: string;
  lastBowlerUid?: string;
  bowlers?: Bowler[];
}

/** Match document with teams, innings, and live state. */
export interface Match {
  status: MatchStatus;
  createdBy: string;
  umpireUid: string;
  teamA: Team;
  teamB: Team;
  score: Score;
  scheduledDate?: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  totalOvers: number;
  tossWonBy?: 'teamA' | 'teamB';
  tossDecision?: 'bat' | 'bowl';
  currentInnings: 1 | 2;
  battingTeam?: 'teamA' | 'teamB';
  currentBatsmen: Batsman[];
  teamAInnings: InningsScore;
  teamBInnings: InningsScore;
}
