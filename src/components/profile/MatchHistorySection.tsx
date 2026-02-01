/**
 * Match history section: full list with calendar-year filter and load more; pin from row (own profile).
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
import { DocumentSnapshot } from 'firebase/firestore';
import { getMatchesForPlayer, getPlayerPerformanceInMatch } from '@/services/playerStats';
import { Match } from '@/models/Match';
import { User } from '@/models/User';

export interface MatchHistorySectionProps {
  user: User;
  isOwnProfile: boolean;
  onPin?: (matchId: string, type: 'batting' | 'bowling') => void;
  hasExistingPin?: boolean;
}

const PAGE_SIZE = 20;

function formatMatchDate(updatedAt: { toDate?: () => Date } | Date): string {
  const d = updatedAt && typeof (updatedAt as any).toDate === 'function'
    ? (updatedAt as any).toDate()
    : updatedAt instanceof Date ? updatedAt : new Date();
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export const MatchHistorySection: React.FC<MatchHistorySectionProps> = ({
  user,
  isOwnProfile,
  onPin,
  hasExistingPin = false
}) => {
  const router = useRouter();
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState<number | 'all'>('all');
  const [matches, setMatches] = useState<(Match & { id: string })[]>([]);
  const [lastDoc, setLastDoc] = useState<DocumentSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const loadPage = async (append: boolean, yearFilter: number | 'all', cursor: DocumentSnapshot | null) => {
    const options = {
      limit: PAGE_SIZE,
      ...(yearFilter !== 'all' ? { year: yearFilter } : {}),
      ...(cursor ? { startAfter: cursor } : {})
    };
    const { matches: list, lastDoc: nextDoc } = await getMatchesForPlayer(user.uid, options);
    if (append) {
      setMatches((prev) => [...prev, ...list]);
    } else {
      setMatches(list);
    }
    setLastDoc(nextDoc);
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const { matches: list, lastDoc: nextDoc } = await getMatchesForPlayer(user.uid, {
          limit: PAGE_SIZE,
          ...(year !== 'all' ? { year } : {})
        });
        if (!cancelled) {
          setMatches(list);
          setLastDoc(nextDoc);
        }
      } catch {
        if (!cancelled) setMatches([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user.uid, year]);

  const loadMore = async () => {
    if (loadingMore || !lastDoc) return;
    setLoadingMore(true);
    try {
      const { matches: list, lastDoc: nextDoc } = await getMatchesForPlayer(user.uid, {
        limit: PAGE_SIZE,
        ...(year !== 'all' ? { year } : {}),
        startAfter: lastDoc
      });
      setMatches((prev) => [...prev, ...list]);
      setLastDoc(nextDoc);
    } finally {
      setLoadingMore(false);
    }
  };

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

  const years: (number | 'all')[] = ['all', currentYear, currentYear - 1, currentYear - 2];

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Match history</Text>
      <View style={styles.filterRow}>
        {years.map((y) => (
          <TouchableOpacity
            key={y}
            style={[styles.filterChip, year === y && styles.filterChipActive]}
            onPress={() => setYear(y)}
          >
            <Text style={[styles.filterChipText, year === y && styles.filterChipTextActive]}>
              {y === 'all' ? 'All' : String(y)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      {loading ? (
        <ActivityIndicator size="small" color="#007AFF" style={styles.loader} />
      ) : matches.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>No matches in this period</Text>
        </View>
      ) : (
        <>
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
          {lastDoc && (
            <TouchableOpacity
              style={styles.loadMore}
              onPress={loadMore}
              disabled={loadingMore}
            >
              {loadingMore ? (
                <ActivityIndicator size="small" color="#007AFF" />
              ) : (
                <Text style={styles.loadMoreText}>Load more</Text>
              )}
            </TouchableOpacity>
          )}
        </>
      )}
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
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0'
  },
  filterChipActive: {
    backgroundColor: '#007AFF'
  },
  filterChipText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500'
  },
  filterChipTextActive: {
    color: '#fff'
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
  },
  loadMore: {
    padding: 16,
    alignItems: 'center'
  },
  loadMoreText: {
    fontSize: 15,
    color: '#007AFF',
    fontWeight: '600'
  }
});
