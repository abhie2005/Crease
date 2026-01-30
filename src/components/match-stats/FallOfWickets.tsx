/**
 * Fall of wickets timeline (wicket number, score, overs, batsman) with collapsible section.
 * Used in match stats view.
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FallOfWicket } from '@/services/matchStats';
import { User } from '@/models/User';

/** Props: fallOfWickets, players. */
interface FallOfWicketsProps {
  fallOfWickets: FallOfWicket[];
  players: User[];
}

/** Renders fall of wickets with expand/collapse. */
export const FallOfWickets: React.FC<FallOfWicketsProps> = ({
  fallOfWickets,
  players
}) => {
  const [expanded, setExpanded] = useState(false);
  
  if (fallOfWickets.length === 0) {
    return null;
  }
  
  const getPlayerName = (uid: string): string => {
    const player = players.find(p => p.uid === uid);
    return player?.name || 'Unknown';
  };
  
  const getOrdinal = (n: number): string => {
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  };
  
  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={styles.header}
        onPress={() => setExpanded(!expanded)}
      >
        <Text style={styles.title}>Fall of Wickets ({fallOfWickets.length})</Text>
        <Ionicons 
          name={expanded ? "chevron-up" : "chevron-down"} 
          size={20} 
          color="#666" 
        />
      </TouchableOpacity>
      
      {expanded && (
        <View style={styles.content}>
          {fallOfWickets.map((wicket, index) => (
            <View key={index} style={styles.wicketItem}>
              <View style={styles.wicketHeader}>
                <Text style={styles.wicketNumber}>{getOrdinal(wicket.wicketNumber)}</Text>
                <Text style={styles.scoreLabel}>
                  {wicket.score}-{wicket.wicketNumber}
                </Text>
              </View>
              <View style={styles.wicketDetails}>
                <Text style={styles.oversLabel}>
                  ({wicket.overs}.{wicket.balls} overs)
                </Text>
                <Text style={styles.batsmanName}>
                  {getPlayerName(wicket.batsmanUid)}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 20,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 5,
    overflow: 'hidden'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f8f9fa'
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1a1a1a',
    letterSpacing: 0.5
  },
  content: {
    padding: 20,
    paddingTop: 12
  },
  wicketItem: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#dee2e6',
    backgroundColor: '#fff5f5',
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#FF3B30'
  },
  wicketHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6
  },
  wicketNumber: {
    fontSize: 11,
    color: '#6c757d',
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1
  },
  scoreLabel: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FF3B30'
  },
  wicketDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  oversLabel: {
    fontSize: 13,
    color: '#6c757d',
    fontWeight: '600'
  },
  batsmanName: {
    fontSize: 15,
    color: '#212529',
    fontWeight: '600'
  }
});
