/**
 * Derived match statistics types (batting, bowling, partnerships, etc.).
 */

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
