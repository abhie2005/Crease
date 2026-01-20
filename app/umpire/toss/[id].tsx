import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/providers/AuthProvider';
import { subscribeToMatch, updateToss } from '@/services/matches';
import { getUsersByUids } from '@/services/users';
import { Match } from '@/models/Match';
import { User } from '@/models/User';
import { Button } from '@/components/Button';

export default function TossScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { userProfile } = useAuth();
  const [match, setMatch] = useState<Match | null>(null);
  const [loading, setLoading] = useState(true);
  const [teamAPlayers, setTeamAPlayers] = useState<User[]>([]);
  const [teamBPlayers, setTeamBPlayers] = useState<User[]>([]);
  const [loadingPlayers, setLoadingPlayers] = useState(false);
  
  // Toss state
  const [tossWonBy, setTossWonBy] = useState<'teamA' | 'teamB' | null>(null);
  const [tossDecision, setTossDecision] = useState<'bat' | 'bowl' | null>(null);
  const [selectedBatsmen, setSelectedBatsmen] = useState<string[]>([]);
  const [onStrikeBatsman, setOnStrikeBatsman] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  
  const router = useRouter();

  useEffect(() => {
    if (!id) return;

    const unsubscribe = subscribeToMatch(id, (matchData) => {
      setMatch(matchData);
      setLoading(false);
    });

    return unsubscribe;
  }, [id]);

  useEffect(() => {
    if (!match) return;
    
    const fetchPlayers = async () => {
      try {
        setLoadingPlayers(true);
        
        const teamAUids = (match.teamA.playerUids || []).filter(uid => uid && uid.trim().length > 0);
        const teamBUids = (match.teamB.playerUids || []).filter(uid => uid && uid.trim().length > 0);
        
        const [playersA, playersB] = await Promise.all([
          teamAUids.length > 0 ? getUsersByUids(teamAUids) : Promise.resolve([]),
          teamBUids.length > 0 ? getUsersByUids(teamBUids) : Promise.resolve([])
        ]);
        
        setTeamAPlayers(playersA);
        setTeamBPlayers(playersB);
      } catch (error) {
        console.error('Error fetching players:', error);
        Alert.alert('Error', 'Failed to load team players');
      } finally {
        setLoadingPlayers(false);
      }
    };
    
    fetchPlayers();
  }, [match?.teamA.playerUids, match?.teamB.playerUids]);

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (!match) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Match not found</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.button}>
          <Text style={styles.buttonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!userProfile || match.umpireUid !== userProfile.uid) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Unauthorized: You are not the umpire for this match</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.button}>
          <Text style={styles.buttonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const battingTeam = tossWonBy && tossDecision 
    ? (tossDecision === 'bat' ? tossWonBy : (tossWonBy === 'teamA' ? 'teamB' : 'teamA'))
    : null;

  const battingTeamPlayers = battingTeam === 'teamA' ? teamAPlayers : battingTeam === 'teamB' ? teamBPlayers : [];
  const battingTeamName = battingTeam === 'teamA' ? match.teamA.name : battingTeam === 'teamB' ? match.teamB.name : '';

  const handleBatsmanSelect = (uid: string) => {
    if (selectedBatsmen.includes(uid)) {
      setSelectedBatsmen(selectedBatsmen.filter(b => b !== uid));
      if (onStrikeBatsman === uid) {
        setOnStrikeBatsman(null);
      }
    } else if (selectedBatsmen.length < 2) {
      setSelectedBatsmen([...selectedBatsmen, uid]);
      if (selectedBatsmen.length === 0) {
        setOnStrikeBatsman(uid); // First batsman is on strike by default
      }
    } else {
      Alert.alert('Maximum Batsmen', 'Only 2 batsmen can be on the crease at a time');
    }
  };

  const handleStartMatch = async () => {
    if (!tossWonBy || !tossDecision) {
      Alert.alert('Error', 'Please complete the toss selection');
      return;
    }

    if (selectedBatsmen.length !== 2) {
      Alert.alert('Error', 'Please select exactly 2 opening batsmen');
      return;
    }

    if (!onStrikeBatsman) {
      Alert.alert('Error', 'Please select which batsman is on strike');
      return;
    }

    try {
      setSaving(true);
      
      const openingBatsmen = selectedBatsmen.map(uid => ({
        uid,
        isOnStrike: uid === onStrikeBatsman
      }));

      await updateToss(
        id!,
        tossWonBy,
        tossDecision,
        battingTeam!,
        openingBatsmen
      );

      Alert.alert('Success', 'Match started successfully!', [
        {
          text: 'OK',
          onPress: () => router.replace(`/umpire/${id}`)
        }
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to start match');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.title}>Toss & Setup</Text>
      </View>

      <View style={styles.matchInfo}>
        <Text style={styles.matchTeams}>{match.teamA.name} vs {match.teamB.name}</Text>
        <Text style={styles.matchFormat}>{match.totalOvers} Overs Match</Text>
      </View>

      {/* Step 1: Toss Winner */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>1. Which team won the toss?</Text>
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.choiceButton, tossWonBy === 'teamA' && styles.choiceButtonActive]}
            onPress={() => setTossWonBy('teamA')}
          >
            <Text style={[styles.choiceButtonText, tossWonBy === 'teamA' && styles.choiceButtonTextActive]}>
              {match.teamA.name}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.choiceButton, tossWonBy === 'teamB' && styles.choiceButtonActive]}
            onPress={() => setTossWonBy('teamB')}
          >
            <Text style={[styles.choiceButtonText, tossWonBy === 'teamB' && styles.choiceButtonTextActive]}>
              {match.teamB.name}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Step 2: Toss Decision */}
      {tossWonBy && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            2. {tossWonBy === 'teamA' ? match.teamA.name : match.teamB.name} chose to:
          </Text>
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.choiceButton, tossDecision === 'bat' && styles.choiceButtonActive]}
              onPress={() => setTossDecision('bat')}
            >
              <Ionicons 
                name="baseball" 
                size={24} 
                color={tossDecision === 'bat' ? '#fff' : '#007AFF'} 
              />
              <Text style={[styles.choiceButtonText, tossDecision === 'bat' && styles.choiceButtonTextActive]}>
                Bat First
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.choiceButton, tossDecision === 'bowl' && styles.choiceButtonActive]}
              onPress={() => setTossDecision('bowl')}
            >
              <Ionicons 
                name="football" 
                size={24} 
                color={tossDecision === 'bowl' ? '#fff' : '#007AFF'} 
              />
              <Text style={[styles.choiceButtonText, tossDecision === 'bowl' && styles.choiceButtonTextActive]}>
                Bowl First
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Step 3: Select Opening Batsmen */}
      {battingTeam && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            3. Select opening batsmen for {battingTeamName}
          </Text>
          <Text style={styles.sectionSubtitle}>
            Select 2 batsmen ({selectedBatsmen.length}/2 selected)
          </Text>
          
          {loadingPlayers ? (
            <ActivityIndicator size="small" color="#007AFF" style={{ marginTop: 16 }} />
          ) : (
            <View style={styles.playersList}>
              {battingTeamPlayers.map((player) => (
                <TouchableOpacity
                  key={player.uid}
                  style={[
                    styles.playerItem,
                    selectedBatsmen.includes(player.uid) && styles.playerItemSelected
                  ]}
                  onPress={() => handleBatsmanSelect(player.uid)}
                >
                  <View style={styles.playerItemContent}>
                    <View style={styles.playerAvatar}>
                      <Text style={styles.playerAvatarText}>
                        {player.name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.playerInfo}>
                      <Text style={styles.playerName}>{player.name}</Text>
                      {player.username && (
                        <Text style={styles.playerUsername}>@{player.username}</Text>
                      )}
                    </View>
                  </View>
                  {selectedBatsmen.includes(player.uid) && (
                    <Ionicons name="checkmark-circle" size={24} color="#34C759" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      )}

      {/* Step 4: Select On-Strike Batsman */}
      {selectedBatsmen.length === 2 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>4. Who will face the first ball?</Text>
          <View style={styles.playersList}>
            {selectedBatsmen.map((uid) => {
              const player = battingTeamPlayers.find(p => p.uid === uid);
              if (!player) return null;
              
              return (
                <TouchableOpacity
                  key={uid}
                  style={[
                    styles.playerItem,
                    onStrikeBatsman === uid && styles.playerItemOnStrike
                  ]}
                  onPress={() => setOnStrikeBatsman(uid)}
                >
                  <View style={styles.playerItemContent}>
                    <View style={styles.playerAvatar}>
                      <Text style={styles.playerAvatarText}>
                        {player.name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.playerInfo}>
                      <Text style={styles.playerName}>{player.name}</Text>
                      {onStrikeBatsman === uid && (
                        <Text style={styles.onStrikeLabel}>On Strike</Text>
                      )}
                    </View>
                  </View>
                  {onStrikeBatsman === uid && (
                    <Ionicons name="radio-button-on" size={24} color="#FF9500" />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}

      {/* Start Match Button */}
      {selectedBatsmen.length === 2 && onStrikeBatsman && (
        <View style={styles.section}>
          <Button
            title="Start Match"
            onPress={handleStartMatch}
            loading={saving}
          />
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5'
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20
  },
  backButton: {
    marginRight: 12
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333'
  },
  matchInfo: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    alignItems: 'center'
  },
  matchTeams: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4
  },
  matchFormat: {
    fontSize: 14,
    color: '#666'
  },
  section: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12
  },
  choiceButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#007AFF',
    backgroundColor: '#fff'
  },
  choiceButtonActive: {
    backgroundColor: '#007AFF'
  },
  choiceButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF'
  },
  choiceButtonTextActive: {
    color: '#fff'
  },
  playersList: {
    gap: 8
  },
  playerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    backgroundColor: '#fff'
  },
  playerItemSelected: {
    borderColor: '#34C759',
    backgroundColor: '#f0fdf4'
  },
  playerItemOnStrike: {
    borderColor: '#FF9500',
    backgroundColor: '#fff9f0'
  },
  playerItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  playerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  playerAvatarText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600'
  },
  playerInfo: {
    flex: 1
  },
  playerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333'
  },
  playerUsername: {
    fontSize: 14,
    color: '#666'
  },
  onStrikeLabel: {
    fontSize: 12,
    color: '#FF9500',
    fontWeight: '600'
  },
  errorText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    marginBottom: 16
  },
  button: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#007AFF',
    borderRadius: 8
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600'
  }
});
