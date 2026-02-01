/**
 * Recently played section: last 3 matches with optional pin from row (own profile).
 * Used in ProfileContent on (tabs)/profile and user/[username].
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getMatchesForPlayer } from '@/services/playerStats';
import { getPlayerPerformanceInMatch } from '@/services/playerStats';
import { Match } from '@/models/Match';
import { User } from '@/models/User';

export interface RecentlyPlayedSectionProps {
  user: User;
  isOwnProfile: boolean;
  onPin?: (matchId: string, type: 'batting' | 'bowling') => void;
  hasExistingPin?: boolean;
}

function formatMatchDate(updatedAt: { toDate?: () => Date } | Date): string {
  const d = updatedAt && typeof (updatedAt as any).toDate === 'function'
    ? (updatedAt as any).toDate()
    : updatedAt instanceof Date ? updatedAt : new Date();
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export const RecentlyPlayedSection: React.FC<RecentlyPlayedSectionProps> = ({
  user,
  isOwnProfile,
  onPin,
  hasExistingPin = false
}) => {
  const router = useRouter();
  const [matches, setMatches] = useState<(Match & { id: string })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const { matches: list } = await getMatchesForPlayer(user.uid, { limit: 3 });
        if (!cancelled) setMatches(list);
      } catch (e) {
        if (!cancelled) setMatches([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [user.uid]);

  const handlePin = (match: Match & { id: string }) => {
    const perf = getPlayerPerformanceInMatch(match, user.uid);
    const canBat = perf.batting != null;
    const canBowl = perf.bowling != null;
    if (!canBat && !canBowl) return;
    if (hasExistingPin && onPin) {
      Alert.alert(
        'Replace pin?',
        'You already have a pinned performance. Pin this instead?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Replace',
            onPress: () => {
              if (canBat && canBowl) {
                Alert.alert('Pin batting or bowling?', undefined, [
                  { text: 'Batting', onPress: () => onPin(match.id, 'batting') },
                  { text: 'Bowling', onPress: () => onPin(match.id, 'bowling') },
                  { text: 'Cancel', style: 'cancel' }
                ]);
              } else if (canBat) onPin(match.id, 'batting');
              else onPin(match.id, 'bowling');
            }
          }
        ]
      );
    } else if (onPin) {
      if (canBat && canBowl) {
        Alert.alert('Pin batting or bowling?', undefined, [
          { text: 'Batting', onPress: () => onPin(match.id, 'batting') },
          { text: 'Bowling', onPress: () => onPin(match.id, 'bowling') },
          { text: 'Cancel', style: 'cancel' }
        ]);
      } else if (canBat) onPin(match.id, 'batting');
      else onPin(match.id, 'bowling');
    }
  };

  if (loading) {
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recently played</Text>
        <ActivityIndicator size="small" color="#007AFF" style={styles.loader} />
      </View>
    );
  }

  if (matches.length === 0) {
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recently played</Text>
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>No matches played yet</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Recently played</Text>
      {matches.map((match) => (
        <TouchableOpacity
          key={match.id}
          style={styles.card}
          onPress={() => router.push(`/match/${match.id}`)}
          activeOpacity={0.7}
        >
          <View style={styles.cardMain}>
            <Text style={styles.matchTeams}>{match.teamA.name} vs {match.teamB.name}</Text>
            <Text style={styles.matchDate}>{formatMatchDate(match.updatedAt)}</Text>
            {match.status === 'completed' && match.teamAInnings != null && match.teamBInnings != null && (
              <Text style={styles.score}>
                {match.teamAInnings.runs}/{match.teamAInnings.wickets} – {match.teamBInnings.runs}/{match.teamBInnings.wickets}
              </Text>
            )}
          </View>
          {isOwnProfile && onPin && (
            <TouchableOpacity
              style={styles.pinButton}
              onPress={() => handlePin(match)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="pin-outline" size={22} color="#007AFF" />
            </TouchableOpacity>
          )}
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    marginBottom: 24
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 12
  },
  loader: {
    marginVertical: 16
  },
  emptyBox: {
    backgroundColor: '#f5f5f5',
    padding: 20,
    borderRadius: 8,
    alignItems: 'center'
  },
  emptyText: {
    fontSize: 15,
    color: '#666'
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e8e8e8'
  },
  cardMain: {
    flex: 1
  },
  matchTeams: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333'
  },
  matchDate: {
    fontSize: 13,
    color: '#666',
    marginTop: 4
  },
  score: {
    fontSize: 13,
    color: '#007AFF',
    marginTop: 4,
    fontWeight: '500'
  },
  pinButton: {
    padding: 8
  }
});
