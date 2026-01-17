<<<<<<< HEAD
import React, { useEffect, useState, useRef } from 'react';
=======
import React, { useEffect, useState } from 'react';
>>>>>>> main
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
<<<<<<< HEAD
  RefreshControl
=======
  Image
>>>>>>> main
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/providers/AuthProvider';
import { subscribeToMatches } from '@/services/matches';
import { Match } from '@/models/Match';
<<<<<<< HEAD
=======
import { logOut } from '@/firebase/auth';
>>>>>>> main
import { CountdownTimer } from '@/components/CountdownTimer';

export default function HomeScreen() {
  const { userProfile } = useAuth();
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
<<<<<<< HEAD
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);
=======
  const router = useRouter();
>>>>>>> main

  useEffect(() => {
    const unsubscribe = subscribeToMatches((matchesList) => {
      setMatches(matchesList);
      setLoading(false);
<<<<<<< HEAD
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
=======
    });

    return unsubscribe;
  }, []);

  const handleLogout = async () => {
    try {
      await logOut();
    } catch (error) {
      console.error('Logout error:', error);
    }
>>>>>>> main
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
<<<<<<< HEAD
        activeOpacity={0.7}
=======
>>>>>>> main
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
<<<<<<< HEAD
          <View style={styles.countdownContainer}>
            <CountdownTimer
              scheduledDate={(item as any).scheduledDate}
              compact
            />
          </View>
=======
          <CountdownTimer
            scheduledDate={(item as any).scheduledDate}
            compact
          />
>>>>>>> main
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
<<<<<<< HEAD
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

=======
        <Image
          source={require('../../assets/crease-text-logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <View style={styles.headerRight}>
          {userProfile && (
            <Text style={styles.userInfo}>
              {userProfile.name} ({userProfile.role})
            </Text>
          )}
          <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>

      {userProfile && (userProfile.role === 'admin' || userProfile.role === 'president') && (
        <TouchableOpacity
          style={styles.createButton}
          onPress={() => router.push('/admin/create-match')}
        >
          <Text style={styles.createButtonText}>+ Create Match</Text>
        </TouchableOpacity>
      )}

>>>>>>> main
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      ) : matches.length === 0 ? (
<<<<<<< HEAD
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🏏</Text>
          <Text style={styles.emptyTitle}>No matches yet</Text>
          <Text style={styles.emptySubtitle}>
            {userProfile && (userProfile.role === 'admin' || userProfile.role === 'president')
              ? 'Create your first match to get started!'
              : 'Matches will appear here once they are created.'}
          </Text>
=======
        <View style={styles.centerContainer}>
          <Text style={styles.emptyText}>No matches yet</Text>
>>>>>>> main
        </View>
      ) : (
        <FlatList
          data={matches}
          renderItem={renderMatchItem}
          keyExtractor={(item) => (item as any).id}
          contentContainerStyle={styles.listContent}
<<<<<<< HEAD
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#007AFF"
            />
          }
          showsVerticalScrollIndicator={false}
=======
>>>>>>> main
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
<<<<<<< HEAD
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
=======
    borderBottomColor: '#e0e0e0'
  },
  logo: {
    width: 120,
    height: 40,
    marginTop: -4
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  userInfo: {
    fontSize: 14,
    color: '#666'
  },
  logoutButton: {
    paddingHorizontal: 12,
    paddingVertical: 6
  },
  logoutText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '600'
  },
  createButton: {
    backgroundColor: '#007AFF',
    margin: 16,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center'
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
>>>>>>> main
    fontWeight: '600'
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
<<<<<<< HEAD
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
=======
  emptyText: {
    fontSize: 16,
    color: '#999'
  },
  listContent: {
    padding: 16
  },
  matchCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
>>>>>>> main
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
<<<<<<< HEAD
    shadowRadius: 6,
=======
    shadowRadius: 4,
>>>>>>> main
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
<<<<<<< HEAD
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6
=======
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4
>>>>>>> main
  },
  statusText: {
    color: '#fff',
    fontSize: 10,
<<<<<<< HEAD
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
=======
    fontWeight: '600'
  },
  scoreContainer: {
    marginTop: 8
>>>>>>> main
  },
  scoreText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500'
  }
});
