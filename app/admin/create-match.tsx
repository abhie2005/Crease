/**
 * Admin create-match screen.
 * Allows admins/presidents to create a match with teams, players, umpire, overs, and optional scheduling.
 */
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Switch,
  ActivityIndicator,
  FlatList
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/providers/AuthProvider';
import { createMatch, updateMatchStatus } from '@/services/matches';
import { searchUsersByUsername } from '@/services/users';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { DateTimePicker } from '@/components/DateTimePicker';
import { User } from '@/models/User';

/**
 * Screen for creating a new match. Restricted to admin/president.
 * Handles team names, player selection (Team A/B), umpire selection, total overs,
 * optional scheduling, and optional start-immediately. Uses createMatch and updateMatchStatus.
 */
export default function CreateMatchScreen() {
  const { userProfile } = useAuth();
  const [teamAName, setTeamAName] = useState('');
  const [teamBName, setTeamBName] = useState('');
  const [umpireUid, setUmpireUid] = useState('');
  const [selectedUmpire, setSelectedUmpire] = useState<User | null>(null);
  const [teamAPlayers, setTeamAPlayers] = useState<User[]>([]);
  const [teamBPlayers, setTeamBPlayers] = useState<User[]>([]);
  const [totalOvers, setTotalOvers] = useState('20');
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledDate, setScheduledDate] = useState<Date | null>(null);
  const [startImmediately, setStartImmediately] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Search states
  const [activeTeam, setActiveTeam] = useState<'A' | 'B' | null>(null);
  const [umpireSearchOpen, setUmpireSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [searching, setSearching] = useState(false);
  
  const router = useRouter();

  // Check authorization
  if (!userProfile || (userProfile.role !== 'admin' && userProfile.role !== 'president')) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Unauthorized access</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Debounced search
  useEffect(() => {
    if (!searchQuery.trim() || (!activeTeam && !umpireSearchOpen)) {
      setSearchResults([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    const timeoutId = setTimeout(async () => {
      try {
        const results = await searchUsersByUsername(
          searchQuery.trim(),
          userProfile?.uid,
          10
        );
        
        if (activeTeam) {
          // Filter out players already in BOTH teams (can't be on both teams)
          const teamAUids = teamAPlayers.map(p => p.uid);
          const teamBUids = teamBPlayers.map(p => p.uid);
          const allSelectedUids = [...teamAUids, ...teamBUids];
          
          const filteredResults = results.filter(user => !allSelectedUids.includes(user.uid));
          setSearchResults(filteredResults);
        } else {
          // For umpire search, show all results
          setSearchResults(results);
        }
      } catch (error) {
        console.error('Search error:', error);
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, activeTeam, umpireSearchOpen, teamAPlayers, teamBPlayers, userProfile?.uid]);

  const handleAddPlayer = (player: User) => {
    if (activeTeam === 'A') {
      setTeamAPlayers([...teamAPlayers, player]);
    } else if (activeTeam === 'B') {
      setTeamBPlayers([...teamBPlayers, player]);
    }
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleRemovePlayer = (playerId: string, team: 'A' | 'B') => {
    if (team === 'A') {
      setTeamAPlayers(teamAPlayers.filter(p => p.uid !== playerId));
    } else {
      setTeamBPlayers(teamBPlayers.filter(p => p.uid !== playerId));
    }
  };

  const openPlayerSearch = (team: 'A' | 'B') => {
    setActiveTeam(team);
    setSearchQuery('');
    setSearchResults([]);
  };

  const closePlayerSearch = () => {
    setActiveTeam(null);
    setSearchQuery('');
    setSearchResults([]);
  };

  const openUmpireSearch = () => {
    setUmpireSearchOpen(true);
    setSearchQuery('');
    setSearchResults([]);
  };

  const closeUmpireSearch = () => {
    setUmpireSearchOpen(false);
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleSelectUmpire = (user: User) => {
    setSelectedUmpire(user);
    setUmpireUid(user.uid);
    closeUmpireSearch();
  };

  const handleRemoveUmpire = () => {
    setSelectedUmpire(null);
    setUmpireUid('');
  };

  const handleCreate = async () => {
    if (!teamAName.trim() || !teamBName.trim()) {
      Alert.alert('Error', 'Please fill in team names');
      return;
    }

    if (!selectedUmpire) {
      Alert.alert('Error', 'Please select an umpire');
      return;
    }

    if (!totalOvers || parseInt(totalOvers) <= 0) {
      Alert.alert('Error', 'Please enter valid total overs (must be greater than 0)');
      return;
    }

    if (teamAPlayers.length < 2 || teamBPlayers.length < 2) {
      Alert.alert('Error', 'Please add at least 2 players to each team (for opening batsmen)');
      return;
    }

    // If scheduling is enabled, ensure a date is selected
    if (isScheduled && !scheduledDate) {
      Alert.alert('Error', 'Please select a date and time or turn off scheduling');
      return;
    }

    setLoading(true);
    let matchId: string | null = null;
    
    try {
      const teamAPlayerUids = teamAPlayers.map(p => p.uid);
      const teamBPlayerUids = teamBPlayers.map(p => p.uid);

      matchId = await createMatch(
        userProfile.uid,
        umpireUid.trim(),
        { name: teamAName.trim(), playerUids: teamAPlayerUids },
        { name: teamBName.trim(), playerUids: teamBPlayerUids },
        parseInt(totalOvers),
        isScheduled && scheduledDate ? scheduledDate : undefined
      );

      // If "start immediately" is checked, update match status to live
      if (startImmediately && !isScheduled) {
        try {
          await updateMatchStatus(matchId, 'live');
          
          Alert.alert('Success', 'Match created and started successfully! 🏏', [
            {
              text: 'OK',
              onPress: () => router.push(`/match/${matchId}`)
            }
          ]);
        } catch (statusError: any) {
          // Match was created but failed to start - inform user and navigate to match
          Alert.alert(
            'Partial Success',
            `Match created successfully, but failed to start it automatically: ${statusError.message || 'Unknown error'}\n\nYou can start it manually from the match page.`,
            [
              {
                text: 'OK',
                onPress: () => router.push(`/match/${matchId}`)
              }
            ]
          );
        }
      } else {
        // No auto-start, just show success
        Alert.alert('Success', 'Match created successfully', [
          {
            text: 'OK',
            onPress: () => router.push(`/match/${matchId}`)
          }
        ]);
      }
    } catch (error: any) {
      // Only reaches here if createMatch fails
      Alert.alert('Error', error.message || 'Failed to create match');
    } finally {
      setLoading(false);
    }
  };

  const renderSelectedPlayer = (player: User, team: 'A' | 'B') => (
    <View key={player.uid} style={styles.playerChip}>
      <View style={styles.playerChipAvatar}>
        <Text style={styles.playerChipAvatarText}>
          {player.name.charAt(0).toUpperCase()}
        </Text>
      </View>
      <View style={styles.playerChipInfo}>
        <Text style={styles.playerChipName}>{player.name}</Text>
        {player.username && (
          <Text style={styles.playerChipUsername}>@{player.username}</Text>
        )}
      </View>
      <TouchableOpacity
        onPress={() => handleRemovePlayer(player.uid, team)}
        style={styles.removeButton}
      >
        <Ionicons name="close-circle" size={20} color="#FF3B30" />
      </TouchableOpacity>
    </View>
  );

  const renderSearchResult = (user: User) => (
    <TouchableOpacity
      key={user.uid}
      style={styles.searchResultItem}
      onPress={() => handleAddPlayer(user)}
      activeOpacity={0.7}
    >
      <View style={styles.searchResultAvatar}>
        <Text style={styles.searchResultAvatarText}>
          {user.name.charAt(0).toUpperCase()}
        </Text>
      </View>
      <View style={styles.searchResultInfo}>
        <Text style={styles.searchResultName}>{user.name}</Text>
        {user.username && (
          <Text style={styles.searchResultUsername}>@{user.username}</Text>
        )}
        <Text style={styles.searchResultRole}>{user.role}</Text>
      </View>
      <View style={styles.addIconContainer}>
        <Ionicons name="add-circle" size={28} color="#34C759" />
      </View>
    </TouchableOpacity>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={styles.scrollView} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create Match</Text>
        </View>

        <View style={styles.content}>
          <Text style={styles.sectionTitle}>Match Details</Text>

          <View style={styles.scheduleRow}>
            <Text style={styles.scheduleLabel}>Schedule this match</Text>
            <Switch
              value={isScheduled}
              onValueChange={(value) => {
                setIsScheduled(value);
                if (value) {
                  setStartImmediately(false); // Disable start immediately if scheduling
                }
              }}
            />
          </View>

          {isScheduled && (
            <DateTimePicker
              label="Select date and time"
              value={scheduledDate}
              onChange={setScheduledDate}
            />
          )}

          {!isScheduled && (
            <View style={styles.startImmediatelyContainer}>
              <View style={styles.scheduleRow}>
                <View style={styles.startImmediatelyTextContainer}>
                  <Text style={styles.scheduleLabel}>Start match immediately</Text>
                  <Text style={styles.helperText}>
                    Match will be LIVE right after creation
                  </Text>
                </View>
                <Switch
                  value={startImmediately}
                  onValueChange={setStartImmediately}
                />
              </View>
            </View>
          )}

          <Input
            label="Team A Name"
            value={teamAName}
            onChangeText={setTeamAName}
            placeholder="Enter team A name"
            autoCapitalize="words"
          />

          {/* Team A Players */}
          <View style={styles.playersSection}>
            <View style={styles.playersSectionHeader}>
              <Text style={styles.playersSectionTitle}>
                Team A Players ({teamAPlayers.length})
              </Text>
              <TouchableOpacity
                style={styles.addPlayerButton}
                onPress={() => openPlayerSearch('A')}
              >
                <Ionicons name="add-circle" size={24} color="#007AFF" />
                <Text style={styles.addPlayerText}>Add Player</Text>
              </TouchableOpacity>
            </View>
            
            {teamAPlayers.length > 0 ? (
              <View style={styles.selectedPlayersList}>
                {teamAPlayers.map(player => renderSelectedPlayer(player, 'A'))}
              </View>
            ) : (
              <Text style={styles.noPlayersText}>No players added yet</Text>
            )}
          </View>

          <Input
            label="Team B Name"
            value={teamBName}
            onChangeText={setTeamBName}
            placeholder="Enter team B name"
            autoCapitalize="words"
          />

          {/* Team B Players */}
          <View style={styles.playersSection}>
            <View style={styles.playersSectionHeader}>
              <Text style={styles.playersSectionTitle}>
                Team B Players ({teamBPlayers.length})
              </Text>
              <TouchableOpacity
                style={styles.addPlayerButton}
                onPress={() => openPlayerSearch('B')}
              >
                <Ionicons name="add-circle" size={24} color="#007AFF" />
                <Text style={styles.addPlayerText}>Add Player</Text>
              </TouchableOpacity>
            </View>
            
            {teamBPlayers.length > 0 ? (
              <View style={styles.selectedPlayersList}>
                {teamBPlayers.map(player => renderSelectedPlayer(player, 'B'))}
              </View>
            ) : (
              <Text style={styles.noPlayersText}>No players added yet</Text>
            )}
          </View>

          {/* Umpire Selection */}
          <View style={styles.playersSection}>
            <View style={styles.playersSectionHeader}>
              <Text style={styles.playersSectionTitle}>
                Umpire {selectedUmpire ? '(1)' : '(Required)'}
              </Text>
              {!selectedUmpire && (
                <TouchableOpacity
                  style={styles.addPlayerButton}
                  onPress={openUmpireSearch}
                >
                  <Ionicons name="add-circle" size={24} color="#007AFF" />
                  <Text style={styles.addPlayerText}>Select Umpire</Text>
                </TouchableOpacity>
              )}
            </View>
            
            {selectedUmpire ? (
              <View style={styles.selectedPlayersList}>
                <View style={styles.playerChip}>
                  <View style={styles.playerChipAvatar}>
                    <Text style={styles.playerChipAvatarText}>
                      {selectedUmpire.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.playerChipInfo}>
                    <Text style={styles.playerChipName}>{selectedUmpire.name}</Text>
                    {selectedUmpire.username && (
                      <Text style={styles.playerChipUsername}>@{selectedUmpire.username}</Text>
                    )}
                  </View>
                  <TouchableOpacity
                    onPress={handleRemoveUmpire}
                    style={styles.removeButton}
                  >
                    <Ionicons name="close-circle" size={20} color="#FF3B30" />
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <Text style={styles.noPlayersText}>No umpire selected</Text>
            )}
          </View>

          <Input
            label="Total Overs"
            value={totalOvers}
            onChangeText={setTotalOvers}
            keyboardType="numeric"
            placeholder="Enter total overs (e.g., 20 for T20)"
          />

          <Button
            title="Create Match"
            onPress={handleCreate}
            loading={loading}
            disabled={loading}
          />
        </View>
      </ScrollView>

      {/* Player Search Modal Overlay */}
      {activeTeam && (
        <TouchableOpacity 
          style={styles.searchOverlay} 
          activeOpacity={1} 
          onPress={closePlayerSearch}
        >
          <TouchableOpacity 
            style={styles.searchModal} 
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.searchModalHeader}>
              <View style={styles.searchModalTitleContainer}>
                <Text style={styles.searchModalTitle}>
                  Add Player to Team {activeTeam}
                </Text>
                <Text style={styles.searchModalSubtitle}>
                  Players can only be on one team
                </Text>
              </View>
              <TouchableOpacity onPress={closePlayerSearch}>
                <Ionicons name="close" size={28} color="#333" />
              </TouchableOpacity>
            </View>

            <View style={styles.searchInputContainer}>
              <Input
                placeholder="Search by username..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCapitalize="none"
              />
            </View>

            <ScrollView style={styles.searchResultsContainer} contentContainerStyle={styles.searchResultsContent}>
              {searching && (
                <View style={styles.searchLoader}>
                  <ActivityIndicator size="large" color="#007AFF" />
                  <Text style={styles.searchLoadingText}>Searching...</Text>
                </View>
              )}

              {!searching && searchQuery.trim() && searchResults.length === 0 && (
                <View style={styles.searchEmptyState}>
                  <Ionicons name="search-outline" size={48} color="#ccc" />
                  <Text style={styles.searchEmptyText}>No users found</Text>
                  <Text style={styles.searchEmptySubtext}>Try searching by username</Text>
                </View>
              )}

              {!searching && !searchQuery.trim() && (
                <View style={styles.searchEmptyState}>
                  <Ionicons name="people-outline" size={48} color="#ccc" />
                  <Text style={styles.searchPlaceholderText}>
                    Start typing to search for players...
                  </Text>
                  <Text style={styles.searchEmptySubtext}>Search by @username</Text>
                </View>
              )}

              {!searching && searchResults.length > 0 && (
                <>
                  <Text style={styles.searchResultsCount}>
                    Found {searchResults.length} player{searchResults.length !== 1 ? 's' : ''}
                  </Text>
                  {searchResults.map((item) => renderSearchResult(item))}
                </>
              )}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      )}

      {/* Umpire Search Modal */}
      {umpireSearchOpen && (
        <TouchableOpacity 
          style={styles.searchOverlay} 
          activeOpacity={1} 
          onPress={closeUmpireSearch}
        >
          <TouchableOpacity 
            style={styles.searchModal} 
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.searchModalHeader}>
              <View style={styles.searchModalTitleContainer}>
                <Text style={styles.searchModalTitle}>
                  Select Umpire
                </Text>
                <Text style={styles.searchModalSubtitle}>
                  Choose a user to be the match umpire
                </Text>
              </View>
              <TouchableOpacity onPress={closeUmpireSearch}>
                <Ionicons name="close" size={28} color="#333" />
              </TouchableOpacity>
            </View>

            <View style={styles.searchInputContainer}>
              <Input
                placeholder="Search by username..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCapitalize="none"
              />
            </View>

            <ScrollView style={styles.searchResultsContainer} contentContainerStyle={styles.searchResultsContent}>
              {searching && (
                <View style={styles.searchLoader}>
                  <ActivityIndicator size="large" color="#007AFF" />
                  <Text style={styles.searchLoadingText}>Searching...</Text>
                </View>
              )}

              {!searching && searchQuery.trim() && searchResults.length === 0 && (
                <View style={styles.searchEmptyState}>
                  <Ionicons name="search-outline" size={48} color="#ccc" />
                  <Text style={styles.searchEmptyText}>No users found</Text>
                  <Text style={styles.searchEmptySubtext}>Try searching by username</Text>
                </View>
              )}

              {!searching && !searchQuery.trim() && (
                <View style={styles.searchEmptyState}>
                  <Ionicons name="person-outline" size={48} color="#ccc" />
                  <Text style={styles.searchPlaceholderText}>
                    Start typing to search for an umpire...
                  </Text>
                  <Text style={styles.searchEmptySubtext}>Search by @username</Text>
                </View>
              )}

              {!searching && searchResults.length > 0 && (
                <>
                  <Text style={styles.searchResultsCount}>
                    Found {searchResults.length} user{searchResults.length !== 1 ? 's' : ''}
                  </Text>
                  {searchResults.map((item) => (
                    <TouchableOpacity
                      key={item.uid}
                      style={styles.searchResultItem}
                      onPress={() => handleSelectUmpire(item)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.searchResultAvatar}>
                        <Text style={styles.searchResultAvatarText}>
                          {item.name.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <View style={styles.searchResultInfo}>
                        <Text style={styles.searchResultName}>{item.name}</Text>
                        {item.username && (
                          <Text style={styles.searchResultUsername}>@{item.username}</Text>
                        )}
                        <Text style={styles.searchResultRole}>{item.role}</Text>
                      </View>
                      <View style={styles.addIconContainer}>
                        <Ionicons name="checkmark-circle" size={28} color="#34C759" />
                      </View>
                    </TouchableOpacity>
                  ))}
                </>
              )}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5'
  },
  scrollView: {
    flex: 1
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 24
  },
  header: {
    backgroundColor: '#fff',
    padding: 16,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0'
  },
  backButton: {
    paddingVertical: 8,
    marginBottom: 8
  },
  backButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600'
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333'
  },
  content: {
    padding: 16
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333'
  },
  scheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12
  },
  scheduleLabel: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500'
  },
  startImmediatelyContainer: {
    backgroundColor: '#F0F8FF',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#D0E8FF'
  },
  startImmediatelyTextContainer: {
    flex: 1,
    marginRight: 12
  },
  helperText: {
    fontSize: 13,
    color: '#666',
    marginTop: 4
  },
  errorText: {
    fontSize: 18,
    color: '#999',
    marginBottom: 16,
    textAlign: 'center'
  },
  playersSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2
  },
  playersSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0'
  },
  playersSectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#333'
  },
  addPlayerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F0F8FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20
  },
  addPlayerText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '600'
  },
  selectedPlayersList: {
    gap: 10
  },
  noPlayersText: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 20,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    borderStyle: 'dashed'
  },
  playerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0'
  },
  playerChipAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#34C759',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  playerChipAvatarText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff'
  },
  playerChipInfo: {
    flex: 1
  },
  playerChipName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 3
  },
  playerChipUsername: {
    fontSize: 13,
    color: '#666'
  },
  removeButton: {
    padding: 6
  },
  // Search Modal Styles
  searchOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000
  },
  searchModal: {
    backgroundColor: '#fff',
    borderRadius: 12,
    width: '90%',
    height: '70%',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5
  },
  searchModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#fff'
  },
  searchModalTitleContainer: {
    flex: 1,
    marginRight: 12
  },
  searchModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4
  },
  searchModalSubtitle: {
    fontSize: 13,
    color: '#666',
    fontStyle: 'italic'
  },
  searchInputContainer: {
    padding: 16,
    paddingBottom: 8,
    backgroundColor: '#fff'
  },
  searchResultsContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5'
  },
  searchResultsContent: {
    padding: 12,
    flexGrow: 1
  },
  searchResultsCount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 12,
    paddingHorizontal: 4
  },
  searchLoader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60
  },
  searchLoadingText: {
    fontSize: 14,
    color: '#999',
    marginTop: 12
  },
  searchEmptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20
  },
  searchEmptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
    marginBottom: 8
  },
  searchEmptySubtext: {
    fontSize: 13,
    color: '#999'
  },
  searchPlaceholderText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 8
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginBottom: 8,
    backgroundColor: '#fff',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2
  },
  searchResultAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  searchResultAvatarText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff'
  },
  searchResultInfo: {
    flex: 1
  },
  searchResultName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 3
  },
  searchResultUsername: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2
  },
  searchResultRole: {
    fontSize: 12,
    color: '#999',
    textTransform: 'capitalize'
  },
  addIconContainer: {
    padding: 4
  }
});
