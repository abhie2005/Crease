import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '@/providers/AuthProvider';
import { subscribeToMatch } from '@/services/matches';
import { Match } from '@/models/Match';

export default function MatchDetailsScreen() {
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

  const isUmpire = match && userProfile && match.umpireUid === userProfile.uid;
  const canManage = userProfile && (userProfile.role === 'admin' || userProfile.role === 'president');

  const statusColors = {
    upcoming: '#FFA500',
    live: '#FF0000',
    completed: '#00AA00'
  };

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
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <View style={styles.statusBadgeContainer}>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: statusColors[match.status] }
            ]}
          >
            <Text style={styles.statusText}>{match.status.toUpperCase()}</Text>
          </View>
        </View>

        <Text style={styles.matchTitle}>
          {match.teamA.name} vs {match.teamB.name}
        </Text>

        {(match.status === 'live' || match.status === 'completed') && (
          <View style={styles.scoreCard}>
            <Text style={styles.scoreTitle}>Score</Text>
            <Text style={styles.scoreText}>
              {match.score.runs}/{match.score.wickets}
            </Text>
            <Text style={styles.oversText}>
              ({match.score.overs}.{match.score.balls} overs)
            </Text>
          </View>
        )}

        <View style={styles.teamsContainer}>
          <View style={styles.teamCard}>
            <Text style={styles.teamTitle}>Team A</Text>
            <Text style={styles.teamName}>{match.teamA.name}</Text>
            <Text style={styles.playerCount}>
              {match.teamA.playerUids.length} players
            </Text>
          </View>

          <View style={styles.teamCard}>
            <Text style={styles.teamTitle}>Team B</Text>
            <Text style={styles.teamName}>{match.teamB.name}</Text>
            <Text style={styles.playerCount}>
              {match.teamB.playerUids.length} players
            </Text>
          </View>
        </View>

        {isUmpire && match.status !== 'completed' && (
          <TouchableOpacity
            style={styles.umpireButton}
            onPress={() => router.push(`/umpire/${id}`)}
          >
            <Text style={styles.umpireButtonText}>
              🏏 Open Scoring Panel
            </Text>
          </TouchableOpacity>
        )}

        {canManage && (
          <View style={styles.adminInfo}>
            <Text style={styles.adminInfoText}>
              Admin controls coming soon
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
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
    backgroundColor: '#f5f5f5'
  },
  header: {
    backgroundColor: '#fff',
    padding: 16,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0'
  },
  backButton: {
    paddingVertical: 8
  },
  backButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600'
  },
  content: {
    padding: 16
  },
  statusBadgeContainer: {
    alignItems: 'center',
    marginBottom: 16
  },
  statusBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600'
  },
  matchTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 24,
    color: '#333'
  },
  scoreCard: {
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
  scoreTitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    textTransform: 'uppercase'
  },
  scoreText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4
  },
  oversText: {
    fontSize: 18,
    color: '#666'
  },
  teamsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24
  },
  teamCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  teamTitle: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
    textTransform: 'uppercase'
  },
  teamName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8
  },
  playerCount: {
    fontSize: 14,
    color: '#666'
  },
  umpireButton: {
    backgroundColor: '#007AFF',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16
  },
  umpireButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600'
  },
  adminInfo: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center'
  },
  adminInfoText: {
    fontSize: 14,
    color: '#666'
  },
  errorText: {
    fontSize: 18,
    color: '#999',
    marginBottom: 16
  }
});
