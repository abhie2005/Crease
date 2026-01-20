import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  Modal
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/providers/AuthProvider';
import { 
  subscribeToMatch, 
  updateMatchStatus, 
  addRuns as addRunsService, 
  addDotBall as addDotBallService,
  addWide as addWideService,
  addNoBall as addNoBallService,
  addWicket as addWicketService,
  switchInnings
} from '@/services/matches';
import { getUsersByUids } from '@/services/users';
import { Match } from '@/models/Match';
import { User } from '@/models/User';
import { CountdownTimer } from '@/components/CountdownTimer';
import { Button } from '@/components/Button';

export default function UmpireScoringScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { userProfile } = useAuth();
  const [match, setMatch] = useState<Match | null>(null);
  const [loading, setLoading] = useState(true);
  const [scoring, setScoring] = useState(false);
  const [batsmenModalVisible, setBatsmenModalVisible] = useState(false);
  const [dismissedBatsmanUid, setDismissedBatsmanUid] = useState<string | null>(null);
  const [teamAPlayers, setTeamAPlayers] = useState<User[]>([]);
  const [teamBPlayers, setTeamBPlayers] = useState<User[]>([]);
  const [loadingPlayers, setLoadingPlayers] = useState(false);
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

  // Check if current user is the umpire
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

  const addRuns = async (runs: number) => {
    if (!id || scoring || !match) return;
    const onStrikeBatsman = (match.currentBatsmen || []).find(b => b.isOnStrike);
    if (!onStrikeBatsman) {
      Alert.alert('Error', 'No batsman on strike');
      return;
    }
    
    try {
      setScoring(true);
      await addRunsService(id, runs, onStrikeBatsman.uid);
      await checkInningsComplete();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update score');
    } finally {
      setScoring(false);
    }
  };

  const addDotBall = async () => {
    if (!id || scoring || !match) return;
    const onStrikeBatsman = (match.currentBatsmen || []).find(b => b.isOnStrike);
    if (!onStrikeBatsman) {
      Alert.alert('Error', 'No batsman on strike');
      return;
    }
    
    try {
      setScoring(true);
      await addDotBallService(id, onStrikeBatsman.uid);
      await checkInningsComplete();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to add dot ball');
    } finally {
      setScoring(false);
    }
  };

  const addWide = async (extraRuns: number) => {
    if (!id || scoring) return;
    try {
      setScoring(true);
      await addWideService(id, extraRuns);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to add wide');
    } finally {
      setScoring(false);
    }
  };

  const addNoBall = async (extraRuns: number) => {
    if (!id || scoring) return;
    try {
      setScoring(true);
      await addNoBallService(id, extraRuns);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to add no ball');
    } finally {
      setScoring(false);
    }
  };

  const handleWicket = () => {
    if (!match) return;
    const onStrikeBatsman = (match.currentBatsmen || []).find(b => b.isOnStrike);
    if (!onStrikeBatsman) {
      Alert.alert('Error', 'No batsman on strike');
      return;
    }
    setDismissedBatsmanUid(onStrikeBatsman.uid);
    setBatsmenModalVisible(true);
  };

  const handleSelectNewBatsman = async (newBatsmanUid: string) => {
    if (!id || !dismissedBatsmanUid) return;
    
    try {
      setScoring(true);
      setBatsmenModalVisible(false);
      await addWicketService(id, dismissedBatsmanUid, newBatsmanUid);
      setDismissedBatsmanUid(null);
      await checkInningsComplete();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to record wicket');
    } finally {
      setScoring(false);
    }
  };

  const checkInningsComplete = async () => {
    if (!match || !id) return;
    
    const currentInnings = match.battingTeam === 'teamA' ? match.teamAInnings : match.teamBInnings;
    
    // Check if innings is complete (all overs bowled or 10 wickets)
    if (currentInnings.overs >= match.totalOvers || currentInnings.wickets >= 10) {
      if (match.currentInnings === 1) {
        // Switch to 2nd innings
        Alert.alert(
          'First Innings Complete',
          `${match.battingTeam === 'teamA' ? match.teamA.name : match.teamB.name} scored ${currentInnings.runs}/${currentInnings.wickets}. Ready to start 2nd innings?`,
          [
            {
              text: 'Start 2nd Innings',
              onPress: async () => {
                await switchInnings(id);
                // Navigate to toss screen for 2nd innings setup
                router.replace(`/umpire/toss/${id}`);
              }
            }
          ]
        );
      } else {
        // Match complete
        await updateMatchStatus(id, 'completed');
        const teamAScore = match.teamAInnings.runs;
        const teamBScore = match.teamBInnings.runs;
        const winner = teamAScore > teamBScore ? match.teamA.name : teamBScore > teamAScore ? match.teamB.name : 'Tie';
        
        Alert.alert(
          'Match Complete',
          winner === 'Tie' ? 'Match ended in a tie!' : `${winner} won the match!`,
          [
            { text: 'OK', onPress: () => router.back() }
          ]
        );
      }
    }
  };

  const startMatch = () => {
    if (!id) return;
    // Navigate to toss screen for match setup
    router.push(`/umpire/toss/${id}`);
  };

  const completeMatch = async () => {
    if (!id) return;
    Alert.alert(
      'Complete Match',
      'Are you sure you want to mark this match as completed?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Complete',
          style: 'destructive',
          onPress: async () => {
            try {
              await updateMatchStatus(id, 'completed');
              Alert.alert('Success', 'Match completed');
              router.back();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to complete match');
            }
          }
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Umpire Panel</Text>
      </View>

      <ScrollView style={styles.scrollContent}>
        <View style={styles.content}>
          {match.scheduledDate && match.status === 'upcoming' && (
            <CountdownTimer scheduledDate={match.scheduledDate} />
          )}
          <Text style={styles.matchTitle}>
            {match.teamA.name} vs {match.teamB.name}
          </Text>

          <View style={styles.scoreDisplay}>
            <Text style={styles.scoreLabel}>Current Score</Text>
            <Text style={styles.scoreValue}>
              {match.score.runs}/{match.score.wickets}
            </Text>
            <Text style={styles.oversValue}>
              ({match.score.overs}.{match.score.balls} overs)
            </Text>
          </View>

          {match.status === 'upcoming' && (
            <View style={styles.section}>
              <Button title="Conduct Toss & Start Match" onPress={startMatch} />
            </View>
          )}

          {match.status === 'live' && match.battingTeam && (
            <>
              {/* Innings and Team Info */}
              <View style={styles.inningsInfo}>
                <Text style={styles.inningsLabel}>
                  {match.currentInnings === 1 ? '1st' : '2nd'} Innings  •  Overs: {(match.battingTeam === 'teamA' ? match.teamAInnings : match.teamBInnings).overs}.{(match.battingTeam === 'teamA' ? match.teamAInnings : match.teamBInnings).balls}/{match.totalOvers}
                </Text>
                <Text style={styles.teamBatting}>
                  {match.battingTeam === 'teamA' ? match.teamA.name : match.teamB.name} Batting
                </Text>
                {match.currentInnings === 2 && (
                  <Text style={styles.targetText}>
                    Target: {(match.battingTeam === 'teamA' ? match.teamBInnings.runs : match.teamAInnings.runs) + 1} runs
                  </Text>
                )}
              </View>

              {/* Current Batsmen */}
              {match.currentBatsmen && match.currentBatsmen.length > 0 && (
                <View style={styles.batsmenSection}>
                  <Text style={styles.sectionTitle}>Current Batsmen</Text>
                  {match.currentBatsmen.map((batsman) => {
                    const player = [...teamAPlayers, ...teamBPlayers].find(p => p.uid === batsman.uid);
                    return (
                      <View 
                        key={batsman.uid} 
                        style={[
                          styles.batsmanCard,
                          batsman.isOnStrike && styles.batsmanOnStrike
                        ]}
                      >
                        <View style={styles.batsmanInfo}>
                          <Text style={styles.batsmanName}>
                            {player?.name || 'Unknown'}
                            {batsman.isOnStrike && ' *'}
                          </Text>
                          <Text style={styles.batsmanStats}>
                            {batsman.runs} runs ({batsman.balls} balls)
                          </Text>
                        </View>
                        {batsman.isOnStrike && (
                          <Ionicons name="radio-button-on" size={20} color="#FF9500" />
                        )}
                      </View>
                    );
                  })}
                </View>
              )}

              {/* Runs */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Runs</Text>
                <View style={styles.buttonGrid}>
                  <TouchableOpacity 
                    style={[styles.scoreButton, styles.dotButton, scoring && styles.disabledButton]} 
                    onPress={addDotBall}
                    disabled={scoring}
                  >
                    <Text style={styles.scoreButtonText}>Dot</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.scoreButton, scoring && styles.disabledButton]} 
                    onPress={() => addRuns(1)}
                    disabled={scoring}
                  >
                    <Text style={styles.scoreButtonText}>1</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.scoreButton, scoring && styles.disabledButton]} 
                    onPress={() => addRuns(2)}
                    disabled={scoring}
                  >
                    <Text style={styles.scoreButtonText}>2</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.scoreButton, scoring && styles.disabledButton]} 
                    onPress={() => addRuns(3)}
                    disabled={scoring}
                  >
                    <Text style={styles.scoreButtonText}>3</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.scoreButton, scoring && styles.disabledButton]} 
                    onPress={() => addRuns(4)}
                    disabled={scoring}
                  >
                    <Text style={styles.scoreButtonText}>4</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.scoreButton, scoring && styles.disabledButton]} 
                    onPress={() => addRuns(6)}
                    disabled={scoring}
                  >
                    <Text style={styles.scoreButtonText}>6</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Wicket */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Wicket</Text>
                <TouchableOpacity
                  style={[styles.scoreButton, styles.wicketButton, scoring && styles.disabledButton]}
                  onPress={handleWicket}
                  disabled={scoring}
                >
                  <Text style={styles.scoreButtonText}>Wicket</Text>
                </TouchableOpacity>
              </View>

              {/* Extras - Wide */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Wide (1 + extra runs)</Text>
                <View style={styles.buttonGrid}>
                  <TouchableOpacity 
                    style={[styles.scoreButton, styles.extraButton, scoring && styles.disabledButton]} 
                    onPress={() => addWide(0)}
                    disabled={scoring}
                  >
                    <Text style={styles.scoreButtonText}>Wd +0</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.scoreButton, styles.extraButton, scoring && styles.disabledButton]} 
                    onPress={() => addWide(1)}
                    disabled={scoring}
                  >
                    <Text style={styles.scoreButtonText}>Wd +1</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.scoreButton, styles.extraButton, scoring && styles.disabledButton]} 
                    onPress={() => addWide(2)}
                    disabled={scoring}
                  >
                    <Text style={styles.scoreButtonText}>Wd +2</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.scoreButton, styles.extraButton, scoring && styles.disabledButton]} 
                    onPress={() => addWide(4)}
                    disabled={scoring}
                  >
                    <Text style={styles.scoreButtonText}>Wd +4</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Extras - No Ball */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>No Ball (1 + extra runs)</Text>
                <View style={styles.buttonGrid}>
                  <TouchableOpacity 
                    style={[styles.scoreButton, styles.extraButton, scoring && styles.disabledButton]} 
                    onPress={() => addNoBall(0)}
                    disabled={scoring}
                  >
                    <Text style={styles.scoreButtonText}>NB +0</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.scoreButton, styles.extraButton, scoring && styles.disabledButton]} 
                    onPress={() => addNoBall(1)}
                    disabled={scoring}
                  >
                    <Text style={styles.scoreButtonText}>NB +1</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.scoreButton, styles.extraButton, scoring && styles.disabledButton]} 
                    onPress={() => addNoBall(2)}
                    disabled={scoring}
                  >
                    <Text style={styles.scoreButtonText}>NB +2</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.scoreButton, styles.extraButton, scoring && styles.disabledButton]} 
                    onPress={() => addNoBall(4)}
                    disabled={scoring}
                  >
                    <Text style={styles.scoreButtonText}>NB +4</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.section}>
                <Button title="Complete Match" onPress={completeMatch} />
              </View>
            </>
          )}

          {match.status === 'completed' && (
            <View style={styles.section}>
              <Text style={styles.completedText}>Match Completed</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Batsman Selection Modal */}
      <Modal
        visible={batsmenModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setBatsmenModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select New Batsman</Text>
              <TouchableOpacity onPress={() => setBatsmenModalVisible(false)}>
                <Ionicons name="close" size={28} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll}>
              {loadingPlayers ? (
                <ActivityIndicator size="small" color="#007AFF" style={{ marginTop: 20 }} />
              ) : (
                <>
                  {(match?.battingTeam === 'teamA' ? teamAPlayers : teamBPlayers)
                    .filter(player => !(match?.currentBatsmen || []).some(b => b.uid === player.uid))
                    .map((player) => (
                      <TouchableOpacity
                        key={player.uid}
                        style={styles.playerSelectItem}
                        onPress={() => handleSelectNewBatsman(player.uid)}
                      >
                        <View style={styles.playerSelectAvatar}>
                          <Text style={styles.playerSelectAvatarText}>
                            {player.name.charAt(0).toUpperCase()}
                          </Text>
                        </View>
                        <View style={styles.playerSelectInfo}>
                          <Text style={styles.playerSelectName}>{player.name}</Text>
                          {player.username && (
                            <Text style={styles.playerSelectUsername}>@{player.username}</Text>
                          )}
                        </View>
                        <Ionicons name="checkmark-circle-outline" size={24} color="#007AFF" />
                      </TouchableOpacity>
                    ))}
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5'
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
  scrollContent: {
    flex: 1
  },
  content: {
    padding: 16
  },
  matchTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 24,
    color: '#333'
  },
  scoreDisplay: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  scoreLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    textTransform: 'uppercase'
  },
  scoreValue: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4
  },
  oversValue: {
    fontSize: 20,
    color: '#666'
  },
  section: {
    marginBottom: 24
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333'
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap'
  },
  scoreButton: {
    flex: 1,
    minWidth: '22%',
    backgroundColor: '#007AFF',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center'
  },
  scoreButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600'
  },
  wicketButton: {
    backgroundColor: '#FF3B30'
  },
  ballButton: {
    backgroundColor: '#34C759'
  },
  disabledButton: {
    opacity: 0.5
  },
  errorText: {
    fontSize: 18,
    color: '#999',
    marginBottom: 16,
    textAlign: 'center'
  },
  completedText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#00AA00',
    textAlign: 'center'
  },
  button: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600'
  },
  inningsInfo: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center'
  },
  inningsLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4
  },
  teamBatting: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4
  },
  targetText: {
    fontSize: 14,
    color: '#FF9500',
    fontWeight: '600'
  },
  batsmenSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16
  },
  batsmanCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginTop: 8,
    backgroundColor: '#f9f9f9'
  },
  batsmanOnStrike: {
    borderColor: '#FF9500',
    backgroundColor: '#fff9f0',
    borderWidth: 2
  },
  batsmanInfo: {
    flex: 1
  },
  batsmanName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4
  },
  batsmanStats: {
    fontSize: 14,
    color: '#666'
  },
  buttonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  dotButton: {
    backgroundColor: '#666'
  },
  extraButton: {
    backgroundColor: '#FF9500'
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end'
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
    paddingBottom: 34
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0'
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333'
  },
  modalScroll: {
    padding: 16
  },
  playerSelectItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginBottom: 8,
    backgroundColor: '#fff'
  },
  playerSelectAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  playerSelectAvatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600'
  },
  playerSelectInfo: {
    flex: 1
  },
  playerSelectName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333'
  },
  playerSelectUsername: {
    fontSize: 14,
    color: '#666'
  }
});
