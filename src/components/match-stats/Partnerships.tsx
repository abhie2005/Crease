import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Partnership } from '@/services/matchStats';
import { User } from '@/models/User';

interface PartnershipsProps {
  partnerships: Partnership[];
  players: User[];
}

export const Partnerships: React.FC<PartnershipsProps> = ({
  partnerships,
  players
}) => {
  const [expanded, setExpanded] = useState(false);
  
  if (partnerships.length === 0) {
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
        <Text style={styles.title}>Partnerships ({partnerships.length})</Text>
        <Ionicons 
          name={expanded ? "chevron-up" : "chevron-down"} 
          size={20} 
          color="#666" 
        />
      </TouchableOpacity>
      
      {expanded && (
        <View style={styles.content}>
          {partnerships.map((partnership, index) => (
            <View key={index} style={styles.partnershipItem}>
              <View style={styles.partnershipHeader}>
                <Text style={styles.wicketLabel}>
                  {getOrdinal(partnership.wicketNumber)} wicket
                </Text>
                <Text style={styles.runsLabel}>{partnership.runs} runs</Text>
              </View>
              <Text style={styles.batsmen}>
                {getPlayerName(partnership.batsman1Uid)} & {getPlayerName(partnership.batsman2Uid)}
              </Text>
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
  partnershipItem: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#dee2e6',
    backgroundColor: '#fafbfc',
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 10
  },
  partnershipHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6
  },
  wicketLabel: {
    fontSize: 11,
    color: '#6c757d',
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1
  },
  runsLabel: {
    fontSize: 20,
    fontWeight: '800',
    color: '#007AFF'
  },
  batsmen: {
    fontSize: 15,
    color: '#212529',
    fontWeight: '500'
  }
});
