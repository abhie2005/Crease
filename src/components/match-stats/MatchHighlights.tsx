/**
 * Match highlights: top scorer, best bowler, highest partnership, best strike rate.
 * Used in match stats view.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { BattingStats, BowlingStats, Partnership } from '@/services/matchStats';
import { User } from '@/models/User';

/** Props: battingStats, bowlingStats, partnerships, players. */
interface MatchHighlightsProps {
  battingStats: BattingStats[];
  bowlingStats: BowlingStats[];
  partnerships: Partnership[];
  players: User[];
}

/** Renders top performers and highlights for a match. */
export const MatchHighlights: React.FC<MatchHighlightsProps> = ({
  battingStats,
  bowlingStats,
  partnerships,
  players
}) => {
  // Find top scorer
  const topScorer = battingStats.reduce((max, stat) => 
    stat.runs > max.runs ? stat : max
  , { runs: 0, uid: '', balls: 0, strikeRate: 0, fours: 0, sixes: 0, dots: 0, isOut: false });
  
  // Find best bowler (most wickets, or best economy if tied)
  const bestBowler = bowlingStats.reduce((best, stat) => {
    if (stat.wickets === 0 && best.wickets === 0) {
      return stat.economy > 0 && (best.economy === 0 || stat.economy < best.economy) ? stat : best;
    }
    if (stat.wickets > best.wickets) return stat;
    if (stat.wickets === best.wickets && stat.economy < best.economy) return stat;
    return best;
  }, { wickets: 0, economy: 999, uid: '', overs: 0, balls: 0, runs: 0, dots: 0, wides: 0, noBalls: 0, maidens: 0 });
  
  // Find highest partnership
  const highestPartnership = partnerships.reduce((max, p) => 
    p.runs > max.runs ? p : max
  , { runs: 0, wicketNumber: 0, batsman1Uid: '', batsman2Uid: '', batsman1Runs: 0, batsman2Runs: 0, balls: 0 });
  
  // Find best strike rate (min 10 balls)
  const bestStrikeRate = battingStats
    .filter(stat => stat.balls >= 10)
    .reduce((best, stat) => 
      stat.strikeRate > best.strikeRate ? stat : best
    , { runs: 0, uid: '', balls: 0, strikeRate: 0, fours: 0, sixes: 0, dots: 0, isOut: false });
  
  const getPlayerName = (uid: string): string => {
    const player = players.find(p => p.uid === uid);
    return player?.name || 'Unknown';
  };
  
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Match Highlights</Text>
      
      <View style={styles.highlightsGrid}>
        {topScorer.runs > 0 && (
          <View style={styles.highlightCard}>
            <Text style={styles.highlightLabel}>Top Scorer</Text>
            <Text style={styles.highlightValue}>{getPlayerName(topScorer.uid)}</Text>
            <Text style={styles.highlightSubtext}>{topScorer.runs} runs ({topScorer.balls} balls)</Text>
          </View>
        )}
        
        {bestBowler.wickets > 0 && (
          <View style={styles.highlightCard}>
            <Text style={styles.highlightLabel}>Best Bowler</Text>
            <Text style={styles.highlightValue}>{getPlayerName(bestBowler.uid)}</Text>
            <Text style={styles.highlightSubtext}>
              {bestBowler.wickets} wickets (Econ: {bestBowler.economy.toFixed(2)})
            </Text>
          </View>
        )}
        
        {highestPartnership.runs > 0 && (
          <View style={styles.highlightCard}>
            <Text style={styles.highlightLabel}>Highest Partnership</Text>
            <Text style={styles.highlightValue}>{highestPartnership.runs} runs</Text>
            <Text style={styles.highlightSubtext}>
              {getPlayerName(highestPartnership.batsman1Uid)} & {getPlayerName(highestPartnership.batsman2Uid)}
            </Text>
          </View>
        )}
        
        {bestStrikeRate.balls >= 10 && (
          <View style={styles.highlightCard}>
            <Text style={styles.highlightLabel}>Best Strike Rate</Text>
            <Text style={styles.highlightValue}>{getPlayerName(bestStrikeRate.uid)}</Text>
            <Text style={styles.highlightSubtext}>SR: {bestStrikeRate.strikeRate.toFixed(0)}</Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 5
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1a1a1a',
    marginBottom: 16,
    letterSpacing: 0.5
  },
  highlightsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12
  },
  highlightCard: {
    backgroundColor: 'linear-gradient(135deg, #FFF9E6 0%, #FFFAED 100%)',
    borderRadius: 12,
    padding: 16,
    flex: 1,
    minWidth: 150,
    borderLeftWidth: 4,
    borderLeftColor: '#FFB800',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3
  },
  highlightLabel: {
    fontSize: 10,
    color: '#D4A017',
    fontWeight: '800',
    textTransform: 'uppercase',
    marginBottom: 6,
    letterSpacing: 1
  },
  highlightValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1a1a1a',
    marginBottom: 4
  },
  highlightSubtext: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18
  }
});
