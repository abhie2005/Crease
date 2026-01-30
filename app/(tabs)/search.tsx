/**
 * Search tab: players, teams, matches with tabs; recent searches and New Talents when empty.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Input } from '@/components/Input';
import { useAuth } from '@/providers/AuthProvider';
import { searchUsersByUsername, getLatestUsers } from '@/services/users';
import { searchMatches, getUniqueTeams } from '@/services/matches';
import { User } from '@/models/User';
import { PlayerResultCard } from '@/components/search/PlayerResultCard';
import { TeamResultCard } from '@/components/search/TeamResultCard';
import { MatchResultCard } from '@/components/search/MatchResultCard';
import { saveRecentSearch, getRecentSearches, removeRecentSearch, clearRecentSearches, RecentSearch } from '@/utils/recentSearches';

type TabType = 'player' | 'team' | 'match';

/** Search screen with Players/Teams/Matches tabs and recent searches. */
export default function SearchScreen() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('player');
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);
  const [newTalents, setNewTalents] = useState<User[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const router = useRouter();

  // Load initial data (recent searches and new talents)
  useEffect(() => {
    const loadInitialData = async () => {
      setLoadingInitial(true);
      try {
        const [recent, talents] = await Promise.all([
          getRecentSearches(),
          getLatestUsers(5)
        ]);
        setRecentSearches(recent);
        setNewTalents(talents);
      } catch (error) {
        console.error('Error loading initial data:', error);
      } finally {
        setLoadingInitial(false);
      }
    };

    loadInitialData();
  }, []);

  // Search logic with debouncing
  useEffect(() => {
    if (!searchQuery.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const timeoutId = setTimeout(async () => {
      try {
        let searchResults: any[] = [];
        const trimmedQuery = searchQuery.trim();

        if (activeTab === 'player') {
          searchResults = await searchUsersByUsername(trimmedQuery, user?.uid, 20);
        } else if (activeTab === 'team') {
          searchResults = await getUniqueTeams(trimmedQuery);
        } else if (activeTab === 'match') {
          searchResults = await searchMatches(trimmedQuery);
        }

        setResults(searchResults);
      } catch (error) {
        console.error('Search error:', error);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, activeTab, user?.uid]);

  const handleResultPress = async (type: TabType, data: any) => {
    // Save to recent searches
    let queryValue = '';
    if (type === 'player') {
      queryValue = data.name;
      await saveRecentSearch(queryValue, 'player');
      router.push(`/user/${data.username}`);
    } else if (type === 'team') {
      queryValue = data.name;
      await saveRecentSearch(queryValue, 'team');
      router.push(`/match/${data.lastMatchId}`);
    } else if (type === 'match') {
      queryValue = `${data.teamA.name} vs ${data.teamB.name}`;
      await saveRecentSearch(queryValue, 'match');
      router.push(`/match/${data.id}`);
    }
    
    // Refresh recent searches
    const updatedRecent = await getRecentSearches();
    setRecentSearches(updatedRecent);
  };

  const handleRecentSearchPress = (search: RecentSearch) => {
    setActiveTab(search.type);
    setSearchQuery(search.query);
  };

  const handleRemoveRecent = async (id: string) => {
    await removeRecentSearch(id);
    const updatedRecent = await getRecentSearches();
    setRecentSearches(updatedRecent);
  };

  const handleClearAllRecent = async () => {
    await clearRecentSearches();
    setRecentSearches([]);
  };

  const renderTab = (type: TabType, label: string, icon: any) => {
    const isActive = activeTab === type;
    return (
      <TouchableOpacity
        style={[styles.tab, isActive && styles.activeTab]}
        onPress={() => {
          setActiveTab(type);
          setResults([]);
        }}
      >
        <Ionicons 
          name={icon} 
          size={20} 
          color={isActive ? '#fff' : '#6c757d'} 
        />
        <Text style={[styles.tabText, isActive && styles.activeTabText]}>
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderInitialView = () => {
    if (loadingInitial) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      );
    }

    return (
      <ScrollView showsVerticalScrollIndicator={false}>
        {recentSearches.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Searches</Text>
              <TouchableOpacity onPress={handleClearAllRecent}>
                <Text style={styles.clearAllText}>Clear All</Text>
              </TouchableOpacity>
            </View>
            {recentSearches.map((search) => (
              <View key={search.id} style={styles.recentSearchItem}>
                <TouchableOpacity 
                  style={styles.recentSearchContent}
                  onPress={() => handleRecentSearchPress(search)}
                >
                  <Ionicons 
                    name={search.type === 'player' ? 'person' : (search.type === 'team' ? 'people' : 'trophy')} 
                    size={16} 
                    color="#adb5bd" 
                  />
                  <Text style={styles.recentSearchText}>{search.query}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleRemoveRecent(search.id)}>
                  <Ionicons name="close" size={20} color="#adb5bd" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>New Talents</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.talentsContainer}>
            {newTalents.map((talent) => (
              <TouchableOpacity 
                key={talent.uid} 
                style={styles.talentCard}
                onPress={() => router.push(`/user/${talent.username}`)}
              >
                <View style={styles.talentAvatar}>
                  <Text style={styles.talentAvatarText}>
                    {talent.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <Text style={styles.talentName} numberOfLines={1}>{talent.name.split(' ')[0]}</Text>
                <Text style={styles.talentRole}>{talent.role}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={styles.placeholderContainer}>
          <Ionicons name="search-outline" size={80} color="#e9ecef" />
          <Text style={styles.placeholderTitle}>Discover Crease</Text>
          <Text style={styles.placeholderSub}>Find players, teams, and matches in one place</Text>
        </View>
      </ScrollView>
    );
  };

  const renderResults = () => {
    if (loading) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      );
    }

    if (searchQuery && results.length === 0) {
      return (
        <View style={styles.centerContainer}>
          <Ionicons name="alert-circle-outline" size={60} color="#e9ecef" />
          <Text style={styles.emptyText}>No results found for "{searchQuery}"</Text>
        </View>
      );
    }

    return (
      <FlatList
        data={results}
        keyExtractor={(item, index) => item.uid || item.id || `team-${item.name}-${index}`}
        renderItem={({ item }) => {
          if (activeTab === 'player') {
            return <PlayerResultCard player={item} onPress={() => handleResultPress('player', item)} />;
          } else if (activeTab === 'team') {
            return <TeamResultCard teamName={item.name} onPress={(id: string) => handleResultPress('team', { ...item, lastMatchId: id })} />;
          } else {
            return <MatchResultCard match={item} onPress={() => handleResultPress('match', item)} />;
          }
        }}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Discover</Text>
        </View>

        <View style={styles.searchBox}>
          <Input
            placeholder={`Search ${activeTab}s...`}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            containerStyle={styles.inputContainer}
          />
        </View>

        <View style={styles.tabBar}>
          {renderTab('player', 'Players', 'person')}
          {renderTab('team', 'Teams', 'people')}
          {renderTab('match', 'Matches', 'trophy')}
        </View>

        <View style={styles.mainContainer}>
          {!searchQuery.trim() ? renderInitialView() : renderResults()}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa'
  },
  content: {
    flex: 1,
    padding: 16
  },
  header: {
    marginBottom: 20
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#1a1a1a',
    letterSpacing: 0.5
  },
  searchBox: {
    marginBottom: 16
  },
  inputContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 6,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8
  },
  activeTab: {
    backgroundColor: '#007AFF',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4
  },
  tabText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6c757d'
  },
  activeTabText: {
    color: '#fff'
  },
  mainContainer: {
    flex: 1
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40
  },
  section: {
    marginBottom: 24
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1a1a1a',
    letterSpacing: 0.3
  },
  clearAllText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#007AFF'
  },
  recentSearchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#f1f3f5'
  },
  recentSearchContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12
  },
  recentSearchText: {
    fontSize: 15,
    color: '#495057',
    fontWeight: '600'
  },
  talentsContainer: {
    gap: 16,
    paddingRight: 16
  },
  talentCard: {
    width: 100,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f1f3f5',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2
  },
  talentAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#E7F1FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8
  },
  talentAvatarText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#007AFF'
  },
  talentName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 2
  },
  talentRole: {
    fontSize: 11,
    color: '#6c757d',
    fontWeight: '600',
    textTransform: 'uppercase'
  },
  placeholderContainer: {
    alignItems: 'center',
    marginTop: 20,
    opacity: 0.8
  },
  placeholderTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#adb5bd',
    marginTop: 16
  },
  placeholderSub: {
    fontSize: 14,
    color: '#adb5bd',
    textAlign: 'center',
    marginTop: 4,
    maxWidth: 250
  },
  listContent: {
    paddingBottom: 20
  },
  emptyText: {
    fontSize: 16,
    color: '#adb5bd',
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 16
  }
});
