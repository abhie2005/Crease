import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/providers/AuthProvider';
import { subscribeToMatches } from '@/services/matches';
import { Match } from '@/models/Match';
import { CountdownTimer } from '@/components/CountdownTimer';

export default function HomeScreen() {
  const { userProfile } = useAuth();
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = subscribeToMatches((matchesList) => {
      setMatches(matchesList);
      setLoading(false);
      setRefreshing(false);
    });

    return unsubscribe;
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    // The listener will automatically update when data changes
  };

  const renderMatchItem = ({ item }: { item: Match }) => {
    const statusColors = {
      upcoming: '#FFA500',
      live: '#FF0000',
      completed: '#00AA00'
    };

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
              { backgroundColor: statusColors[item.status] }
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
            />
          </View>
        )}
        {item.status === 'live' && (
          <View style={styles.scoreContainer}>
            <Text style={styles.scoreText}>
              {item.score.runs}/{item.score.wickets} ({item.score.overs}.
              {item.score.balls})
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
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
          <ActivityIndicator size="large" color="#007AFF" />
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
        <FlatList
          data={matches}
          renderItem={renderMatchItem}
          keyExtractor={(item) => (item as any).id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#007AFF"
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
    flex: 1,
    backgroundColor: '#f5f5f5'
  },
  header: {
    backgroundColor: '#fff',
    padding: 16,
    paddingTop: 60,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333'
  },
  createButton: {
    backgroundColor: '#007AFF',
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
    color: '#333',
    marginBottom: 8
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20
  },
  listContent: {
    padding: 16,
    paddingBottom: 24
  },
  matchCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3
  },
  matchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  matchTeams: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    flex: 1
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6
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
    borderTopColor: '#f0f0f0'
  },
  scoreContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0'
  },
  scoreText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500'
  }
});
