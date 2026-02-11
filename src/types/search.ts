/**
 * Search-related types.
 */

/** Type of search: player, team, or match. */
export type SearchType = 'player' | 'team' | 'match';

/** Single recent search entry. */
export interface RecentSearch {
  id: string;
  query: string;
  type: SearchType;
  timestamp: number;
}
