/**
 * Pinned performance section: one batting or bowling performance card with Unpin/Replace (own profile).
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
import { getMatch } from '@/services/matches';
import { getPlayerPerformanceInMatch } from '@/services/playerStats';
import { Match } from '@/models/Match';
import { User } from '@/models/User';

export interface PinnedPerformanceSectionProps {
  user: User;
  isOwnProfile: boolean;
  onUnpin?: () => void;
}

function formatMatchDate(updatedAt: { toDate?: () => Date } | Date): string {
  const d = updatedAt && typeof (updatedAt as any).toDate === 'function'
    ? (updatedAt as any).toDate()
    : updatedAt instanceof Date ? updatedAt : new Date();
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export const PinnedPerformanceSection: React.FC<PinnedPerformanceSectionProps> = ({
  user,
  isOwnProfile,
  onUnpin
}) => {
  const router = useRouter();
  const pin = user.pinnedPerformance;
  const [match, setMatch] = useState<(Match & { id: string }) | null>(null);
  const [loading, setLoading] = useState(!!pin);

  useEffect(() => {
    if (!pin?.matchId) {
      setMatch(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    const load = async () => {
      try {
        const m = await getMatch(pin.matchId);
        if (!cancelled) setMatch(m ?? null);
      } catch {
        if (!cancelled) setMatch(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [pin?.matchId]);

  if (!pin) return null;

  if (loading || !match) {
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Pinned performance</Text>
        <View style={styles.card}>
          <ActivityIndicator size="small" color="#007AFF" />
        </View>
      </View>
    );
  }

  const perf = getPlayerPerformanceInMatch(match, user.uid);
  const isBatting = pin.type === 'batting';
  const statLine = isBatting && perf.batting
    ? `${perf.batting.runs} (${perf.batting.balls})`
    : !isBatting && perf.bowling
      ? `${perf.bowling.wickets}/${perf.bowling.runs}`
      : null;

  if (!statLine) return null;

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Pinned performance</Text>
      <View style={styles.card}>
        <TouchableOpacity
          style={styles.cardTouch}
          onPress={() => router.push(`/match/${match.id}`)}
          activeOpacity={0.7}
        >
          <View style={styles.cardMain}>
            <Text style={styles.matchTeams}>{match.teamA.name} vs {match.teamB.name}</Text>
            <Text style={styles.matchDate}>{formatMatchDate(match.updatedAt)}</Text>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>{isBatting ? 'Batting' : 'Bowling'}</Text>
              <Text style={styles.statValue}>{statLine}</Text>
            </View>
          </View>
        </TouchableOpacity>
        {isOwnProfile && onUnpin && (
          <View style={styles.actions}>
            <TouchableOpacity onPress={onUnpin} style={styles.actionBtn}>
              <Ionicons name="trash-outline" size={20} color="#FF3B30" />
              <Text style={styles.unpinText}>Unpin</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
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
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e8e8e8'
  },
  cardTouch: {
    flex: 1
  },
  cardMain: {},
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
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 8
  },
  statLabel: {
    fontSize: 13,
    color: '#666'
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#007AFF'
  },
  actions: {
    flexDirection: 'row',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    gap: 16
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  unpinText: {
    fontSize: 14,
    color: '#FF3B30',
    fontWeight: '500'
  }
});
