/**
 * Full match statistics view: highlights, batting/bowling tables, partnerships,
 * fall of wickets, extras, over summary, team comparison. Used on match detail Stats tab.
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Match } from '@/models/Match';
import { User } from '@/models/User';
import {
  calculateBattingStats,
  calculateBowlingStats,
  calculatePartnerships,
  calculateFallOfWickets,
  calculateExtras,
  calculateOverSummary,
  getAllBatsmenInInnings,
  getAllBowlersInInnings
} from '@/services/matchStats';
import { MatchHighlights } from './MatchHighlights';
import { BattingStatsTable } from './BattingStatsTable';
import { BowlingStatsTable } from './BowlingStatsTable';
import { Partnerships } from './Partnerships';
import { FallOfWickets } from './FallOfWickets';
import { ExtrasBreakdown } from './ExtrasBreakdown';
import { OverSummary } from './OverSummary';
import { TeamComparison } from './TeamComparison';

/** Props: match, teamAPlayers, teamBPlayers. */
interface MatchStatsViewProps {
  match: Match;
  teamAPlayers: User[];
  teamBPlayers: User[];
}

/** Container for all match stats sections (live/completed). */
export const MatchStatsView: React.FC<MatchStatsViewProps> = ({
  match,
  teamAPlayers,
  teamBPlayers
}) => {
  // Calculate all stats using useMemo to prevent re-computation
  const teamAStats = useMemo(() => {
    const allBatsmenUids = getAllBatsmenInInnings(
      match.teamAInnings,
      match.battingTeam === 'teamA' ? match.currentBatsmen : []
    );
    const allBowlersUids = getAllBowlersInInnings(match.teamAInnings);
    
    const battingStats = allBatsmenUids.map(uid => 
      calculateBattingStats(
        match.teamAInnings,
        uid,
        match.battingTeam === 'teamA' ? match.currentBatsmen : []
      )
    );
    
    const bowlingStats = allBowlersUids.map(uid => 
      calculateBowlingStats(match.teamAInnings, uid)
    );
    
    const partnerships = calculatePartnerships(
      match.teamAInnings,
      match.battingTeam === 'teamA' ? match.currentBatsmen : []
    );
    
    const fallOfWickets = calculateFallOfWickets(match.teamAInnings);
    const extras = calculateExtras(match.teamAInnings);
    const overSummary = calculateOverSummary(match.teamAInnings);
    
    // Find top scorer
    const topScorer = battingStats.reduce((max, stat) => 
      stat.runs > max.runs ? stat : max
    , { runs: 0, uid: '' } as any);
    
    // Find best bowler
    const bestBowler = bowlingStats.reduce((best, stat) => {
      if (stat.wickets === 0 && best.wickets === 0) {
        return stat.economy > 0 && (best.economy === 0 || stat.economy < best.economy) ? stat : best;
      }
      if (stat.wickets > best.wickets) return stat;
      if (stat.wickets === best.wickets && stat.economy < best.economy) return stat;
      return best;
    }, { wickets: 0, economy: 999, uid: '' } as any);
    
    return {
      battingStats,
      bowlingStats,
      partnerships,
      fallOfWickets,
      extras,
      overSummary,
      topScorerUid: topScorer.uid,
      bestBowlerUid: bestBowler.uid
    };
  }, [match]);
  
  const teamBStats = useMemo(() => {
    const allBatsmenUids = getAllBatsmenInInnings(
      match.teamBInnings,
      match.battingTeam === 'teamB' ? match.currentBatsmen : []
    );
    const allBowlersUids = getAllBowlersInInnings(match.teamBInnings);
    
    const battingStats = allBatsmenUids.map(uid => 
      calculateBattingStats(
        match.teamBInnings,
        uid,
        match.battingTeam === 'teamB' ? match.currentBatsmen : []
      )
    );
    
    const bowlingStats = allBowlersUids.map(uid => 
      calculateBowlingStats(match.teamBInnings, uid)
    );
    
    const partnerships = calculatePartnerships(
      match.teamBInnings,
      match.battingTeam === 'teamB' ? match.currentBatsmen : []
    );
    
    const fallOfWickets = calculateFallOfWickets(match.teamBInnings);
    const extras = calculateExtras(match.teamBInnings);
    const overSummary = calculateOverSummary(match.teamBInnings);
    
    // Find top scorer
    const topScorer = battingStats.reduce((max, stat) => 
      stat.runs > max.runs ? stat : max
    , { runs: 0, uid: '' } as any);
    
    // Find best bowler
    const bestBowler = bowlingStats.reduce((best, stat) => {
      if (stat.wickets === 0 && best.wickets === 0) {
        return stat.economy > 0 && (best.economy === 0 || stat.economy < best.economy) ? stat : best;
      }
      if (stat.wickets > best.wickets) return stat;
      if (stat.wickets === best.wickets && stat.economy < best.economy) return stat;
      return best;
    }, { wickets: 0, economy: 999, uid: '' } as any);
    
    return {
      battingStats,
      bowlingStats,
      partnerships,
      fallOfWickets,
      extras,
      overSummary,
      topScorerUid: topScorer.uid,
      bestBowlerUid: bestBowler.uid
    };
  }, [match]);
  
  const allPlayers = [...teamAPlayers, ...teamBPlayers];
  
  // Combined stats for highlights
  const allBattingStats = [...teamAStats.battingStats, ...teamBStats.battingStats];
  const allBowlingStats = [...teamAStats.bowlingStats, ...teamBStats.bowlingStats];
  const allPartnerships = [...teamAStats.partnerships, ...teamBStats.partnerships];
  
  // Check if match has started but no data yet
  const hasNoData = (!match.teamAInnings || match.teamAInnings.ballEvents.length === 0) && 
                    (!match.teamBInnings || match.teamBInnings.ballEvents.length === 0);
  
  if (hasNoData) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>📊</Text>
        <Text style={styles.emptyTitle}>No Stats Yet</Text>
        <Text style={styles.emptyText}>
          Statistics will appear once the match starts and balls are bowled.
        </Text>
      </View>
    );
  }
  
  return (
    <ScrollView 
      style={styles.container}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
    >
      {/* Match Highlights */}
      <MatchHighlights
        battingStats={allBattingStats}
        bowlingStats={allBowlingStats}
        partnerships={allPartnerships}
        players={allPlayers}
      />
      
      {/* Team A Stats */}
      <View style={styles.teamSection}>
        <Text style={styles.teamTitle}>{match.teamA.name}</Text>
        
        <BattingStatsTable
          stats={teamAStats.battingStats}
          players={teamAPlayers}
          allPlayerUids={match.teamA.playerUids}
          topScorerUid={teamAStats.topScorerUid}
        />
        
        <BowlingStatsTable
          stats={teamAStats.bowlingStats}
          players={teamAPlayers}
          allPlayerUids={match.teamA.playerUids}
          bestBowlerUid={teamAStats.bestBowlerUid}
        />
        
        <Partnerships
          partnerships={teamAStats.partnerships}
          players={allPlayers}
        />
        
        <FallOfWickets
          fallOfWickets={teamAStats.fallOfWickets}
          players={allPlayers}
        />
        
        <ExtrasBreakdown extras={teamAStats.extras} />
        
        <OverSummary overSummary={teamAStats.overSummary} />
      </View>
      
      {/* Team B Stats */}
      {match.teamBInnings && match.teamBInnings.runs > 0 && (
        <View style={styles.teamSection}>
          <Text style={styles.teamTitle}>{match.teamB.name}</Text>
          
          <BattingStatsTable
            stats={teamBStats.battingStats}
            players={teamBPlayers}
            allPlayerUids={match.teamB.playerUids}
            topScorerUid={teamBStats.topScorerUid}
          />
          
          <BowlingStatsTable
            stats={teamBStats.bowlingStats}
            players={teamBPlayers}
            allPlayerUids={match.teamB.playerUids}
            bestBowlerUid={teamBStats.bestBowlerUid}
          />
          
          <Partnerships
            partnerships={teamBStats.partnerships}
            players={allPlayers}
          />
          
          <FallOfWickets
            fallOfWickets={teamBStats.fallOfWickets}
            players={allPlayers}
          />
          
          <ExtrasBreakdown extras={teamBStats.extras} />
          
          <OverSummary overSummary={teamBStats.overSummary} />
        </View>
      )}
      
      {/* Team Comparison - only show if both teams have batted */}
      {match.teamBInnings && match.teamBInnings.runs > 0 && (
        <TeamComparison
          teamAName={match.teamA.name}
          teamBName={match.teamB.name}
          teamAInnings={match.teamAInnings}
          teamBInnings={match.teamBInnings}
          teamABattingStats={teamAStats.battingStats}
          teamBBattingStats={teamBStats.battingStats}
        />
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
    paddingTop: 16,
    paddingBottom: 32
  },
  teamSection: {
    marginBottom: 32
  },
  teamTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1a1a1a',
    marginBottom: 20,
    paddingHorizontal: 16,
    marginTop: 12,
    letterSpacing: 0.5
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 48,
    backgroundColor: '#f5f5f5'
  },
  emptyIcon: {
    fontSize: 80,
    marginBottom: 24
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1a1a1a',
    marginBottom: 12,
    letterSpacing: 0.5
  },
  emptyText: {
    fontSize: 16,
    color: '#6c757d',
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 300
  }
});
