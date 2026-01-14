import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '@/providers/AuthProvider';
import { subscribeToMatch, updateMatchScore, updateMatchStatus } from '@/services/matches';
import { Match, Score } from '@/models/Match';

export default function UmpireScoringScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { userProfile } = useAuth();
  const [match, setMatch] = useState<Match | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (!id) return;

    const unsubscribe = subscribeToMatch(id, (matchData) => {
      setMatch(matchData);
      setLoading(false);
    });

    return unsubscribe;
  }, [id]);

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
    if (!id) return;
    try {
      const newScore: Score = {
        ...match.score,
        runs: match.score.runs + runs
      };
      await updateMatchScore(id, newScore);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update score');
    }
  };

  const addWicket = async () => {
    if (!id) return;
    try {
      const newScore: Score = {
        ...match.score,
        wickets: match.score.wickets + 1
      };
      await updateMatchScore(id, newScore);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update score');
    }
  };

  const nextBall = async () => {
    if (!id) return;
    try {
      let newBalls = match.score.balls + 1;
      let newOvers = match.score.overs;

      if (newBalls >= 6) {
        newBalls = 0;
        newOvers = newOvers + 1;
      }

      const newScore: Score = {
        ...match.score,
        balls: newBalls,
        overs: newOvers
      };
      await updateMatchScore(id, newScore);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update score');
    }
  };

  const endOver = async () => {
    if (!id) return;
    try {
      const newScore: Score = {
        ...match.score,
        balls: 0,
        overs: match.score.overs + 1
      };
      await updateMatchScore(id, newScore);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update score');
    }
  };

  const startMatch = async () => {
    if (!id) return;
    try {
      await updateMatchStatus(id, 'live');
      Alert.alert('Success', 'Match started');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to start match');
    }
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
              <Button title="Start Match" onPress={startMatch} />
            </View>
          )}

          {match.status === 'live' && (
            <>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Runs</Text>
                <View style={styles.buttonRow}>
                  <TouchableOpacity style={styles.scoreButton} onPress={() => addRuns(1)}>
                    <Text style={styles.scoreButtonText}>+1</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.scoreButton} onPress={() => addRuns(2)}>
                    <Text style={styles.scoreButtonText}>+2</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.scoreButton} onPress={() => addRuns(4)}>
                    <Text style={styles.scoreButtonText}>+4</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.scoreButton} onPress={() => addRuns(6)}>
                    <Text style={styles.scoreButtonText}>+6</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Wicket & Balls</Text>
                <View style={styles.buttonRow}>
                  <TouchableOpacity
                    style={[styles.scoreButton, styles.wicketButton]}
                    onPress={addWicket}
                  >
                    <Text style={styles.scoreButtonText}>Wicket</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.scoreButton, styles.ballButton]}
                    onPress={nextBall}
                  >
                    <Text style={styles.scoreButtonText}>Next Ball</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Over Management</Text>
                <Button title="End Over" onPress={endOver} variant="secondary" />
              </View>

              <View style={styles.section}>
                <Button
                  title="Complete Match"
                  onPress={completeMatch}
                  variant="secondary"
                />
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
  }
});
