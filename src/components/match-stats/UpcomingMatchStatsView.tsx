/**
 * Upcoming match view: rosters with career stats (all-time / recent).
 * Used on match detail Stats tab when match is upcoming.
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { User } from '@/models/User';
import { PlayerCareerStats, StatsScope, getMultiplePlayersCareerStats } from '@/services/playerStats';

/** Props: teamAPlayers, teamBPlayers, teamAName, teamBName. */
interface UpcomingMatchStatsViewProps {
  teamAPlayers: User[];
  teamBPlayers: User[];
  teamAName: string;
  teamBName: string;
}

/** Renders both teams' rosters with batting/bowling career stats. */
export const UpcomingMatchStatsView: React.FC<UpcomingMatchStatsViewProps> = ({
  teamAPlayers,
  teamBPlayers,
  teamAName,
  teamBName
}) => {
  const [scope, setScope] = useState<StatsScope>('all-time');
  const [loading, setLoading] = useState(true);
  const [statsMap, setStatsMap] = useState<Record<string, PlayerCareerStats>>({});
  
  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      try {
        const allPlayerUids = [...teamAPlayers, ...teamBPlayers].map(p => p.uid);
        const stats = await getMultiplePlayersCareerStats(allPlayerUids, scope);
        setStatsMap(stats);
      } catch (error) {
        console.error('Error fetching player stats:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchStats();
  }, [scope, teamAPlayers, teamBPlayers]);
  
  const renderPlayerStats = (player: User) => {
    const stats = statsMap[player.uid];
    
    if (!stats) {
      return (
        <View key={player.uid} style={styles.playerCard}>
          <Text style={styles.playerName}>{player.name}</Text>
          <Text style={styles.noStatsText}>No previous matches</Text>
        </View>
      );
    }
    
    const hasBattingStats = stats.batting.innings > 0;
    const hasBowlingStats = stats.bowling.innings > 0;
    
    return (
      <View key={player.uid} style={styles.playerCard}>
        <Text style={styles.playerName}>{player.name}</Text>
        
        {hasBattingStats && (
          <View style={styles.statsSection}>
            <Text style={styles.sectionTitle}>Batting</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Matches</Text>
                <Text style={styles.statValue}>{stats.batting.matches}</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Runs</Text>
                <Text style={styles.statValue}>{stats.batting.runs}</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Avg</Text>
                <Text style={styles.statValue}>{stats.batting.average.toFixed(1)}</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>SR</Text>
                <Text style={styles.statValue}>{stats.batting.strikeRate.toFixed(0)}</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>High</Text>
                <Text style={styles.statValue}>{stats.batting.highScore}</Text>
              </View>
            </View>
          </View>
        )}
        
        {hasBowlingStats && (
          <View style={styles.statsSection}>
            <Text style={styles.sectionTitle}>Bowling</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Matches</Text>
                <Text style={styles.statValue}>{stats.bowling.matches}</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Wickets</Text>
                <Text style={styles.statValue}>{stats.bowling.wickets}</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Econ</Text>
                <Text style={styles.statValue}>{stats.bowling.economy.toFixed(1)}</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Best</Text>
                <Text style={styles.statValue}>{stats.bowling.bestFigures}</Text>
              </View>
            </View>
          </View>
        )}
        
        {!hasBattingStats && !hasBowlingStats && (
          <Text style={styles.noStatsText}>No previous stats</Text>
        )}
      </View>
    );
  };
  
  return (
    <ScrollView 
      style={styles.container}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Player Statistics</Text>
        <View style={styles.scopeButtons}>
          <TouchableOpacity
            style={[styles.scopeButton, scope === 'all-time' && styles.scopeButtonActive]}
            onPress={() => setScope('all-time')}
          >
            <Text style={[styles.scopeButtonText, scope === 'all-time' && styles.scopeButtonTextActive]}>
              All-time
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.scopeButton, scope === 'recent' && styles.scopeButtonActive]}
            onPress={() => setScope('recent')}
          >
            <Text style={[styles.scopeButtonText, scope === 'recent' && styles.scopeButtonTextActive]}>
              Recent (10)
            </Text>
          </TouchableOpacity>
        </View>
      </View>
      
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading player statistics...</Text>
        </View>
      ) : (
        <>
          <View style={styles.teamSection}>
            <Text style={styles.teamTitle}>{teamAName}</Text>
            <View style={styles.playersContainer}>
              {teamAPlayers.map(renderPlayerStats)}
            </View>
          </View>
          
          <View style={styles.teamSection}>
            <Text style={styles.teamTitle}>{teamBName}</Text>
            <View style={styles.playersContainer}>
              {teamBPlayers.map(renderPlayerStats)}
            </View>
          </View>
        </>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5'
  },
  scrollContent: {
    paddingBottom: 32
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 2,
    borderBottomColor: '#dee2e6',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1a1a1a',
    marginBottom: 16,
    letterSpacing: 0.5
  },
  scopeButtons: {
    flexDirection: 'row',
    gap: 12
  },
  scopeButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent'
  },
  scopeButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#0051D5',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 4
  },
  scopeButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#666',
    letterSpacing: 0.3
  },
  scopeButtonTextActive: {
    color: '#fff'
  },
  loadingContainer: {
    padding: 60,
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 16,
    marginHorizontal: 16,
    marginTop: 20
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6c757d',
    fontWeight: '600'
  },
  teamSection: {
    marginBottom: 32
  },
  teamTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1a1a1a',
    marginBottom: 16,
    paddingHorizontal: 16,
    letterSpacing: 0.5
  },
  playersContainer: {
    gap: 16,
    paddingHorizontal: 16
  },
  playerCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 5,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF'
  },
  playerName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1a1a1a',
    marginBottom: 16
  },
  statsSection: {
    marginBottom: 16
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#6c757d',
    textTransform: 'uppercase',
    marginBottom: 12,
    letterSpacing: 1
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10
  },
  statItem: {
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    padding: 12,
    minWidth: 70,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e9ecef'
  },
  statLabel: {
    fontSize: 9,
    color: '#6c757d',
    marginBottom: 4,
    textTransform: 'uppercase',
    fontWeight: '800',
    letterSpacing: 0.5
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#007AFF'
  },
  noStatsText: {
    fontSize: 14,
    color: '#adb5bd',
    fontStyle: 'italic',
    textAlign: 'center',
    fontWeight: '500'
  }
});
