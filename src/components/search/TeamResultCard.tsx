import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Match } from '@/models/Match';
import { getMatchesForTeam } from '@/services/matches';

interface TeamResultCardProps {
  teamName: string;
  onPress: (matchId: string) => void;
}

export const TeamResultCard: React.FC<TeamResultCardProps> = ({ teamName, onPress }) => {
  const [recentMatch, setRecentMatch] = useState<Match | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecentMatch = async () => {
      try {
        const matches = await getMatchesForTeam(teamName, 1);
        if (matches.length > 0) {
          setRecentMatch(matches[0]);
        }
      } catch (error) {
        console.error('Error fetching recent match for team:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRecentMatch();
  }, [teamName]);

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => recentMatch && onPress((recentMatch as any).id)}
      disabled={!recentMatch}
    >
      <View style={styles.container}>
        <View style={styles.teamLogo}>
          <Text style={styles.logoText}>
            {teamName.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.details}>
          <Text style={styles.teamName}>{teamName}</Text>
          {loading ? (
            <ActivityIndicator size="small" color="#007AFF" style={styles.loader} />
          ) : recentMatch ? (
            <View style={styles.matchInfo}>
              <Text style={styles.recentMatchLabel}>Recent Match</Text>
              <Text style={styles.matchTeams} numberOfLines={1}>
                {recentMatch.teamA.name} vs {recentMatch.teamB.name}
              </Text>
              <View style={[
                styles.statusBadge,
                { backgroundColor: recentMatch.status === 'live' ? '#FF3B30' : '#34C759' }
              ]}>
                <Text style={styles.statusText}>{recentMatch.status}</Text>
              </View>
            </View>
          ) : (
            <Text style={styles.noMatchText}>No recent matches found</Text>
          )}
        </View>
        <Ionicons name="chevron-forward" size={20} color="#adb5bd" />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderLeftWidth: 4,
    borderLeftColor: '#34C759'
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  teamLogo: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#34C759',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    shadowColor: '#34C759',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3
  },
  logoText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff'
  },
  details: {
    flex: 1
  },
  teamName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1a1a1a',
    marginBottom: 4
  },
  loader: {
    alignSelf: 'flex-start',
    marginTop: 4
  },
  matchInfo: {
    gap: 2
  },
  recentMatchLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#6c757d',
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  matchTeams: {
    fontSize: 14,
    color: '#212529',
    fontWeight: '600'
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 4
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#fff',
    textTransform: 'uppercase'
  },
  noMatchText: {
    fontSize: 12,
    color: '#adb5bd',
    fontStyle: 'italic'
  }
});
