/**
 * Toss and match setup screen for the umpire.
 * Coin flip, toss winner/decision, opening batsmen selection, and on-strike choice before starting the match.
 */
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StatusBar
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaHeader } from '@/hooks/useSafeAreaHeader';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/providers/AuthProvider';
import { subscribeToMatch, updateToss } from '@/services/matches';
import { getUsersByUids } from '@/services/users';
import { Match } from '@/models/Match';
import { User } from '@/models/User';
import { Button } from '@/components/Button';
import { ThemedBackground } from '@/components/ThemedBackground';
import { useTheme } from '@/providers/ThemeProvider';

/**
 * Toss screen for the match umpire (route param: match id). Conduct toss (winner + bat/bowl),
 * select two opening batsmen and who is on strike, then call updateToss to start the match.
 */
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
  
  // Coin flip state
  const [coinFlipping, setCoinFlipping] = useState(false);
  const [coinResult, setCoinResult] = useState<'heads' | 'tails' | null>(null);
  const [showCoinResult, setShowCoinResult] = useState(false);
  
  const router = useRouter();
  const { headerStyle } = useSafeAreaHeader();
  const { theme, colors } = useTheme();

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
      <ThemedBackground style={styles.centerContainer}>
        <StatusBar barStyle={theme === 'dark' ? 'light-content' : 'dark-content'} />
        <ActivityIndicator size="large" color={colors.accent} />
      </ThemedBackground>
    );
  }

  if (!match) {
    return (
      <ThemedBackground style={styles.centerContainer}>
        <StatusBar barStyle={theme === 'dark' ? 'light-content' : 'dark-content'} />
        <Text style={[styles.errorText, { color: colors.textTertiary }]}>Match not found</Text>
        <TouchableOpacity onPress={() => router.back()} style={[styles.button, { backgroundColor: colors.accent }]}>
          <Text style={styles.buttonText}>Go Back</Text>
        </TouchableOpacity>
      </ThemedBackground>
    );
  }

  if (!userProfile || match.umpireUid !== userProfile.uid) {
    return (
      <ThemedBackground style={styles.centerContainer}>
        <StatusBar barStyle={theme === 'dark' ? 'light-content' : 'dark-content'} />
        <Text style={[styles.errorText, { color: colors.textTertiary }]}>Unauthorized: You are not the umpire for this match</Text>
        <TouchableOpacity onPress={() => router.back()} style={[styles.button, { backgroundColor: colors.accent }]}>
          <Text style={styles.buttonText}>Go Back</Text>
        </TouchableOpacity>
      </ThemedBackground>
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

  const flipCoin = () => {
    setCoinFlipping(true);
    setCoinResult(null);
    setShowCoinResult(false);
    
    // Simulate coin flip animation
    setTimeout(() => {
      const result = Math.random() < 0.5 ? 'heads' : 'tails';
      setCoinResult(result);
      setCoinFlipping(false);
      setShowCoinResult(true);
    }, 1500);
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
    <ThemedBackground style={styles.container}>
      <StatusBar barStyle={theme === 'dark' ? 'light-content' : 'dark-content'} />
      <ScrollView contentContainerStyle={styles.contentContainer}>
        <View style={[styles.header, headerStyle]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.accent} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Toss & Setup</Text>
        </View>

        <View style={[styles.matchInfo, { backgroundColor: colors.cardBg }]}>
          <Text style={[styles.matchTeams, { color: colors.textPrimary }]}>{match.teamA.name} vs {match.teamB.name}</Text>
          <Text style={[styles.matchFormat, { color: colors.textSecondary }]}>{match.totalOvers} Overs Match</Text>
        </View>

        {/* Coin Flip */}
        <View style={[styles.section, { backgroundColor: colors.cardBg }]}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Flip Coin</Text>
          <TouchableOpacity
            style={[styles.coinButton, { backgroundColor: colors.gridButton, borderColor: '#FFD700' }]}
            onPress={flipCoin}
            disabled={coinFlipping}
          >
            {coinFlipping ? (
              <ActivityIndicator size="large" color="#FFD700" />
            ) : (
              <Ionicons name="disc" size={64} color="#FFD700" />
            )}
            <Text style={[styles.coinButtonText, { color: colors.textPrimary }]}>
              {coinFlipping ? 'Flipping...' : 'Tap to Flip Coin'}
            </Text>
          </TouchableOpacity>
          
          {showCoinResult && coinResult && (
            <View style={[styles.coinResultCard, { backgroundColor: colors.selected, borderColor: colors.selectedBorder }]}>
              <Ionicons 
                name={coinResult === 'heads' ? 'arrow-up-circle' : 'arrow-down-circle'} 
                size={48} 
                color={colors.selectedBorder} 
              />
              <Text style={[styles.coinResultText, { color: colors.selectedBorder }]}>
                Result: {coinResult.toUpperCase()}
              </Text>
            </View>
          )}
        </View>

        {/* Step 1: Toss Winner */}
        <View style={[styles.section, { backgroundColor: colors.cardBg }]}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>1. Which team won the toss?</Text>
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.choiceButton, { borderColor: colors.accent, backgroundColor: colors.cardBgElevated }, tossWonBy === 'teamA' && { backgroundColor: colors.accent }]}
              onPress={() => setTossWonBy('teamA')}
            >
              <Text style={[styles.choiceButtonText, { color: colors.accent }, tossWonBy === 'teamA' && { color: '#fff' }]}>
                {match.teamA.name}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.choiceButton, { borderColor: colors.accent, backgroundColor: colors.cardBgElevated }, tossWonBy === 'teamB' && { backgroundColor: colors.accent }]}
              onPress={() => setTossWonBy('teamB')}
            >
              <Text style={[styles.choiceButtonText, { color: colors.accent }, tossWonBy === 'teamB' && { color: '#fff' }]}>
                {match.teamB.name}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Step 2: Toss Decision */}
        {tossWonBy && (
          <View style={[styles.section, { backgroundColor: colors.cardBg }]}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              2. {tossWonBy === 'teamA' ? match.teamA.name : match.teamB.name} chose to:
            </Text>
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.choiceButton, { borderColor: colors.accent, backgroundColor: colors.cardBgElevated }, tossDecision === 'bat' && { backgroundColor: colors.accent }]}
                onPress={() => setTossDecision('bat')}
              >
                <Ionicons 
                  name="baseball" 
                  size={24} 
                  color={tossDecision === 'bat' ? '#fff' : colors.accent} 
                />
                <Text style={[styles.choiceButtonText, { color: colors.accent }, tossDecision === 'bat' && { color: '#fff' }]}>
                  Bat First
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.choiceButton, { borderColor: colors.accent, backgroundColor: colors.cardBgElevated }, tossDecision === 'bowl' && { backgroundColor: colors.accent }]}
                onPress={() => setTossDecision('bowl')}
              >
                <Ionicons 
                  name="football" 
                  size={24} 
                  color={tossDecision === 'bowl' ? '#fff' : colors.accent} 
                />
                <Text style={[styles.choiceButtonText, { color: colors.accent }, tossDecision === 'bowl' && { color: '#fff' }]}>
                  Bowl First
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Step 3: Select Opening Batsmen */}
        {battingTeam && (
          <View style={[styles.section, { backgroundColor: colors.cardBg }]}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              3. Select opening batsmen for {battingTeamName}
            </Text>
            <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
              Select 2 batsmen ({selectedBatsmen.length}/2 selected)
            </Text>
            
            {loadingPlayers ? (
              <ActivityIndicator size="small" color={colors.accent} style={{ marginTop: 16 }} />
            ) : (
              <View style={styles.playersList}>
                {battingTeamPlayers.map((player) => {
                  const isSelected = selectedBatsmen.includes(player.uid);
                  return (
                    <TouchableOpacity
                      key={player.uid}
                      style={[
                        styles.playerItem,
                        { backgroundColor: colors.cardBgElevated, borderColor: colors.borderDefault },
                        isSelected && { backgroundColor: colors.selected, borderColor: colors.selectedBorder }
                      ]}
                      onPress={() => handleBatsmanSelect(player.uid)}
                    >
                      <View style={styles.playerItemContent}>
                        <View style={[styles.playerAvatar, { backgroundColor: colors.accent }]}>
                          <Text style={styles.playerAvatarText}>
                            {player.name.charAt(0).toUpperCase()}
                          </Text>
                        </View>
                        <View style={styles.playerInfo}>
                          <Text style={[styles.playerName, { color: colors.textPrimary }]}>{player.name}</Text>
                          {player.username && (
                            <Text style={[styles.playerUsername, { color: colors.textSecondary }]}>@{player.username}</Text>
                          )}
                        </View>
                      </View>
                      {isSelected && (
                        <Ionicons name="checkmark-circle" size={24} color={colors.selectedBorder} />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        )}

        {/* Step 4: Select On-Strike Batsman */}
        {selectedBatsmen.length === 2 && (
          <View style={[styles.section, { backgroundColor: colors.cardBg }]}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>4. Who will face the first ball?</Text>
            <View style={styles.playersList}>
              {selectedBatsmen.map((uid) => {
                const player = battingTeamPlayers.find(p => p.uid === uid);
                if (!player) return null;
                
                return (
                  <TouchableOpacity
                    key={uid}
                    style={[
                      styles.playerItem,
                      { backgroundColor: colors.cardBgElevated, borderColor: colors.borderDefault },
                      onStrikeBatsman === uid && { backgroundColor: colors.strikeHighlight, borderColor: colors.strikeBorder }
                    ]}
                    onPress={() => setOnStrikeBatsman(uid)}
                  >
                    <View style={styles.playerItemContent}>
                      <View style={[styles.playerAvatar, { backgroundColor: colors.accent }]}>
                        <Text style={styles.playerAvatarText}>
                          {player.name.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <View style={styles.playerInfo}>
                        <Text style={[styles.playerName, { color: colors.textPrimary }]}>{player.name}</Text>
                        {onStrikeBatsman === uid && (
                          <Text style={[styles.onStrikeLabel, { color: colors.strikeBorder }]}>On Strike</Text>
                        )}
                      </View>
                    </View>
                    {onStrikeBatsman === uid && (
                      <Ionicons name="radio-button-on" size={24} color={colors.strikeBorder} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* Start Match Button */}
        {selectedBatsmen.length === 2 && onStrikeBatsman && (
          <View style={[styles.section, { backgroundColor: colors.cardBg }]}>
            <Button
              title="Start Match"
              onPress={handleStartMatch}
              loading={saving}
            />
          </View>
        )}
      </ScrollView>
    </ThemedBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  },
  matchInfo: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    alignItems: 'center'
  },
  matchTeams: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4
  },
  matchFormat: {
    fontSize: 14,
  },
  section: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12
  },
  sectionSubtitle: {
    fontSize: 14,
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
  },
  choiceButtonText: {
    fontSize: 16,
    fontWeight: '600',
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
  },
  playerUsername: {
    fontSize: 14,
  },
  onStrikeLabel: {
    fontSize: 12,
    fontWeight: '600'
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16
  },
  button: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600'
  },
  coinButton: {
    padding: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  coinButtonText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 12
  },
  coinResultCard: {
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    gap: 8
  },
  coinResultText: {
    fontSize: 20,
    fontWeight: '700',
  }
});
