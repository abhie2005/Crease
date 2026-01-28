import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Match } from '@/models/Match';

interface MatchResultCardProps {
  match: Match;
  onPress: (id: string) => void;
}

export const MatchResultCard: React.FC<MatchResultCardProps> = ({ match, onPress }) => {
  const matchId = (match as any).id;
  
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress(matchId)}
    >
      <View style={styles.header}>
        <View style={[
          styles.statusBadge,
          { backgroundColor: match.status === 'live' ? '#FF3B30' : (match.status === 'completed' ? '#34C759' : '#FF9500') }
        ]}>
          <Text style={styles.statusText}>{match.status}</Text>
        </View>
        <Text style={styles.dateText}>
          {match.createdAt ? new Date((match.createdAt as any).seconds * 1000).toLocaleDateString() : ''}
        </Text>
      </View>

      <View style={styles.teamsContainer}>
        <View style={styles.teamRow}>
          <Text style={styles.teamName}>{match.teamA.name}</Text>
          {match.status !== 'upcoming' && (
            <Text style={styles.score}>{match.teamAInnings.runs}/{match.teamAInnings.wickets}</Text>
          )}
        </View>
        <Text style={styles.vs}>VS</Text>
        <View style={styles.teamRow}>
          <Text style={styles.teamName}>{match.teamB.name}</Text>
          {match.status !== 'upcoming' && (
            <Text style={styles.score}>{match.teamBInnings.runs}/{match.teamBInnings.wickets}</Text>
          )}
        </View>
      </View>

      {match.status === 'upcoming' && match.totalOvers && (
        <Text style={styles.matchInfo}>{match.totalOvers} Overs Match</Text>
      )}

      <View style={styles.footer}>
        <Text style={styles.viewDetails}>View Match Details</Text>
        <Ionicons name="arrow-forward" size={16} color="#007AFF" />
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
    borderLeftColor: '#FF9500'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#fff',
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  dateText: {
    fontSize: 12,
    color: '#6c757d',
    fontWeight: '600'
  },
  teamsContainer: {
    marginBottom: 12
  },
  teamRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4
  },
  teamName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1a1a1a'
  },
  score: {
    fontSize: 18,
    fontWeight: '800',
    color: '#007AFF'
  },
  vs: {
    fontSize: 12,
    fontWeight: '800',
    color: '#adb5bd',
    textAlign: 'center',
    marginVertical: 2
  },
  matchInfo: {
    fontSize: 13,
    color: '#6c757d',
    fontWeight: '600',
    marginBottom: 12
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f8f9fa'
  },
  viewDetails: {
    fontSize: 13,
    fontWeight: '700',
    color: '#007AFF',
    marginRight: 4
  }
});
