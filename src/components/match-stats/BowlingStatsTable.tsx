/**
 * Bowling stats table with sort (order / wickets) and "did not bowl" rows.
 * Used in match stats view.
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { BowlingStats } from '@/services/matchStats';
import { User } from '@/models/User';

/** Props: stats, players, allPlayerUids, optional bestBowlerUid. */
interface BowlingStatsTableProps {
  stats: BowlingStats[];
  players: User[];
  allPlayerUids: string[];
  bestBowlerUid?: string;
}

type SortOption = 'order' | 'wickets';

/** Table of bowling stats (overs, runs, wickets, economy) with sort toggle. */
export const BowlingStatsTable: React.FC<BowlingStatsTableProps> = ({
  stats,
  players,
  allPlayerUids,
  bestBowlerUid
}) => {
  const [sortBy, setSortBy] = useState<SortOption>('order');
  
  // Create a map of uid to stats
  const statsMap = new Map(stats.map(s => [s.uid, s]));
  
  // Build rows data
  const rows = allPlayerUids.map(uid => {
    const stat = statsMap.get(uid);
    const player = players.find(p => p.uid === uid);
    
    return {
      uid,
      name: player?.name || 'Unknown',
      bowled: stat && stat.overs > 0,
      stats: stat
    };
  });
  
  // Sort rows
  const sortedRows = [...rows].sort((a, b) => {
    if (sortBy === 'wickets') {
      // Put non-bowled players at the end
      if (!a.bowled && !b.bowled) return 0;
      if (!a.bowled) return 1;
      if (!b.bowled) return -1;
      return (b.stats?.wickets || 0) - (a.stats?.wickets || 0);
    }
    // Default: maintain order
    return 0;
  });
  
  const formatOvers = (overs: number, balls: number): string => {
    return `${overs}.${balls}`;
  };
  
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Bowling Statistics</Text>
        <View style={styles.sortButtons}>
          <TouchableOpacity
            style={[styles.sortButton, sortBy === 'order' && styles.sortButtonActive]}
            onPress={() => setSortBy('order')}
          >
            <Text style={[styles.sortButtonText, sortBy === 'order' && styles.sortButtonTextActive]}>
              Order
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.sortButton, sortBy === 'wickets' && styles.sortButtonActive]}
            onPress={() => setSortBy('wickets')}
          >
            <Text style={[styles.sortButtonText, sortBy === 'wickets' && styles.sortButtonTextActive]}>
              By Wickets
            </Text>
          </TouchableOpacity>
        </View>
      </View>
      
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.table}>
          {/* Header Row */}
          <View style={[styles.row, styles.headerRow]}>
            <Text style={[styles.cell, styles.nameCell, styles.headerText]}>Player</Text>
            <Text style={[styles.cell, styles.statCell, styles.headerText]}>O</Text>
            <Text style={[styles.cell, styles.statCell, styles.headerText]}>R</Text>
            <Text style={[styles.cell, styles.statCell, styles.headerText]}>W</Text>
            <Text style={[styles.cell, styles.statCell, styles.headerText]}>Econ</Text>
          </View>
          
          {/* Data Rows */}
          {sortedRows.map((row, index) => (
            <View 
              key={row.uid} 
              style={[
                styles.row, 
                index % 2 === 0 ? styles.evenRow : styles.oddRow
              ]}
            >
              <Text style={[styles.cell, styles.nameCell, styles.dataText]}>
                {row.name}
                {row.uid === bestBowlerUid && ' 🏆'}
              </Text>
              {row.bowled && row.stats ? (
                <>
                  <Text style={[styles.cell, styles.statCell, styles.dataText]}>
                    {formatOvers(row.stats.overs, row.stats.balls)}
                  </Text>
                  <Text style={[styles.cell, styles.statCell, styles.dataText]}>
                    {row.stats.runs}
                  </Text>
                  <Text style={[styles.cell, styles.statCell, styles.dataText, styles.boldText]}>
                    {row.stats.wickets}
                  </Text>
                  <Text style={[styles.cell, styles.statCell, styles.dataText]}>
                    {row.stats.economy.toFixed(2)}
                  </Text>
                </>
              ) : (
                <Text style={[styles.cell, styles.notBowledCell, styles.notBowledText]} numberOfLines={1}>
                  Did not bowl
                </Text>
              )}
            </View>
          ))}
        </View>
      </ScrollView>
      
      <View style={styles.legend}>
        <Text style={styles.legendText}>🏆 = Best bowler</Text>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1a1a1a',
    letterSpacing: 0.5
  },
  sortButtons: {
    flexDirection: 'row',
    gap: 10
  },
  sortButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: 'transparent'
  },
  sortButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#0051D5',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3
  },
  sortButtonText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '700',
    letterSpacing: 0.3
  },
  sortButtonTextActive: {
    color: '#fff'
  },
  table: {
    minWidth: '100%'
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 6,
    marginBottom: 4
  },
  headerRow: {
    backgroundColor: '#f8f9fa',
    marginBottom: 10,
    borderBottomWidth: 2,
    borderBottomColor: '#e9ecef'
  },
  evenRow: {
    backgroundColor: '#fafbfc'
  },
  oddRow: {
    backgroundColor: '#fff'
  },
  cell: {
    paddingHorizontal: 6
  },
  nameCell: {
    width: 140,
    minWidth: 140
  },
  statCell: {
    width: 50,
    textAlign: 'center'
  },
  notBowledCell: {
    flex: 1,
    textAlign: 'center',
    paddingLeft: 20
  },
  headerText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#6c757d',
    textTransform: 'uppercase',
    letterSpacing: 0.8
  },
  dataText: {
    fontSize: 15,
    color: '#212529',
    fontWeight: '500'
  },
  boldText: {
    fontWeight: '800',
    color: '#FF3B30'
  },
  notBowledText: {
    fontSize: 13,
    color: '#adb5bd',
    fontStyle: 'italic',
    fontWeight: '500'
  },
  legend: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#dee2e6'
  },
  legendText: {
    fontSize: 12,
    color: '#6c757d',
    textAlign: 'center',
    fontWeight: '600'
  }
});
