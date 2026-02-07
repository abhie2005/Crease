/**
 * Home tab: real-time matches list with pull-to-refresh and Create button for admins.
 * ESPN-style UI: dark header, sectioned list (Live / Upcoming / Final), score-focused cards.
 */

import React, { useEffect, useState, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/providers/AuthProvider';
import { subscribeToMatches } from '@/services/matches';
import { Match } from '@/models/Match';
import { CountdownTimer } from '@/components/CountdownTimer';
import { COLORS } from '@/theme/colors';

type Section = { title: string; data: Match[] };

/** Matches list with countdown for upcoming and scores for live/completed. */
export default function HomeScreen() {
  const { userProfile } = useAuth();
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const sections = useMemo<Section[]>(() => {
    const live = matches.filter((m) => m.status === 'live');
    const upcoming = matches.filter((m) => m.status === 'upcoming');
    const completed = matches.filter((m) => m.status === 'completed');
    const out: Section[] = [];
    if (live.length) out.push({ title: 'LIVE', data: live });
    if (upcoming.length) out.push({ title: 'UPCOMING', data: upcoming });
    if (completed.length) out.push({ title: 'FINAL', data: completed });
    return out;
  }, [matches]);

  useEffect(() => {
    const unsubscribe = subscribeToMatches((matchesList) => {
      setMatches(matchesList);
      setLoading(false);
      setRefreshing(false);
      // Clear timeout if listener fires before timeout
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
        refreshTimeoutRef.current = null;
      }
    });

    return () => {
      unsubscribe();
      // Clean up timeout on unmount
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    // Set a timeout to ensure refreshing state is reset even if no data changes
    // This prevents the refresh indicator from getting stuck
    refreshTimeoutRef.current = setTimeout(() => {
      setRefreshing(false);
      refreshTimeoutRef.current = null;
    }, 2000); // 2 second fallback timeout
  };

  const renderSectionHeader = ({ section }: { section: Section }) => {
    const isLive = section.title === 'LIVE';
    return (
      <View style={styles.sectionHeader}>
        {isLive && <View style={styles.liveDot} />}
        <Text style={[styles.sectionTitle, isLive && styles.sectionTitleLive]}>
          {section.title}
        </Text>
      </View>
    );
  };

  const renderMatchItem = ({ item }: { item: Match }) => {
    return (
      <TouchableOpacity
        style={styles.matchCard}
        onPress={() => router.push(`/match/${(item as any).id}`)}
        activeOpacity={0.7}
      >
        <View style={styles.matchHeader}>
          <Text style={styles.matchTeams}>
            {item.teamA.name} vs {item.teamB.name}
          </Text>
          <View
            style={[
              styles.statusBadge,
              item.status === 'live' && styles.statusBadgeLive,
              item.status === 'upcoming' && styles.statusBadgeUpcoming,
              item.status === 'completed' && styles.statusBadgeCompleted
            ]}
          >
            <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
          </View>
        </View>
        {item.status === 'upcoming' && (item as any).scheduledDate && (
          <View style={styles.countdownContainer}>
            <CountdownTimer
              scheduledDate={(item as any).scheduledDate}
              compact
              labelColor="#999"
              valueColor="#e0e0e0"
            />
          </View>
        )}
        {item.status === 'live' && (
          <View style={styles.scoreContainer}>
            {(() => {
              const currentInnings = item.battingTeam === 'teamA' ? item.teamAInnings : item.teamBInnings;
              const battingTeamName = item.battingTeam === 'teamA' ? item.teamA.name : item.teamB.name;
              if (!currentInnings) return null;
              return (
                <>
                  <Text style={styles.scoreText}>
                    <Text style={styles.scoreLabel}>{battingTeamName}: </Text>
                    {currentInnings.runs}/{currentInnings.wickets} ({currentInnings.overs}.{currentInnings.balls}/{item.totalOvers})
                  </Text>
                  {item.currentInnings === 2 && (
                    <Text style={styles.targetText}>
                      Target: {((item.battingTeam === 'teamA' ? item.teamBInnings?.runs : item.teamAInnings?.runs) ?? 0) + 1} runs
                    </Text>
                  )}
                </>
              );
            })()}
          </View>
        )}
        {item.status === 'completed' && (
          <View style={styles.scoreContainer}>
            <Text style={styles.winnerText}>
              {(() => {
                const teamAScore = item.teamAInnings?.runs ?? 0;
                const teamBScore = item.teamBInnings?.runs ?? 0;
                if (teamAScore === teamBScore) return 'Match Tied';
                const winner = teamAScore > teamBScore ? item.teamA.name : item.teamB.name;
                return `${winner} won`;
              })()}
            </Text>
            <Text style={styles.scoreLine}>
              {item.teamA.name}: {item.teamAInnings?.runs ?? 0}/{item.teamAInnings?.wickets ?? 0} ({item.teamAInnings?.overs ?? 0}.{item.teamAInnings?.balls ?? 0})
            </Text>
            <Text style={styles.scoreLine}>
              {item.teamB.name}: {item.teamBInnings?.runs ?? 0}/{item.teamBInnings?.wickets ?? 0} ({item.teamBInnings?.overs ?? 0}.{item.teamBInnings?.balls ?? 0})
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[COLORS.DARK_TEAL, COLORS.DARK_TEAL_LIGHTER]}
        style={StyleSheet.absoluteFill}
      />
      
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.title}>Crease</Text>
        {userProfile && (userProfile.role === 'admin' || userProfile.role === 'president') && (
          <TouchableOpacity
            style={styles.createButton}
            onPress={() => router.push('/admin/create-match')}
            activeOpacity={0.7}
          >
            <Text style={styles.createButtonText}>+ Create</Text>
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.MINT} />
        </View>
      ) : matches.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🏏</Text>
          <Text style={styles.emptyTitle}>No matches yet</Text>
          <Text style={styles.emptySubtitle}>
            {userProfile && (userProfile.role === 'admin' || userProfile.role === 'president')
              ? 'Create your first match to get started!'
              : 'Matches will appear here once they are created.'}
          </Text>
        </View>
      ) : (
        <SectionList<Match, Section>
          sections={sections}
          renderItem={renderMatchItem}
          renderSectionHeader={renderSectionHeader}
          keyExtractor={(item) => (item as any).id}
          contentContainerStyle={styles.listContent}
          stickySectionHeadersEnabled={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={COLORS.MINT}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  header: {
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    paddingHorizontal: 16,
    paddingBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff'
  },
  createButton: {
    backgroundColor: COLORS.MINT,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8
  },
  createButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600'
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8
  },
  emptySubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    lineHeight: 20
  },
  listContent: {
    padding: 16,
    paddingBottom: 24
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    marginTop: 8
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    color: 'rgba(255, 255, 255, 0.6)'
  },
  sectionTitleLive: {
    color: COLORS.LIVE
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.LIVE,
    marginRight: 6
  },
  matchCard: {
    backgroundColor: COLORS.CARD_BG,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12
  },
  matchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  matchTeams: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    flex: 1
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6
  },
  statusBadgeLive: {
    backgroundColor: COLORS.LIVE
  },
  statusBadgeUpcoming: {
    backgroundColor: COLORS.UPCOMING
  },
  statusBadgeCompleted: {
    backgroundColor: COLORS.COMPLETED
  },
  statusText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5
  },
  countdownContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.BORDER_DEFAULT
  },
  scoreContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.BORDER_DEFAULT
  },
  scoreText: {
    fontSize: 16,
    color: '#e0e0e0',
    fontWeight: '500'
  },
  scoreLabel: {
    fontWeight: '700',
    color: '#fff'
  },
  targetText: {
    fontSize: 13,
    color: COLORS.UPCOMING,
    marginTop: 4,
    fontWeight: '600'
  },
  winnerText: {
    color: COLORS.COMPLETED,
    fontWeight: 'bold',
    fontSize: 16
  },
  scoreLine: {
    fontSize: 13,
    color: '#b0b0b0',
    marginTop: 2
  }
});
