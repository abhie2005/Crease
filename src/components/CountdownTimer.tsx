/**
 * Countdown display until a scheduled date (e.g. match start).
 * Supports compact mode for list items.
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Timestamp } from 'firebase/firestore';

/** Props: scheduledDate (Date or Firestore Timestamp), optional compact. */
interface CountdownTimerProps {
  scheduledDate: Date | Timestamp;
  compact?: boolean;
}

const getDate = (value: Date | Timestamp): Date =>
  value instanceof Date ? value : value.toDate();

/** Renders countdown (days/hours/minutes/seconds) or "Match started" when past. */
export const CountdownTimer: React.FC<CountdownTimerProps> = ({
  scheduledDate,
  compact = false
}) => {
  const targetDate = getDate(scheduledDate);
  const [remaining, setRemaining] = useState<number>(
    targetDate.getTime() - Date.now()
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setRemaining(targetDate.getTime() - Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, [targetDate]);

  if (isNaN(targetDate.getTime())) {
    return null;
  }

  if (remaining <= 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.startedText}>Match started</Text>
      </View>
    );
  }

  const days = Math.floor(remaining / (1000 * 60 * 60 * 24));
  const hours = Math.floor(
    (remaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
  );
  const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((remaining % (1000 * 60)) / 1000);

  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0 || days > 0) parts.push(`${hours}h`);
  if (!compact || days === 0) {
    parts.push(`${minutes}m`);
    if (!compact && days === 0 && hours === 0) {
      parts.push(`${seconds}s`);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Starts in</Text>
      <Text style={compact ? styles.valueCompact : styles.value}>
        {parts.join(' ')}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
    alignItems: 'flex-start'
  },
  label: {
    fontSize: 12,
    color: '#666'
  },
  value: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF'
  },
  valueCompact: {
    fontSize: 14,
    fontWeight: '500',
    color: '#007AFF'
  },
  startedText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#00AA00'
  }
});

