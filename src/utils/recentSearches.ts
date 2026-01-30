/**
 * Recent search persistence using AsyncStorage.
 * Used by the search tab to show and manage recent searches.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const RECENT_SEARCHES_KEY = '@recent_searches';
const MAX_RECENT_SEARCHES = 10;

/** Type of search: player, team, or match. */
export type SearchType = 'player' | 'team' | 'match';

/** Single recent search entry. */
export interface RecentSearch {
  id: string;
  query: string;
  type: SearchType;
  timestamp: number;
}

/**
 * Saves a search to recent list (moves to top if exists; caps at MAX_RECENT_SEARCHES).
 * @param query - Search query text
 * @param type - Search type
 */
export const saveRecentSearch = async (query: string, type: SearchType): Promise<void> => {
  if (!query.trim()) return;

  try {
    const existingSearchesJson = await AsyncStorage.getItem(RECENT_SEARCHES_KEY);
    let searches: RecentSearch[] = existingSearchesJson ? JSON.parse(existingSearchesJson) : [];

    // Remove if already exists (to move to top)
    searches = searches.filter(s => !(s.query === query && s.type === type));

    const newSearch: RecentSearch = {
      id: `${Date.now()}-${Math.random()}`,
      query: query.trim(),
      type,
      timestamp: Date.now()
    };

    searches = [newSearch, ...searches].slice(0, MAX_RECENT_SEARCHES);
    await AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(searches));
  } catch (error) {
    console.error('Error saving recent search:', error);
  }
};

/** Returns the list of recent searches from AsyncStorage. */
export const getRecentSearches = async (): Promise<RecentSearch[]> => {
  try {
    const searchesJson = await AsyncStorage.getItem(RECENT_SEARCHES_KEY);
    return searchesJson ? JSON.parse(searchesJson) : [];
  } catch (error) {
    console.error('Error getting recent searches:', error);
    return [];
  }
};

/**
 * Removes a recent search by id.
 * @param id - RecentSearch id
 */
export const removeRecentSearch = async (id: string): Promise<void> => {
  try {
    const searchesJson = await AsyncStorage.getItem(RECENT_SEARCHES_KEY);
    if (!searchesJson) return;

    let searches: RecentSearch[] = JSON.parse(searchesJson);
    searches = searches.filter(s => s.id !== id);
    await AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(searches));
  } catch (error) {
    console.error('Error removing recent search:', error);
  }
};

/** Clears all recent searches from AsyncStorage. */
export const clearRecentSearches = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(RECENT_SEARCHES_KEY);
  } catch (error) {
    console.error('Error clearing recent searches:', error);
  }
};
