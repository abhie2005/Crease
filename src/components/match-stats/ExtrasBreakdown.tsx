/**
 * Extras breakdown (wides, no-balls, total).
 * Used in match stats view.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ExtrasBreakdown as ExtrasData } from '@/services/matchStats';

/** Props: extras (wides, noBalls, total). */
interface ExtrasBreakdownProps {
  extras: ExtrasData;
}

/** Renders extras summary. */
export const ExtrasBreakdown: React.FC<ExtrasBreakdownProps> = ({ extras }) => {
  if (extras.total === 0) {
    return null;
  }
  
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Extras: {extras.total}</Text>
      <View style={styles.breakdown}>
        <View style={styles.item}>
          <Text style={styles.label}>Wides</Text>
          <Text style={styles.value}>{extras.wides}</Text>
        </View>
        <View style={styles.separator} />
        <View style={styles.item}>
          <Text style={styles.label}>No Balls</Text>
          <Text style={styles.value}>{extras.noBalls}</Text>
        </View>
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
  breakdown: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center'
  },
  item: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#fff5f5',
    paddingVertical: 20,
    borderRadius: 12
  },
  separator: {
    width: 2,
    height: 50,
    backgroundColor: '#dee2e6',
    marginHorizontal: 12
  },
  label: {
    fontSize: 12,
    color: '#6c757d',
    marginBottom: 8,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  value: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FF3B30'
  }
});
